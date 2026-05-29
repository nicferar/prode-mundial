import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getCache, setCache, CACHE_KEYS } from "../utils/cache";
import { getMatchKickoffMs } from "../utils/matchSort";
import { TEAM_NAMES } from "../utils/teams";
import { RefreshIcon } from "../components/Icons";
import "./Feed.css";

const MAX_FEED_ITEMS = 20;

function getRelativeTime(ms) {
    const diff = Date.now() - ms;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "ahora";
    if (secs < 3600) return `hace ${Math.floor(secs / 60)} min`;
    if (secs < 86400) return `hace ${Math.floor(secs / 3600)} h`;
    return `hace ${Math.floor(secs / 86400)} días`;
}

function buildFeedItems(partidos, resultados, usuarios, allPronosticos) {
    const userMap = {};
    usuarios.forEach(u => { userMap[u.uid] = u.alias || u.email?.split("@")[0] || "Alguien"; });

    const matchMap = {};
    partidos.forEach(m => { matchMap[m.id] = m; });

    const items = [];
    const firstPleno = {};

    const resultadoEntries = Object.entries(resultados).filter(([k]) => k !== "campeon");

    for (const [matchId, result] of resultadoEntries) {
        const match = matchMap[matchId];
        if (!match) continue;

        const matchTime = getMatchKickoffMs(match) || 0;
        const homeName = TEAM_NAMES[match.home] ?? match.home;
        const awayName = TEAM_NAMES[match.away] ?? match.away;
        const scoreStr = `${result.home}-${result.away}`;
        const rh = Number(result.home);
        const ra = Number(result.away);
        const realHomeWin = rh > ra;
        const realDraw = rh === ra;
        const realAwayWin = rh < ra;

        const matchPicks = [];
        let homeWins = 0, draws = 0, awayWins = 0;
        let exactCount = 0;
        const exactUids = [];

        for (const [uid, pron] of Object.entries(allPronosticos)) {
            const pred = pron[matchId];
            if (pred == null || pred.home === "" || pred.away === "" || pred.home === undefined || pred.away === undefined) continue;
            const ph = Number(pred.home);
            const pa = Number(pred.away);
            const isExact = ph === rh && pa === ra;
            const isHome = ph > pa;
            const isDraw = ph === pa;
            const isAway = ph < pa;
            const winnerOk = (isHome && realHomeWin) || (isDraw && realDraw) || (isAway && realAwayWin);

            if (isExact) { exactCount++; exactUids.push(uid); }
            if (isHome) homeWins++;
            else if (isDraw) draws++;
            else if (isAway) awayWins++;

            matchPicks.push({ uid, pred, exact: isExact, winnerOk });
        }

        const total = matchPicks.length;
        if (total === 0) continue;

        const maxOutcome = Math.max(homeWins, draws, awayWins);
        const maxPct = Math.round((maxOutcome / total) * 100);

        const expectedLabel = homeWins === maxOutcome ? "victoria de " + homeName
            : draws === maxOutcome ? "empate"
            : "victoria de " + awayName;

        const majorityExpectedRight =
            (homeWins === maxOutcome && realHomeWin) ||
            (draws === maxOutcome && realDraw) ||
            (awayWins === maxOutcome && realAwayWin);

        let pool = [];

        // Plenos individuales
        for (const mp of matchPicks) {
            if (mp.exact) {
                pool.push({
                    id: `pleno-${matchId}-${mp.uid}`,
                    type: "pleno",
                    subtype: null,
                    ts: matchTime,
                    text: `🎯 ${userMap[mp.uid] ?? "Alguien"} acertó ${homeName} ${scoreStr} ${awayName}`,
                });
                if (!firstPleno[mp.uid] || matchTime < firstPleno[mp.uid].ts) {
                    firstPleno[mp.uid] = {
                        ts: matchTime,
                        text: `🥇 Primer pleno del mundial para ${userMap[mp.uid] ?? "Alguien"}: ${homeName} ${scoreStr} ${awayName}`,
                    };
                }
            }
        }

        // "El único que lo vio venir" – only skip if we already added an individual pleno for the same match
        const plenoIds = new Set(pool.filter(i => i.type === "pleno").map(i => i.id));
        if (exactCount === 1 && !plenoIds.has(`pleno-${matchId}-${exactUids[0]}`)) {
            pool.push({
                id: `unico-${matchId}`,
                type: "curiosidad",
                subtype: "unico",
                ts: matchTime,
                text: `🎯 Solo ${userMap[exactUids[0]] ?? "Alguien"} acertó el ${scoreStr} entre ${homeName} y ${awayName}.`,
            });
        } else if (exactCount >= 2 && exactCount <= 3) {
            pool.push({
                id: `unico-${matchId}`,
                type: "curiosidad",
                subtype: "unico",
                ts: matchTime,
                text: `🎯 Solo ${exactCount} de ${total} acertaron el ${scoreStr} entre ${homeName} y ${awayName}.`,
            });
        }

        // "La sorpresa"
        if (maxPct >= 65 && !majorityExpectedRight) {
            pool.push({
                id: `sorpresa-${matchId}`,
                type: "curiosidad",
                subtype: "sorpresa",
                ts: matchTime,
                text: `😱 El ${maxPct}% pronosticó ${expectedLabel}, pero terminó ${scoreStr}.`,
            });
        }

        // "La fe inquebrantable"
        let worst = null;
        let worstDiff = 0;
        for (const mp of matchPicks) {
            if (mp.exact) continue;
            const diff = Math.abs(Number(mp.pred.home) - rh) + Math.abs(Number(mp.pred.away) - ra);
            if (diff > worstDiff) { worstDiff = diff; worst = mp; }
        }
        if (worst && worstDiff >= 3) {
            pool.push({
                id: `fe-${matchId}-${worst.uid}`,
                type: "curiosidad",
                subtype: "fe",
                ts: matchTime,
                text: `🙈 ${userMap[worst.uid] ?? "Alguien"} le tenía fe a ${worst.pred.home}-${worst.pred.away} en ${homeName} vs ${awayName}. Terminó ${scoreStr}.`,
            });
        }

        // "Todos de acuerdo"
        if (maxOutcome === total && total >= 5) {
            const rightCount = matchPicks.filter(mp => mp.winnerOk).length;
            const suffix = rightCount === total ? "Todos acertaron." : `${rightCount} acertaron.`;
            pool.push({
                id: `todos-${matchId}`,
                type: "curiosidad",
                subtype: "todos",
                ts: matchTime,
                text: `🤝 Los ${total} coincidieron: ${expectedLabel}. ${suffix}`,
            });
        }

        // Pick max 2 per match
        if (pool.length > 2) {
            const rank = { pleno: 0, curiosidad: 1 };
            pool.sort((a, b) => {
                if (a.type !== b.type) return rank[a.type] - rank[b.type];
                if (a.subtype === "unico") return -1;
                if (b.subtype === "unico") return 1;
                if (a.subtype === "sorpresa") return -1;
                if (b.subtype === "sorpresa") return 1;
                return 0;
            });
            pool = pool.slice(0, 2);
        }

        items.push(...pool);
    }

    // Primer pleno (logro)
    for (const [uid, fp] of Object.entries(firstPleno)) {
        const dupe = items.some(i => i.type === "logro" && i.id === `logro-primer-${uid}`);
        if (!dupe) {
            items.push({
                id: `logro-primer-${uid}`,
                type: "logro",
                subtype: "primer_pleno",
                ts: fp.ts,
                text: fp.text,
            });
        }
    }

    items.sort((a, b) => b.ts - a.ts);
    return items.slice(0, MAX_FEED_ITEMS);
}

