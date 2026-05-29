import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import html2canvas from "html2canvas";
import { db } from "../firebase";
import { getCache, setCache, CACHE_KEYS, DEFAULT_TTLS, getCacheAgeMessage } from "../utils/cache";
import { buildLeaderboard, calcDailyPts, calcMatchPts, getResultBadge, calcDaySummary } from "../utils/leaderboard";
import { buildMatchDays, isMatchLocked, getMatchKickoffMs } from "../utils/matchSort";
import { getUserTitle } from "../utils/rankings";
import { getFlagUrl } from "../utils/teams";
import { CrownIcon, MedalIcon, TargetIcon, RefreshIcon, ShareIcon, ChevronUpIcon, ChevronDownIcon, MinusIcon, UserIcon, StarIcon, CheckIcon, FlameIcon } from "../components/Icons";
import "./Tabla.css";

const FLAG = (code) => getFlagUrl(code, 40);

const AP = { IDLE: 0, BADGE: 1, COUNTER: 2, FADE_OUT: 3, FADE_IN: 4, PODIUM: 5, DONE: 6 };

export default function Tabla() {
    const [jugadores, setJugadores] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [lastUpdated, setLastUpdated] = useState("");
    const [movement, setMovement] = useState({});
    const [shared, setShared] = useState(false);
    const [capturing, setCapturing] = useState(false);

    const [animPhase, setAnimPhase] = useState(AP.IDLE);
    const [oldJugadores, setOldJugadores] = useState([]);
    const [dailyPts, setDailyPts] = useState({});
    const [topUids, setTopUids] = useState(new Set());
    const [counterVals, setCounterVals] = useState({});
    const [animDone, setAnimDone] = useState(false);
    const timersRef = useRef([]);
    const rafRef = useRef(null);

    const [allPronosticos, setAllPronosticos] = useState({});
    const [partidosDays, setPartidosDays] = useState([]);
    const [resultadosOficiales, setResultadosOficiales] = useState({});
    const [pronosDayIndex, setPronosDayIndex] = useState(0);
    const [pronosNow, setPronosNow] = useState(Date.now());
    const pronosDaysRef = useRef([]);

    const computeMovements = (lista) => {
        const prev = getCache(CACHE_KEYS.TABLA_PREV, 60 * 60 * 1000);
        if (!prev || prev.length === 0) return;
        const prevMap = {};
        prev.forEach((j, i) => { prevMap[j.uid] = i; });
        const moves = {};
        lista.forEach((j, i) => {
            const prevIdx = prevMap[j.uid];
            if (prevIdx === undefined) { moves[j.uid] = "new"; }
            else if (prevIdx > i) { moves[j.uid] = "up"; }
            else if (prevIdx < i) { moves[j.uid] = "down"; }
            else { moves[j.uid] = "same"; }
        });
        setMovement(moves);
    };

    const tablaRef = useRef(null);

    const handleShare = async () => {
        const src = tablaRef.current;
        if (!src) return;
        setCapturing(true);
        let clone = null;
        try {
            const isDark = document.documentElement.classList.contains("dark");
            const bg = isDark ? "#121417" : "#f5f7fa";

            clone = src.cloneNode(true);
            const bar = clone.querySelector(".cache-bar");
            if (bar) bar.remove();
            clone.style.position = "fixed";
            clone.style.left = "-9999px";
            clone.style.top = "0";
            clone.style.width = "480px";
            clone.style.overflow = "visible";
            clone.style.background = bg;
            clone.querySelectorAll("*").forEach(el => {
                el.style.animation = "none";
                el.style.animationDelay = "0s";
            });
            document.body.appendChild(clone);

            const fw = clone.scrollWidth;
            const fh = clone.scrollHeight;
            const canvas = await html2canvas(clone, {
                backgroundColor: bg,
                scale: 2,
                width: fw,
                height: fh,
                windowWidth: fw,
                windowHeight: fh,
                useCORS: true,
                logging: false,
            });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
            if (!blob) { setCapturing(false); return; }
            const file = new File([blob], "PRODEAR-tabla.png", { type: "image/png" });
            if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
                await navigator.share({ title: "PRODEAR - Tabla de posiciones", files: [file] });
            } else {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "PRODEAR-tabla.png";
                a.click();
                URL.revokeObjectURL(a.href);
                setShared(true);
                setTimeout(() => setShared(false), 2000);
            }
        } catch (e) {
            console.warn("Share fallback:", e);
        } finally {
            if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
            setCapturing(false);
        }
    };

    const MovIcon = ({ uid }) => {
        const m = movement[uid];
        if (m === "up") return <ChevronUpIcon size={14} className="mov-up" />;
        if (m === "down") return <ChevronDownIcon size={14} className="mov-down" />;
        if (m === "new") return <span className="mov-new">NUEVO</span>;
        return <MinusIcon size={14} className="mov-same" />;
    };

    useEffect(() => {
        const updateLastUpdatedTime = () => {
            const msg = getCacheAgeMessage(CACHE_KEYS.TABLA_CONSOLIDADA);
            setLastUpdated(msg ? `Actualizado ${msg}` : "");
        };
        updateLastUpdatedTime();
        const interval = setInterval(() => { updateLastUpdatedTime(); }, 15000);
        return () => clearInterval(interval);
    }, [refreshKey]);

    useEffect(() => {
        const tick = () => { setPronosNow(Date.now()); };
        const interval = setInterval(tick, 30000);
        return () => clearInterval(interval);
    }, []);

    const detectChanges = useCallback((newList, prevSnapshot, jugMap) => {
        if (!prevSnapshot || prevSnapshot.length === 0) return false;
        const prevMap = {};
        prevSnapshot.forEach(p => { prevMap[p.uid] = p.pts; });
        return newList.some(j => {
            const oldPts = prevMap[j.uid];
            return oldPts !== undefined && oldPts !== j.pts;
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            const forceRefresh = refreshKey > 0;
            let cachedData = forceRefresh ? null : getCache(CACHE_KEYS.TABLA_CONSOLIDADA, DEFAULT_TTLS.TABLA);

            if (cachedData && !forceRefresh && refreshKey === 0) {
                setJugadores(cachedData);
                setLastUpdated(getCacheAgeMessage(CACHE_KEYS.TABLA_CONSOLIDADA) ? `Actualizado ${getCacheAgeMessage(CACHE_KEYS.TABLA_CONSOLIDADA)}` : "");
                setLoading(false);
                computeMovements(cachedData);
                const cachedExtra = getCache(CACHE_KEYS.TABLA_EXTRA, DEFAULT_TTLS.TABLA);
                if (cachedExtra) {
                    setAllPronosticos(cachedExtra.pronByUid || {});
                    setPartidosDays(cachedExtra.partidosDays || []);
                    setResultadosOficiales(cachedExtra.resultados || {});
                }
                return;
            }

            const [usuariosSnap, pronosticosSnap, resultadosSnap, partidosSnap] = await Promise.all([
                getDocs(collection(db, "usuarios")),
                getDocs(collection(db, "pronosticos")),
                getDoc(doc(db, "resultados", "oficial")),
                getDocs(collection(db, "partidos")),
            ]);

            const resultados = resultadosSnap.exists() ? resultadosSnap.data() : {};
            const partidosData = partidosSnap.docs.map(d => d.data());
            const pronByUid = Object.fromEntries(pronosticosSnap.docs.map(d => [d.id, d.data()]));

            setAllPronosticos(pronByUid);
            setResultadosOficiales(resultados);

            const lista = buildLeaderboard(usuariosSnap, pronosticosSnap, resultados);

            const days = buildMatchDays(partidosData);
            setPartidosDays(days);
            let dailyPtsData = {};
            let topUidsData = new Set();
            let dailyMatchIds = [];

            if (days.length > 0) {
                for (let i = days.length - 1; i >= 0; i--) {
                    const day = days[i];
                    const matchIds = day.matches.map(m => m.id);
                    const hasAnyResult = matchIds.some(id => resultados[id]);
                    if (hasAnyResult) {
                        dailyMatchIds = matchIds;
                        break;
                    }
                }
                if (dailyMatchIds.length > 0) {
                    const result = calcDailyPts(pronByUid, resultados, dailyMatchIds);
                    dailyPtsData = result.dailyPts;
                    topUidsData = result.topUids;
                }
            }

            setDailyPts(dailyPtsData);
            setTopUids(topUidsData);
            setCache(CACHE_KEYS.TABLA_CONSOLIDADA, lista);
            setCache(CACHE_KEYS.TABLA_EXTRA, { pronByUid, partidosDays: days, resultados });
            setJugadores(lista);
            setLastUpdated(getCacheAgeMessage(CACHE_KEYS.TABLA_CONSOLIDADA) ? `Actualizado ${getCacheAgeMessage(CACHE_KEYS.TABLA_CONSOLIDADA)}` : "");
            setLoading(false);
            computeMovements(lista);

            const prevSnapshot = getCache(CACHE_KEYS.TABLA_PREV, 60 * 60 * 1000);
            if (prevSnapshot && prevSnapshot.length > 0) {
                const hasChanges = detectChanges(lista, prevSnapshot);
                if (hasChanges && !forceRefresh) {
                    const oldList = prevSnapshot.map(p => {
                        const current = lista.find(j => j.uid === p.uid);
                        return current ? { ...current, pts: p.pts, exactos: p.exactos } : null;
                    }).filter(Boolean);
                    const prevUids = new Set(prevSnapshot.map(p => p.uid));
                    lista.forEach(j => {
                        if (!prevUids.has(j.uid)) {
                            oldList.push({ ...j, pts: 0, exactos: 0 });
                        }
                    });
                    setOldJugadores(oldList);
                }
            }
        };
        load();
    }, [refreshKey, detectChanges]);

    const hasPendingAnim = oldJugadores.length > 0 && !animDone;

    useEffect(() => {
        if (!hasPendingAnim) return;
        timersRef.current.forEach(t => clearTimeout(t));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        timersRef.current = [];

        setAnimPhase(AP.BADGE);

        const t1 = setTimeout(() => {
            setAnimPhase(AP.COUNTER);
            const duration = 800;
            const startTime = Date.now();
            const tick = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const vals = {};
                oldJugadores.forEach(oldJ => {
                    const newJ = jugadores.find(j => j.uid === oldJ.uid);
                    const fromPts = oldJ.pts;
                    const toPts = newJ ? newJ.pts : fromPts;
                    vals[oldJ.uid] = Math.round(fromPts + (toPts - fromPts) * eased);
                });
                setCounterVals({ ...vals });
                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    rafRef.current = null;
                    setAnimPhase(AP.FADE_OUT);
                }
            };
            rafRef.current = requestAnimationFrame(tick);
        }, 500);
        timersRef.current.push(t1);

        const t2 = setTimeout(() => {
            setAnimPhase(AP.FADE_IN);
        }, 1500);
        timersRef.current.push(t2);

        const t3 = setTimeout(() => {
            setAnimPhase(AP.PODIUM);
        }, 1900);
        timersRef.current.push(t3);

        const t4 = setTimeout(() => {
            setAnimPhase(AP.IDLE);
            setOldJugadores([]);
            setCounterVals({});
            setAnimDone(true);
        }, 2400);
        timersRef.current.push(t4);

        return () => {
            timersRef.current.forEach(t => clearTimeout(t));
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [hasPendingAnim, oldJugadores, jugadores]);

    useEffect(() => {
        if (jugadores.length > 0 && !hasPendingAnim) {
            setAnimDone(false);
            setCache(CACHE_KEYS.TABLA_PREV, jugadores.map(j => ({ uid: j.uid, pts: j.pts, exactos: j.exactos })));
        }
    }, [jugadores, hasPendingAnim]);

    const compRanks = (() => {
        const ranks = [];
        for (let i = 0; i < jugadores.length; i++) {
            if (i === 0 ||
                jugadores[i].pts !== jugadores[i - 1].pts ||
                jugadores[i].exactos !== jugadores[i - 1].exactos ||
                jugadores[i].golesAcertados !== jugadores[i - 1].golesAcertados
            ) {
                ranks.push(i + 1);
            } else {
                ranks.push(ranks[i - 1]);
            }
        }
        return ranks;
    })();

    const isOldPhase = animPhase >= AP.BADGE && animPhase <= AP.FADE_OUT;
    const sourceData = (isOldPhase && oldJugadores.length > 0) ? oldJugadores : jugadores;
    const useOldPts = animPhase === AP.BADGE || animPhase === AP.FADE_OUT;
    const isCounterPhase = animPhase === AP.COUNTER;

    const top3 = sourceData.slice(0, 3);
    const rest = sourceData.slice(3);

    const isAnimOverlay = animPhase === AP.FADE_OUT;
    const isAnimFadeIn = animPhase === AP.FADE_IN || animPhase === AP.PODIUM;

    const pronosClosedDays = useMemo(() => {
        return partidosDays
            .map(day => ({
                ...day,
                closedMatches: day.matches.filter(m =>
                    resultadosOficiales[m.id] || isMatchLocked(m, resultadosOficiales, pronosNow, 0)
                ),
            }))
            .filter(day => day.closedMatches.length > 0);
    }, [partidosDays, resultadosOficiales, pronosNow]);

    useEffect(() => {
        setPronosDayIndex(0);
    }, [selected?.uid]);

    if (loading) return <div className="tabla-loading">Cargando tabla...</div>;

    return (
        <div className="tabla-wrap">
            <div className={`tabla-scroll ${isAnimOverlay ? 'anim-fade-out' : ''} ${isAnimFadeIn ? 'anim-fade-in' : ''}`} ref={tablaRef}>
                <div className="cache-bar">
                    <span>{lastUpdated}</span>
                    <div className="cache-actions">
                        <button className="cache-btn-refresh" onClick={() => setRefreshKey(prev => prev + 1)}>
                            <RefreshIcon size={12} /> Actualizar
                        </button>
                        <button className={`cache-btn-share ${shared ? "shared" : ""}`} onClick={handleShare} disabled={capturing}>
                            <ShareIcon size={12} /> {capturing ? "Capturando..." : shared ? "¡Listo!" : "Compartir"}
                        </button>
                    </div>
                </div>
                {top3.length > 0 && (
                        <div className={`podium ${animPhase === AP.PODIUM ? 'podium-reveal' : ''}`}>
                            {top3[1] && (
                                <div className="podium-item second" onClick={() => setSelected({ ...top3[1], rank: compRanks[1] })}>
                                    <div className="podium-avatar-wrap">
                                        {top3[1].photoURL ? (
                                            <img src={top3[1].photoURL} alt="" className="podium-avatar" />
                                        ) : (
                                            <div className="podium-avatar-fallback">
                                                {top3[1].alias?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                        <span className="podium-medal"><MedalIcon tier="silver" size={24} /></span>
                                    </div>
                                    <div className="podium-name">
                                        {top3[1].alias}
                                        {topUids.has(top3[1].uid) && <FlameIcon size={14} className="flame-icon" />}
                                    </div>
                                    <div className="podium-pts">
                                        {isCounterPhase ? (counterVals[top3[1].uid] ?? top3[1].pts) : top3[1].pts} pts
                                        {isOldPhase && dailyPts[top3[1].uid] > 0 && (
                                            <span className="daily-gain">+{dailyPts[top3[1].uid]}</span>
                                        )}
                                    </div>
                                    <div className="podium-exact">{top3[1].exactos} exactos</div>
                                </div>
                            )}
                            {top3[0] && (
                                <div className="podium-item first" onClick={() => setSelected({ ...top3[0], rank: compRanks[0] })}>
                                    <div className="podium-crown"><CrownIcon size={48} /></div>
                                    <div className="podium-avatar-wrap">
                                        {top3[0].photoURL ? (
                                            <img src={top3[0].photoURL} alt="" className="podium-avatar first-avatar" />
                                        ) : (
                                            <div className="podium-avatar-fallback first-avatar">
                                                {top3[0].alias?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                        <span className="podium-medal"><MedalIcon tier="gold" size={28} /></span>
                                    </div>
                                    <div className="podium-name">
                                        {top3[0].alias}
                                        {topUids.has(top3[0].uid) && <FlameIcon size={14} className="flame-icon" />}
                                    </div>
                                    <div className="podium-pts">
                                        {isCounterPhase ? (counterVals[top3[0].uid] ?? top3[0].pts) : top3[0].pts} pts
                                        {isOldPhase && dailyPts[top3[0].uid] > 0 && (
                                            <span className="daily-gain">+{dailyPts[top3[0].uid]}</span>
                                        )}
                                    </div>
                                    <div className="podium-exact">{top3[0].exactos} exactos</div>
                                </div>
                            )}
                            {top3[2] && (
                                <div className="podium-item third" onClick={() => setSelected({ ...top3[2], rank: compRanks[2] })}>
                                    <div className="podium-avatar-wrap">
                                        {top3[2].photoURL ? (
                                            <img src={top3[2].photoURL} alt="" className="podium-avatar" />
                                        ) : (
                                            <div className="podium-avatar-fallback">
                                                {top3[2].alias?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                        <span className="podium-medal"><MedalIcon tier="bronze" size={24} /></span>
                                    </div>
                                    <div className="podium-name">
                                        {top3[2].alias}
                                        {topUids.has(top3[2].uid) && <FlameIcon size={14} className="flame-icon" />}
                                    </div>
                                    <div className="podium-pts">
                                        {isCounterPhase ? (counterVals[top3[2].uid] ?? top3[2].pts) : top3[2].pts} pts
                                        {isOldPhase && dailyPts[top3[2].uid] > 0 && (
                                            <span className="daily-gain">+{dailyPts[top3[2].uid]}</span>
                                        )}
                                    </div>
                                    <div className="podium-exact">{top3[2].exactos} exactos</div>
                                </div>
                            )}
                        </div>
                    )}

                    {rest.length > 0 && (
                        <div className={`rank-wrap ${isAnimOverlay ? 'rank-fade-out' : ''} ${isAnimFadeIn ? 'rank-fade-in' : ''}`}>
                            <table className="rtable">
                                <thead>
                                    <tr>
                                        <th style={{ width: "28px" }}>#</th>
                                        <th style={{ width: "24px" }}></th>
                                        <th>Jugador</th>
                                        <th style={{ textAlign: "right" }}>Pts</th>
                                        <th style={{ textAlign: "right" }}><TargetIcon size={12} /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rest.map((j, i) => {
                                        const idx = i + 3;
                                        const displayPts = isCounterPhase ? (counterVals[j.uid] ?? j.pts) : j.pts;
                                        const ptsDiff = dailyPts[j.uid] || 0;
                                        const isTopFlame = topUids.has(j.uid);
                                        return (
                                        <tr key={j.uid} onClick={() => setSelected({ ...j, rank: compRanks[idx] })} className={`tabla-row ${isAnimFadeIn ? 'anim-stagger' : ''}`} style={isAnimFadeIn ? { animationDelay: `${i * 0.06}s` } : {}}>
                                            <td>
                                                <div className="rnum">{compRanks[idx]}</div>
                                            </td>
                                            <td className="rmov-col">
                                                <MovIcon uid={j.uid} />
                                            </td>
                                            <td>
                                                <div className="ralias-row">
                                                    {j.photoURL ? (
                                                        <img src={j.photoURL} alt="" className="ralias-avatar" />
                                                    ) : (
                                                        <div className="ralias-avatar-fallback">
                                                            {j.alias?.[0]?.toUpperCase() ?? "?"}
                                                        </div>
                                                    )}
                                                    <span className="ralias">{j.alias}</span>
                                                    {isTopFlame && <FlameIcon size={14} className="flame-icon" />}
                                                </div>
                                            </td>
                                            <td className="rpts">
                                                {displayPts}
                                                {isOldPhase && ptsDiff > 0 && <span className="daily-gain">+{ptsDiff}</span>}
                                            </td>
                                            <td className="rexact">{j.exactos}</td>
                                        </tr>
                                    );})}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {jugadores.length === 0 && (
                        <div style={{ textAlign: "center", color: "#aaa", padding: "20px" }}>
                            No hay jugadores registrados.
                        </div>
                    )}
            </div>

            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                        <div className="modal-header">
                            {selected.photoURL ? (
                                <img src={selected.photoURL} alt="Avatar" className="modal-avatar-img" />
                            ) : (
                                <div className="modal-avatar">
                                    {selected.alias?.[0]?.toUpperCase() ?? "?"}
                                </div>
                            )}
                            <div className="modal-header-info">
                                <div className="modal-alias">{selected.alias}</div>
                                <div className="modal-header-title" style={{
                                    display: "inline-block",
                                    padding: "3px 8px",
                                    borderRadius: "10px",
                                    backgroundColor: getUserTitle(selected.uid, jugadores).bg,
                                    color: getUserTitle(selected.uid, jugadores).color,
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                }}>
                                    {getUserTitle(selected.uid, jugadores).title}
                                </div>
                            </div>
                        </div>
                        <div className="modal-stats">
                            <div className="mstat"><div className="mstat-val">{selected.pts}</div><div className="mstat-lbl">Puntos</div></div>
                            <div className="mstat"><div className="mstat-val">{selected.exactos}</div><div className="mstat-lbl">Exactos</div></div>
                            <div className="mstat">
                                <div className="mstat-val">#{selected.rank ?? (jugadores.findIndex(j => j.uid === selected.uid) + 1)}</div>
                                <div className="mstat-lbl mstat-lbl-flex">
                                    <span>Posición</span>
                                    <span className="mstat-mov">
                                        <MovIcon uid={selected.uid} />
                                    </span>
                                </div>
                            </div>
                            {selected.campeon && (
                                <div className="mstat">
                                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "26px" }}>
                                        <img src={FLAG(selected.campeon)} alt={selected.campeon} className="modal-champ-flag" />
                                    </div>
                                    <div className="mstat-lbl">Campeón</div>
                                </div>
                            )}
                        </div>

                        {pronosClosedDays.length > 0 && (
                            <div className="modal-pronos">
                                <div className="modal-pronos-title">Pronósticos</div>
                                <div className="modal-pronos-nav">
                                    <button
                                        className="mp-nav-btn"
                                        onClick={() => setPronosDayIndex(i => Math.max(0, i - 1))}
                                        disabled={pronosDayIndex === 0}
                                    >‹</button>
                                    <div className="mp-nav-label">
                                        {pronosClosedDays[pronosDayIndex]?.label} · {pronosClosedDays[pronosDayIndex]?.date}
                                    </div>
                                    <button
                                        className="mp-nav-btn"
                                        onClick={() => setPronosDayIndex(i => Math.min(pronosClosedDays.length - 1, i + 1))}
                                        disabled={pronosDayIndex === pronosClosedDays.length - 1}
                                    >›</button>
                                </div>
                                <div className="modal-pronos-scroll">
                                    {(() => {
                                        const day = pronosClosedDays[pronosDayIndex];
                                        if (!day) return null;
                                        const userPron = allPronosticos[selected.uid] || {};
                                        const groups = {};
                                        day.closedMatches.forEach(m => {
                                            if (!groups[m.group]) groups[m.group] = [];
                                            groups[m.group].push(m);
                                        });
                                        return Object.entries(groups).map(([groupName, matches]) => (
                                            <div key={groupName} className="mp-group">
                                                <div className="mp-group-label">{groupName}</div>
                                                {matches.map(m => {
                                                    const pred = userPron[m.id];
                                                    const result = resultadosOficiales[m.id];
                                                    const badge = getResultBadge(pred, result);
                                                    const { pts } = (pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined && result)
                                                        ? calcMatchPts(pred, result) : { pts: "" };
                                                    return (
                                                        <div key={m.id} className="mp-row">
                                                            <div className="mp-row-home">
                                                                <img className="mp-flag" src={FLAG(m.home)} alt="" onError={e => e.target.style.display = "none"} />
                                                                <span className="mp-code">{m.home}</span>
                                                            </div>
                                                            <div className="mp-row-score">
                                                                {pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined ? (
                                                                    <span className="mp-score-bold">{pred.home}-{pred.away}</span>
                                                                ) : (
                                                                    <span className="mp-score-none">–</span>
                                                                )}
                                                                <span className={`mp-badge ${badge.cls}`}>{badge.icon}{badge.text ? ` ${badge.text}` : ""}</span>
                                                            </div>
                                                            <div className="mp-row-away">
                                                                <span className="mp-code">{m.away}</span>
                                                                <img className="mp-flag" src={FLAG(m.away)} alt="" onError={e => e.target.style.display = "none"} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(() => {
                                                    const summary = calcDaySummary(userPron, resultadosOficiales, matches.map(m => m.id));
                                                    if (summary.totalWithResult === 0) return null;
                                                    return (
                                                        <div className="mp-summary">
                                                            {summary.correctCount}/{summary.totalWithResult} acertados · +{summary.totalPts} pts
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
