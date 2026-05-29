import { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import confetti from "canvas-confetti";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { getCache, setCache, invalidateCache, CACHE_KEYS, DEFAULT_TTLS, getCacheAgeMessage } from "../utils/cache";
import { buildMatchDays, isMatchLocked, sortMatchesChronologically, getMatchKickoffMs, LOCK_BUFFER_MS } from "../utils/matchSort";
import { calcDaySummary } from "../utils/leaderboard";
import { getFlagUrl, TEAM_NAMES } from "../utils/teams";
import { fetchLiveScores } from "../utils/liveScores";
import { ClockIcon, MapPinIcon, TargetIcon, LockIcon, CheckIcon, RefreshIcon, FilterIcon, ArrowLeftIcon, ArrowRightIcon } from "../components/Icons";
import "./Partidos.css";

const FLAG = (code) => getFlagUrl(code, 40);
const WORLD_CUP_START_MS = new Date("11 Jun 2026 16:00 GMT-0300").getTime();

function calcPts(pred, result) {
    const [ph, pa] = [pred.home, pred.away];
    const [rh, ra] = [result.home, result.away];
    if (ph === rh && pa === ra) return { total: 6, rows: [{ l: "Resultado exacto ✓", p: 6, ok: true }] };
    const winOk = (ph > pa && rh > ra) || (ph < pa && rh < ra) || (ph === pa && rh === ra);
    let total = 0, rows = [];
    if (winOk) { rows.push({ l: "Ganador/empate correcto", p: 3, ok: true }); total += 3; }
    else { rows.push({ l: "Ganador/empate incorrecto", p: 3, ok: false }); }
    if (ph === rh) { rows.push({ l: `Goles local (${ph}) ✓`, p: 1, ok: true }); total += 1; }
    else { rows.push({ l: `Goles local: pusiste ${ph}, fue ${rh}`, p: 1, ok: false }); }
    if (pa === ra) { rows.push({ l: `Goles visitante (${pa}) ✓`, p: 1, ok: true }); total += 1; }
    else { rows.push({ l: `Goles visitante: pusiste ${pa}, fue ${ra}`, p: 1, ok: false }); }
    return { total, rows };
}

const SKELETON_MATCHES = Array.from({ length: 4 }, (_, i) => i);

export default function Partidos() {
    const { user } = useAuth();
    const [days, setDays] = useState([]);
    const [currentDay, setCurrentDay] = useState(0);
    const [pronosticos, setPronosticos] = useState({});
    const [resultados, setResultados] = useState({});
    const [liveResultados, setLiveResultados] = useState({});
    const [openDetail, setOpenDetail] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [timeOffset, setTimeOffset] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [lastUpdated, setLastUpdated] = useState("");
    const [filterMode, setFilterMode] = useState("all");
    const [showDayMenu, setShowDayMenu] = useState(false);
    const [toast, setToast] = useState(null);
    const [firstKickoffMs, setFirstKickoffMs] = useState(null);
    const [cdTick, setCdTick] = useState(0);
    const scrollRef = useRef(null);
    const dateMenuRef = useRef(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2200);
    };

    useEffect(() => {
        const updateLastUpdatedTime = () => {
            const msg = getCacheAgeMessage(CACHE_KEYS.PARTIDOS);
            setLastUpdated(msg ? `Actualizado ${msg}` : "");
        };

        updateLastUpdatedTime();

        const interval = setInterval(() => {
            setNow(Date.now());
            updateLastUpdatedTime();
        }, 15000);
        return () => clearInterval(interval);
    }, [refreshKey]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const load = async () => {
            let offset = 0;
            try {
                const res = await fetch(window.location.origin, { method: "HEAD", cache: "no-store" });
                const serverTime = new Date(res.headers.get("date")).getTime();
                if (serverTime) {
                    offset = serverTime - Date.now();
                    setTimeOffset(offset);
                }
            } catch (e) {
                console.warn("No se pudo obtener la hora del servidor");
            }

            const forceRefresh = refreshKey > 0;

            let cachedPartidos = forceRefresh ? null : getCache(CACHE_KEYS.PARTIDOS, DEFAULT_TTLS.PARTIDOS);
            let cachedResultados = forceRefresh ? null : getCache(CACHE_KEYS.RESULTADOS, DEFAULT_TTLS.RESULTADOS);

            let partidosData = cachedPartidos;
            let resultadosData = cachedResultados;

            if (!partidosData || !resultadosData) {
                const [partidosSnap, resultadosSnap] = await Promise.all([
                    getDocs(collection(db, "partidos")),
                    getDoc(doc(db, "resultados", "oficial")),
                ]);

                partidosData = partidosSnap.docs.map(d => d.data());
                resultadosData = resultadosSnap.exists() ? resultadosSnap.data() : {};

                setCache(CACHE_KEYS.PARTIDOS, partidosData);
                setCache(CACHE_KEYS.RESULTADOS, resultadosData);
            }

            const groupedDays = buildMatchDays(partidosData);
            setDays(groupedDays);

            let firstOpenDay = 0;
            for (let i = 0; i < groupedDays.length; i++) {
                const day = groupedDays[i];
                const hasOpenMatches = day.matches.some(m =>
                    !isMatchLocked(m, {}, Date.now(), offset)
                );
                if (hasOpenMatches) {
                    firstOpenDay = i;
                    break;
                }
            }
            
            if (refreshKey === 0) {
                setCurrentDay(firstOpenDay);
            }

            setResultados(resultadosData);

            if (user) {
                const userKey = CACHE_KEYS.PRONOSTICOS_USER(user.uid);
                let cachedPronosticos = forceRefresh ? null : getCache(userKey, DEFAULT_TTLS.PRONOSTICOS);
                if (cachedPronosticos) {
                    setPronosticos(cachedPronosticos);
                } else {
                    const pSnap = await getDoc(doc(db, "pronosticos", user.uid));
                    const pData = pSnap.exists() ? pSnap.data() : {};
                    setPronosticos(pData);
                    setCache(userKey, pData);
                }
            }

            const msg = getCacheAgeMessage(CACHE_KEYS.PARTIDOS);
            setLastUpdated(msg ? `Actualizado ${msg}` : "");
            setLoading(false);
        };
        load();
    }, [user, refreshKey]);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "resultados", "oficial"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setResultados(data);
                setCache(CACHE_KEYS.RESULTADOS, data);
            }
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchLiveScores().then(setLiveResultados);
        const interval = setInterval(async () => {
            const res = await fetchLiveScores();
            setLiveResultados(res);
        }, 60000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!showDayMenu) return;
        const handler = (e) => {
            if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
                setShowDayMenu(false);
            }
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [showDayMenu]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [currentDay]);

    useEffect(() => {
        const load = async () => {
            try {
                const cfgSnap = await getDoc(doc(db, "config", "torneo"));
                if (cfgSnap.exists()) {
                    const first = cfgSnap.data().firstKickoff;
                    const ms = first?.toMillis?.() ?? (first?.seconds ? first.seconds * 1000 : null);
                    if (ms) { setFirstKickoffMs(ms); return; }
                }
            } catch (e) { /* fallback */ }
            setFirstKickoffMs(WORLD_CUP_START_MS);
        };
        load();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setCdTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const getDayStatus = (dayIndex) => {
        const day = days[dayIndex];
        if (!day) return "none";
        
        let filledCount = 0;
        day.matches.forEach(m => {
            const pred = pronosticos[m.id];
            if (pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined) {
                filledCount++;
            }
        });
        
        if (filledCount === 0) return "none";
        if (filledCount === day.matches.length) return "full";
        return "partial";
    };

    const totalMatches = useMemo(
        () => days.reduce((sum, day) => sum + day.matches.length, 0),
        [days]
    );

    const completedCount = useMemo(() => {
        return days.reduce((sum, day) => {
            return sum + day.matches.filter(m => {
                const pred = pronosticos[m.id];
                return pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined;
            }).length;
        }, 0);
    }, [days, pronosticos]);

    const isComplete = (m) => {
        const pred = pronosticos[m.id];
        return pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined;
    };

    const groupedMatches = useMemo(() => {
        if (filterMode === "all") return null;
        const allMatches = days.flatMap(day => day.matches);
        const filtered = allMatches.filter(m => filterMode === "predichos" ? isComplete(m) : !isComplete(m));
        const sorted = sortMatchesChronologically(filtered);
        const groups = {};
        sorted.forEach(m => {
            if (!groups[m.label]) groups[m.label] = {};
            if (!groups[m.label][m.group]) groups[m.label][m.group] = [];
            groups[m.label][m.group].push(m);
        });
        return groups;
    }, [days, pronosticos, filterMode]);

    const handleInput = (matchId, side, value) => {
        const digits = String(value).replace(/\D/g, "").slice(0, 2);
        const num = digits === "" ? "" : Math.min(99, parseInt(digits, 10));
        setPronosticos(prev => ({
            ...prev,
            [matchId]: { ...prev[matchId], [side]: num }
        }));
    };

    const handleToggleDetail = (mId, pts) => {
        setOpenDetail(prev => {
            const isOpening = prev !== mId;
            if (isOpening && pts?.total === 6) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            return isOpening ? mId : null;
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setSaved(false);
        try {
            const existingSnap = await getDoc(doc(db, "pronosticos", user.uid));
            const existing = existingSnap.exists() ? existingSnap.data() : {};
            const merged = { ...existing };
            const trueNow = Date.now() + timeOffset;
            days.forEach(day => {
                day.matches.forEach(m => {
                    if (isMatchLocked(m, resultados, trueNow, 0)) return;
                    if (pronosticos[m.id] !== undefined) merged[m.id] = pronosticos[m.id];
                });
            });
            await setDoc(doc(db, "pronosticos", user.uid), merged);
            setPronosticos(merged);
            setCache(CACHE_KEYS.PRONOSTICOS_USER(user.uid), merged);
            invalidateCache(CACHE_KEYS.TABLA_CONSOLIDADA);
            setSaved(true);
            setTimeout(() => { setSaved(false); }, 1800);
            showToast(<><CheckIcon size={14} /> Pronósticos guardados</>);
        } catch (e) {
            console.error(e);
            showToast("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const renderMatchCard = (m, idx = 0, showDate = false) => {
        const pred = pronosticos[m.id];
        const officialResult = resultados[m.id];
        const liveKey = `${m.home}_${m.away}`;
        const liveResult = liveResultados[liveKey];
        const displayResult = officialResult || liveResult || null;
        const hasOfficialResult = !!officialResult;
        const isLiveResult = !hasOfficialResult && !!liveResult;
        const trueNow = now + timeOffset;
        const isLockedByAdmin = !!officialResult;
        const isLockedByTime = isMatchLocked(m, resultados, trueNow, 0) && !isLockedByAdmin;
        const isLocked = isMatchLocked(m, resultados, trueNow, 0);

        const kickoffMs = getMatchKickoffMs(m);
        const closeMs = kickoffMs - LOCK_BUFFER_MS;
        const remainingMs = closeMs - trueNow;
        let countdownText = "";
        if (!isLocked && remainingMs > 0 && remainingMs <= 7 * 24 * 60 * 60 * 1000) {
            if (remainingMs > 24 * 60 * 60 * 1000) {
                const d = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                countdownText = `Cierra en ${d} día${d > 1 ? "s" : ""}`;
            } else if (remainingMs > 60 * 60 * 1000) {
                const h = Math.ceil(remainingMs / (60 * 60 * 1000));
                countdownText = `Cierra en ${h} h`;
            } else {
                const min = Math.ceil(remainingMs / 60000);
                countdownText = `Cierra en ${min} min`;
            }
        }

        const pts = displayResult && pred?.home !== undefined && pred?.away !== undefined
            ? calcPts(pred, displayResult) : null;
        const homeName = TEAM_NAMES[m.home] ?? m.home;
        const awayName = TEAM_NAMES[m.away] ?? m.away;

        return (
            <div
                key={m.id}
                className={`match-card ${isLocked ? "locked" : ""}`}
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => handleToggleDetail(m.id, pts)}
            >
                <div className="mh">
                    <span className="mh-group">{m.group}</span>
                    <span className="mh-time">{showDate ? `${m.date} · ` : ""}<ClockIcon size={10} /> {m.time} ARG</span>
                </div>
                <div className="mb">
                    <div className="tb">
                        <img className="flag-img" src={FLAG(m.home)} alt={homeName} onError={e => e.target.style.display = "none"} />
                        <div>
                            <div className="tname">{homeName}</div>
                            <div className="tcode">{m.home}</div>
                        </div>
                    </div>
                    <div className="sz">
                        <div className="si-wrap">
                            {isLocked && displayResult ? (
                                <>
                                    <input className="si" type="number" value={displayResult.home} disabled />
                                    <span className="ssep">:</span>
                                    <input className="si" type="number" value={displayResult.away} disabled />
                                </>
                            ) : isLocked ? (
                                <>
                                    <input className="si" type="number" value={pred?.home ?? ""} disabled />
                                    <span className="ssep">:</span>
                                    <input className="si" type="number" value={pred?.away ?? ""} disabled />
                                </>
                            ) : (
                                <>
                                    <input
                                        className="si"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={2}
                                        placeholder="–"
                                        value={pred?.home ?? ""}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => handleInput(m.id, "home", e.target.value)}
                                    />
                                    <span className="ssep">:</span>
                                    <input
                                        className="si"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={2}
                                        placeholder="–"
                                        value={pred?.away ?? ""}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => handleInput(m.id, "away", e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                        {displayResult && pts
                            ? <span className={`badge ${pts.total === 6 ? "b-pleno" : "b-pts"}`}>
                                {pts.total === 6 ? <><TargetIcon size={10} /> Pleno</> : `+${pts.total} pts`}
                              </span>
                            : isLiveResult
                                ? <span className="badge b-live">⏱ En vivo</span>
                                : hasOfficialResult
                                    ? <span className="badge b-lock"><LockIcon size={10} /> Finalizado</span>
                                    : isLockedByTime
                                        ? <span className="badge b-lock"><LockIcon size={10} /> En juego</span>
                                        : countdownText
                                            ? <span className="badge b-countdown">{countdownText}</span>
                                            : <span className="badge b-open">Abierto</span>
                        }
                    </div>
                    <div className="tb r">
                        <img className="flag-img" src={FLAG(m.away)} alt={awayName} onError={e => e.target.style.display = "none"} />
                        <div>
                            <div className="tname">{awayName}</div>
                            <div className="tcode">{m.away}</div>
                        </div>
                    </div>
                </div>

                {displayResult && pred?.home !== "" && pred?.home !== undefined && (
                    <div className="pred-line">
                        <span>Tu pronóstico: {pred.home}–{pred.away}</span>
                        {pts && <span className="pred-pts">{isLiveResult ? "virtuales " : ""}{pts.total} pt{pts.total > 1 ? "s" : ""}</span>}
                    </div>
                )}

                {openDetail === m.id && (
                    <div className="match-detail">
                        <div className="drow">
                            <span className="drow-left"><MapPinIcon size={14} /><span>{m.stadium}</span></span>
                            {countdownText && <span className="drow-right countdown-text">{countdownText}</span>}
                        </div>
                        {pts && (
                            <div className="pts-box">
                                <div className="pts-box-title">Desglose de puntos</div>
                                {pts.rows.map((r, i) => (
                                    <div key={i} className={`prow ${r.ok ? "ok" : "no"}`}>
                                        {r.ok ? "✓" : "✗"} {r.l}<span>{r.p} pt{r.p > 1 ? "s" : ""}</span>
                                    </div>
                                ))}
                                <div className="ptotal"><span>Total</span><span>{pts.total} pts</span></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="partidos-wrap">
            <div className="progress-section">
                <div className="progress-bar-wrap">
                    <div className="progress-bar skeleton"><div className="progress-fill" style={{ width: "0%" }} /></div>
                    <span className="progress-count skeleton-text">–/–</span>
                </div>
                <div className="filter-btns">
                    <div className="filter-btn skeleton-btn" />
                    <div className="filter-btn skeleton-btn" />
                    <div className="filter-btn skeleton-btn" />
                </div>
            </div>
            <div className="countdown-banner skeleton">
                <div className="skeleton-block" style={{ width: "80px", height: "12px", margin: "0 auto 2px" }} />
                <div className="skeleton-block" style={{ width: "40px", height: "10px", margin: "0 auto 10px" }} />
                <div className="cd-body" style={{ justifyContent: "center", gap: "3px" }}>
                    <div className="skeleton-block" style={{ width: "42px", height: "32px", borderRadius: "10px" }} />
                    <div className="skeleton-block" style={{ width: "8px", height: "16px", borderRadius: "4px" }} />
                    <div className="skeleton-block" style={{ width: "42px", height: "32px", borderRadius: "10px" }} />
                    <div className="skeleton-block" style={{ width: "8px", height: "16px", borderRadius: "4px" }} />
                    <div className="skeleton-block" style={{ width: "42px", height: "32px", borderRadius: "10px" }} />
                    <div className="skeleton-block" style={{ width: "8px", height: "16px", borderRadius: "4px" }} />
                    <div className="skeleton-block" style={{ width: "42px", height: "32px", borderRadius: "10px" }} />
                </div>
            </div>
            <div className="date-nav skeleton">
                <div className="skeleton-block" style={{ width: "30px", height: "24px" }} />
                <div className="skeleton-block" style={{ width: "140px", height: "32px" }} />
                <div className="skeleton-block" style={{ width: "30px", height: "24px" }} />
            </div>
            <div className="partidos-scroll">
                {SKELETON_MATCHES.map(i => (
                    <div key={i} className="match-card skeleton">
                        <div className="mh">
                            <div className="skeleton-block" style={{ width: "60px", height: "12px" }} />
                            <div className="skeleton-block" style={{ width: "70px", height: "12px" }} />
                        </div>
                        <div className="mb">
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "7px" }}>
                                <div className="skeleton-block" style={{ width: "28px", height: "19px", borderRadius: "3px" }} />
                                <div className="skeleton-block" style={{ width: "80px", height: "14px" }} />
                            </div>
                            <div className="skeleton-block" style={{ width: "78px", height: "32px", borderRadius: "6px" }} />
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "7px", flexDirection: "row-reverse" }}>
                                <div className="skeleton-block" style={{ width: "28px", height: "19px", borderRadius: "3px" }} />
                                <div className="skeleton-block" style={{ width: "80px", height: "14px" }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (!days.length) return <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>No hay partidos cargados.</div>;

    const d = days[currentDay];

    return (
        <div className="partidos-wrap">
            {toast && <div className="toast">{toast}</div>}

            <div className="cache-bar">
                <span>{lastUpdated}</span>
                <button className="cache-btn-refresh" onClick={() => setRefreshKey(prev => prev + 1)}>
                    <RefreshIcon size={12} /> Actualizar
                </button>
            </div>

            {(() => {
                const targetMs = firstKickoffMs ?? WORLD_CUP_START_MS;
                const diff = targetMs - (Date.now() + timeOffset);
                if (diff <= 0) return null;
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                return (
                    <div className="countdown-banner">
                        <div className="cd-head">Mundial 2026</div>
                        <div className="cd-sub">FALTAN</div>
                        <div className="cd-body">
                            <div className="cd-unit"><span className="cd-num">{d}</span><span className="cd-label">DÍAS</span></div>
                            <span className="cd-sep">:</span>
                            <div className="cd-unit"><span className="cd-num">{String(h).padStart(2, "0")}</span><span className="cd-label">HRS</span></div>
                            <span className="cd-sep">:</span>
                            <div className="cd-unit"><span className="cd-num">{String(m).padStart(2, "0")}</span><span className="cd-label">MIN</span></div>
                            <span className="cd-sep">:</span>
                            <div className="cd-unit"><span className="cd-num">{String(s).padStart(2, "0")}</span><span className="cd-label">SEG</span></div>
                        </div>
                    </div>
                );
            })()}

            <div className="progress-section">
                <div className="progress-bar-wrap">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: totalMatches > 0 ? `${(completedCount / totalMatches) * 100}%` : "0%" }}
                        />
                    </div>
                    <span className="progress-count">{completedCount}/{totalMatches}</span>
                </div>
                <div className="filter-btns">
                    <button
                        className={`filter-btn ${filterMode === "all" ? "active" : ""}`}
                        onClick={() => setFilterMode("all")}
                    >Todos</button>
                    <button
                        className={`filter-btn ${filterMode === "predichos" ? "active" : ""}`}
                        onClick={() => setFilterMode("predichos")}
                    >Predichos ({completedCount})</button>
                    <button
                        className={`filter-btn ${filterMode === "pendientes" ? "active" : ""}`}
                        onClick={() => setFilterMode("pendientes")}
                    >Pendientes ({totalMatches - completedCount})</button>
                </div>
            </div>

            {filterMode === "all" ? (
                <>
                    <div className="date-nav">
                        <button className="dnbtn" onClick={() => setCurrentDay(c => c - 1)} disabled={currentDay === 0}>‹</button>
                        <div style={{ textAlign: "center", position: "relative" }}>
                            <div
                                className="date-title-wrap"
                                onClick={e => { e.stopPropagation(); setShowDayMenu(o => !o); }}
                            >
                                <span className="date-label">{d.label} · {d.date} 2026</span>
                                <span className="date-arrow">▾</span>
                            </div>
                            {showDayMenu && (
                                <div className="date-menu" ref={dateMenuRef}>
                                    {days.map((day, i) => (
                                        <div
                                            key={i}
                                            className={`date-menu-item ${i === currentDay ? "active" : ""}`}
                                            onClick={() => { setCurrentDay(i); setShowDayMenu(false); }}
                                        >
                                            {day.label} · {day.date} 2026
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="date-sub">{d.matches.length} partido{d.matches.length > 1 ? "s" : ""} · Fase de grupos</div>
                        </div>
                        <button className="dnbtn" onClick={() => setCurrentDay(c => c + 1)} disabled={currentDay === days.length - 1}>›</button>
                    </div>

                    <div className="partidos-scroll" ref={scrollRef}>
                    {d.matches.map((m, i) => renderMatchCard(m, i))}

                    {(() => {
                        const summary = calcDaySummary(pronosticos, resultados, d.matches.map(m => m.id));
                        if (summary.totalWithResult === 0) return null;
                        return (
                            <div className="day-summary">
                                {summary.correctCount}/{summary.totalWithResult} acertados · +{summary.totalPts} pts en esta fecha
                            </div>
                        );
                    })()}

                    <button className={`save-btn ${saving ? "saving" : ""} ${saved ? "saved" : ""}`} onClick={handleSave} disabled={saving}>
                        {saved ? <><CheckIcon size={16} /> ¡Guardado!</> : saving ? "Guardando..." : "Guardar todos los pronósticos"}
                    </button>
                    </div>
                </>
            ) : (
                <div className="partidos-scroll" ref={scrollRef}>
                    {Object.keys(groupedMatches).length === 0 ? (
                        <div className="filter-empty">
                            {filterMode === "predichos"
                                ? "No hay pronósticos completados todavía."
                                : "¡Todos los pronósticos están completados!"}
                        </div>
                    ) : (
                        Object.entries(groupedMatches).map(([label, groups]) => (
                            <div key={label} className="filter-group-block">
                                <div className="filter-group-label">{label}</div>
                                {Object.entries(groups).map(([group, matches]) => (
                                    <div key={group}>
                                        {matches.map((m, i) => renderMatchCard(m, i, true))}
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                    <button className={`save-btn ${saving ? "saving" : ""} ${saved ? "saved" : ""}`} onClick={handleSave} disabled={saving}>
                        {saved ? <><CheckIcon size={16} /> ¡Guardado!</> : saving ? "Guardando..." : "Guardar todos los pronósticos"}
                    </button>
                </div>
            )}
        </div>
    );
}