export default function Feed() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const load = async () => {
            const force = refreshKey > 0;
            const cached = force ? null : getCache(CACHE_KEYS.FEED, 5 * 60 * 1000);

            if (cached && refreshKey === 0) {
                setItems(cached);
                setLoading(false);
                return;
            }

            try {
                const [usuariosSnap, pronosticosSnap, resultadosSnap, partidosSnap] = await Promise.all([
                    getDocs(collection(db, "usuarios")),
                    getDocs(collection(db, "pronosticos")),
                    getDoc(doc(db, "resultados", "oficial")),
                    getDocs(collection(db, "partidos")),
                ]);

                const usuarios = usuariosSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
                const allPronosticos = Object.fromEntries(pronosticosSnap.docs.map(d => [d.id, d.data()]));
                const resultados = resultadosSnap.exists() ? resultadosSnap.data() : {};
                const partidos = partidosSnap.docs.map(d => d.data());

                const feed = buildFeedItems(partidos, resultados, usuarios, allPronosticos);
                setItems(feed);
                setCache(CACHE_KEYS.FEED, feed);
            } catch (e) {
                console.error("Error loading feed:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshKey]);

    const iconClass = (item) => {
        if (item.type === "pleno") return "feed-card-icon pleno";
        if (item.type === "logro") return "feed-card-icon logro";
        if (item.type === "curiosidad") {
            const map = { unico: "unico", sorpresa: "sorpresa", fe: "fe", todos: "sorpresa" };
            return `feed-card-icon curiosidad ${map[item.subtype] ?? ""}`;
        }
        return "feed-card-icon";
    };

    if (loading) {
        return (
            <div className="feed-wrap">
                <div className="cache-bar"><span /></div>
                <div className="feed-scroll">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="feed-skeleton" style={{ animationDelay: `${i * 0.06}s` }}>
                            <div className="feed-skeleton-icon" />
                            <div className="feed-skeleton-body">
                                <div className="feed-skeleton-line" style={{ width: "85%" }} />
                                <div className="feed-skeleton-line" style={{ width: "55%" }} />
                                <div className="feed-skeleton-line" style={{ width: "30%", height: "8px" }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="feed-wrap">
            <div className="cache-bar">
                <span>Actividad reciente</span>
                <button className="cache-btn-refresh" onClick={() => setRefreshKey(k => k + 1)}>
                    <RefreshIcon size={12} /> Actualizar
                </button>
            </div>

            <div className="feed-scroll">
                {items.length === 0 ? (
                    <div className="feed-empty">
                        <div className="feed-empty-icon">📡</div>
                        <div>Aún no hay actividad.</div>
                        <div className="feed-empty-sub">Cuando se carguen resultados y la gente pronostique, aparecerá todo acá.</div>
                    </div>
                ) : (
                    items.map((item, i) => (
                        <div key={item.id} className="feed-card" style={{ animationDelay: `${i * 0.04}s` }}>
                            <div className={iconClass(item)}>
                                {item.text.slice(0, 2)}
                            </div>
                            <div className="feed-card-body">
                                <div className="feed-card-text">{item.text.slice(2)}</div>
                                <div className="feed-card-time">{getRelativeTime(item.ts)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
