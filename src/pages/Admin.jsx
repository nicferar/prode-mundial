import { useState, useEffect } from "react";
import { doc, setDoc, writeBatch, collection, getDoc, getDocs, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getMatchDatesSorted, sortMatchesChronologically, getMatchKickoffDate } from "../utils/matchSort";
import { useAuth } from "../hooks/useAuth";
import { SettingsIcon, ArrowLeftIcon, RefreshIcon, DownloadIcon } from "../components/Icons";
import "./Admin.css";

const FIXTURE = [
    { id: "m01", date: "11 Jun", label: "Fecha 1", group: "Grupo A", home: "MEX", away: "RSA", time: "16:00", stadium: "Estadio Ciudad de México" },
    { id: "m02", date: "11 Jun", label: "Fecha 1", group: "Grupo A", home: "KOR", away: "CZE", time: "23:00", stadium: "Estadio Guadalajara" },
    { id: "m03", date: "12 Jun", label: "Fecha 1", group: "Grupo B", home: "CAN", away: "BIH", time: "16:00", stadium: "Toronto Stadium" },
    { id: "m04", date: "12 Jun", label: "Fecha 1", group: "Grupo D", home: "USA", away: "PAR", time: "22:00", stadium: "Los Angeles Stadium" },
    { id: "m08", date: "13 Jun", label: "Fecha 1", group: "Grupo D", home: "AUS", away: "TUR", time: "01:00", stadium: "BC Place Vancouver" },
    { id: "m05", date: "13 Jun", label: "Fecha 1", group: "Grupo B", home: "QAT", away: "SUI", time: "16:00", stadium: "San Francisco Bay Area Stadium" },
    { id: "m06", date: "13 Jun", label: "Fecha 1", group: "Grupo C", home: "BRA", away: "MAR", time: "19:00", stadium: "Nueva York/New Jersey Stadium" },
    { id: "m07", date: "13 Jun", label: "Fecha 1", group: "Grupo C", home: "HAI", away: "SCO", time: "22:00", stadium: "Boston Stadium" },
    { id: "m09", date: "14 Jun", label: "Fecha 1", group: "Grupo E", home: "GER", away: "CUW", time: "14:00", stadium: "Houston Stadium" },
    { id: "m10", date: "14 Jun", label: "Fecha 1", group: "Grupo F", home: "NED", away: "JPN", time: "17:00", stadium: "Dallas Stadium" },
    { id: "m11", date: "14 Jun", label: "Fecha 1", group: "Grupo E", home: "CIV", away: "ECU", time: "20:00", stadium: "Philadelphia Stadium" },
    { id: "m12", date: "14 Jun", label: "Fecha 1", group: "Grupo F", home: "SWE", away: "TUN", time: "23:00", stadium: "Estadio Monterrey" },
    { id: "m13", date: "15 Jun", label: "Fecha 1", group: "Grupo H", home: "ESP", away: "CPV", time: "13:00", stadium: "Atlanta Stadium" },
    { id: "m14", date: "15 Jun", label: "Fecha 1", group: "Grupo G", home: "BEL", away: "EGY", time: "16:00", stadium: "Seattle Stadium" },
    { id: "m15", date: "15 Jun", label: "Fecha 1", group: "Grupo H", home: "KSA", away: "URU", time: "19:00", stadium: "Miami Stadium" },
    { id: "m16", date: "15 Jun", label: "Fecha 1", group: "Grupo G", home: "IRN", away: "NZL", time: "22:00", stadium: "Los Angeles Stadium" },
    { id: "m20", date: "16 Jun", label: "Fecha 1", group: "Grupo J", home: "AUT", away: "JOR", time: "01:00", stadium: "San Francisco Bay Area Stadium" },
    { id: "m17", date: "16 Jun", label: "Fecha 1", group: "Grupo I", home: "FRA", away: "SEN", time: "16:00", stadium: "Nueva York/New Jersey Stadium" },
    { id: "m18", date: "16 Jun", label: "Fecha 1", group: "Grupo I", home: "IRQ", away: "NOR", time: "19:00", stadium: "Boston Stadium" },
    { id: "m19", date: "16 Jun", label: "Fecha 1", group: "Grupo J", home: "ARG", away: "ALG", time: "22:00", stadium: "Kansas City Stadium" },
    { id: "m21", date: "17 Jun", label: "Fecha 1", group: "Grupo K", home: "POR", away: "COD", time: "14:00", stadium: "Houston Stadium" },
    { id: "m22", date: "17 Jun", label: "Fecha 1", group: "Grupo L", home: "ENG", away: "CRO", time: "17:00", stadium: "Dallas Stadium" },
    { id: "m23", date: "17 Jun", label: "Fecha 1", group: "Grupo L", home: "GHA", away: "PAN", time: "20:00", stadium: "Toronto Stadium" },
    { id: "m24", date: "17 Jun", label: "Fecha 1", group: "Grupo K", home: "UZB", away: "COL", time: "23:00", stadium: "Estadio Ciudad de México" },
    { id: "m25", date: "18 Jun", label: "Fecha 2", group: "Grupo A", home: "CZE", away: "RSA", time: "13:00", stadium: "Atlanta Stadium" },
    { id: "m26", date: "18 Jun", label: "Fecha 2", group: "Grupo B", home: "SUI", away: "BIH", time: "16:00", stadium: "Los Angeles Stadium" },
    { id: "m27", date: "18 Jun", label: "Fecha 2", group: "Grupo B", home: "CAN", away: "QAT", time: "19:00", stadium: "BC Place Vancouver" },
    { id: "m28", date: "18 Jun", label: "Fecha 2", group: "Grupo A", home: "MEX", away: "KOR", time: "22:00", stadium: "Estadio Guadalajara" },
    { id: "m32", date: "19 Jun", label: "Fecha 2", group: "Grupo D", home: "TUR", away: "PAR", time: "01:00", stadium: "San Francisco Bay Area Stadium" },
    { id: "m29", date: "19 Jun", label: "Fecha 2", group: "Grupo D", home: "USA", away: "AUS", time: "16:00", stadium: "Seattle Stadium" },
    { id: "m30", date: "19 Jun", label: "Fecha 2", group: "Grupo C", home: "SCO", away: "MAR", time: "19:00", stadium: "Boston Stadium" },
    { id: "m31", date: "19 Jun", label: "Fecha 2", group: "Grupo C", home: "BRA", away: "HAI", time: "22:00", stadium: "Philadelphia Stadium" },
    { id: "m36", date: "20 Jun", label: "Fecha 2", group: "Grupo F", home: "JPN", away: "TUN", time: "01:00", stadium: "Estadio Monterrey" },
    { id: "m33", date: "20 Jun", label: "Fecha 2", group: "Grupo F", home: "NED", away: "SWE", time: "14:00", stadium: "Houston Stadium" },
    { id: "m34", date: "20 Jun", label: "Fecha 2", group: "Grupo E", home: "GER", away: "CIV", time: "17:00", stadium: "Toronto Stadium" },
    { id: "m35", date: "20 Jun", label: "Fecha 2", group: "Grupo E", home: "CUW", away: "ECU", time: "21:00", stadium: "Kansas City Stadium" },
    { id: "m37", date: "21 Jun", label: "Fecha 2", group: "Grupo H", home: "ESP", away: "KSA", time: "13:00", stadium: "Atlanta Stadium" },
    { id: "m38", date: "21 Jun", label: "Fecha 2", group: "Grupo G", home: "BEL", away: "IRN", time: "16:00", stadium: "Los Angeles Stadium" },
    { id: "m40", date: "21 Jun", label: "Fecha 2", group: "Grupo H", home: "CPV", away: "URU", time: "19:00", stadium: "Miami Stadium" },
    { id: "m39", date: "21 Jun", label: "Fecha 2", group: "Grupo G", home: "EGY", away: "NZL", time: "22:00", stadium: "BC Place Vancouver" },
    { id: "m42", date: "22 Jun", label: "Fecha 2", group: "Grupo J", home: "ARG", away: "AUT", time: "14:00", stadium: "Dallas Stadium" },
    { id: "m41", date: "22 Jun", label: "Fecha 2", group: "Grupo I", home: "FRA", away: "IRQ", time: "18:00", stadium: "Philadelphia Stadium" },
    { id: "m43", date: "22 Jun", label: "Fecha 2", group: "Grupo I", home: "NOR", away: "SEN", time: "21:00", stadium: "Nueva York/New Jersey Stadium" },
    { id: "m44", date: "23 Jun", label: "Fecha 2", group: "Grupo J", home: "JOR", away: "ALG", time: "00:00", stadium: "San Francisco Bay Area Stadium" },
    { id: "m45", date: "23 Jun", label: "Fecha 2", group: "Grupo K", home: "POR", away: "UZB", time: "14:00", stadium: "Houston Stadium" },
    { id: "m46", date: "23 Jun", label: "Fecha 2", group: "Grupo L", home: "ENG", away: "GHA", time: "17:00", stadium: "Boston Stadium" },
    { id: "m48", date: "23 Jun", label: "Fecha 2", group: "Grupo L", home: "CRO", away: "PAN", time: "20:00", stadium: "Toronto Stadium" },
    { id: "m47", date: "23 Jun", label: "Fecha 2", group: "Grupo K", home: "COD", away: "COL", time: "23:00", stadium: "Estadio Guadalajara" },
    { id: "m53", date: "24 Jun", label: "Fecha 3", group: "Grupo B", home: "BIH", away: "QAT", time: "16:00", stadium: "Seattle Stadium" },
    { id: "m54", date: "24 Jun", label: "Fecha 3", group: "Grupo B", home: "SUI", away: "CAN", time: "16:00", stadium: "BC Place Vancouver" },
    { id: "m49", date: "24 Jun", label: "Fecha 3", group: "Grupo C", home: "MAR", away: "HAI", time: "19:00", stadium: "Atlanta Stadium" },
    { id: "m50", date: "24 Jun", label: "Fecha 3", group: "Grupo C", home: "SCO", away: "BRA", time: "19:00", stadium: "Miami Stadium" },
    { id: "m51", date: "24 Jun", label: "Fecha 3", group: "Grupo A", home: "RSA", away: "KOR", time: "22:00", stadium: "Estadio Monterrey" },
    { id: "m52", date: "24 Jun", label: "Fecha 3", group: "Grupo A", home: "CZE", away: "MEX", time: "22:00", stadium: "Estadio Ciudad de México" },
    { id: "m57", date: "25 Jun", label: "Fecha 3", group: "Grupo E", home: "CUW", away: "CIV", time: "17:00", stadium: "Philadelphia Stadium" },
    { id: "m58", date: "25 Jun", label: "Fecha 3", group: "Grupo E", home: "ECU", away: "GER", time: "17:00", stadium: "Nueva York/New Jersey Stadium" },
    { id: "m59", date: "25 Jun", label: "Fecha 3", group: "Grupo F", home: "TUN", away: "NED", time: "20:00", stadium: "Dallas Stadium" },
    { id: "m60", date: "25 Jun", label: "Fecha 3", group: "Grupo F", home: "JPN", away: "SWE", time: "20:00", stadium: "Kansas City Stadium" },
    { id: "m55", date: "25 Jun", label: "Fecha 3", group: "Grupo D", home: "PAR", away: "AUS", time: "23:00", stadium: "San Francisco Bay Area Stadium" },
    { id: "m56", date: "25 Jun", label: "Fecha 3", group: "Grupo D", home: "TUR", away: "USA", time: "23:00", stadium: "Los Angeles Stadium" },
    { id: "m65", date: "26 Jun", label: "Fecha 3", group: "Grupo I", home: "SEN", away: "IRQ", time: "16:00", stadium: "Toronto Stadium" },
    { id: "m66", date: "26 Jun", label: "Fecha 3", group: "Grupo I", home: "NOR", away: "FRA", time: "16:00", stadium: "Boston Stadium" },
    { id: "m63", date: "26 Jun", label: "Fecha 3", group: "Grupo H", home: "CPV", away: "KSA", time: "21:00", stadium: "Houston Stadium" },
    { id: "m64", date: "26 Jun", label: "Fecha 3", group: "Grupo H", home: "URU", away: "ESP", time: "21:00", stadium: "Estadio Guadalajara" },
    { id: "m61", date: "27 Jun", label: "Fecha 3", group: "Grupo G", home: "NZL", away: "BEL", time: "00:00", stadium: "BC Place Vancouver" },
    { id: "m62", date: "27 Jun", label: "Fecha 3", group: "Grupo G", home: "EGY", away: "IRN", time: "00:00", stadium: "Seattle Stadium" },
    { id: "m71", date: "27 Jun", label: "Fecha 3", group: "Grupo L", home: "PAN", away: "ENG", time: "18:00", stadium: "Nueva York/New Jersey Stadium" },
    { id: "m72", date: "27 Jun", label: "Fecha 3", group: "Grupo L", home: "CRO", away: "GHA", time: "18:00", stadium: "Philadelphia Stadium" },
    { id: "m69", date: "27 Jun", label: "Fecha 3", group: "Grupo K", home: "COD", away: "UZB", time: "20:30", stadium: "Atlanta Stadium" },
    { id: "m70", date: "27 Jun", label: "Fecha 3", group: "Grupo K", home: "COL", away: "POR", time: "20:30", stadium: "Miami Stadium" },
    { id: "m67", date: "27 Jun", label: "Fecha 3", group: "Grupo J", home: "JOR", away: "ARG", time: "23:00", stadium: "Dallas Stadium" },
    { id: "m68", date: "27 Jun", label: "Fecha 3", group: "Grupo J", home: "ALG", away: "AUT", time: "23:00", stadium: "Kansas City Stadium" },
];

const ADMIN_UID = "jXL20lPJY7Nv96E5zm4bmJtMir82";

const TEAM_FLAGS = {
    ARG: "🇦🇷", FRA: "🇫🇷", BRA: "🇧🇷", ESP: "🇪🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", BEL: "🇧🇪",
    POR: "🇵🇹", NED: "🇳🇱", GER: "🇩🇪", CRO: "🇭🇷", URU: "🇺🇾", COL: "🇨🇴",
    MAR: "🇲🇦", JPN: "🇯🇵", USA: "🇺🇸", MEX: "🇲🇽", SEN: "🇸🇳", SUI: "🇨🇭",
    IRN: "🇮🇷", KOR: "🇰🇷", SWE: "🇸🇪", TUR: "🇹🇷", NOR: "🇳🇴", EGY: "🇪🇬",
    CIV: "🇨🇮", CAN: "🇨🇦", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", PAR: "🇵🇾", AUS: "🇦🇺", ECU: "🇪🇨",
    BIH: "🇧🇦", KSA: "🇸🇦", QAT: "🇶🇦", TUN: "🇹🇳", AUT: "🇦🇹", GHA: "🇬🇭",
    NZL: "🇳🇿", HAI: "🇭🇹", ALG: "🇩🇿", JOR: "🇯🇴", PAN: "🇵🇦", CPV: "🇨🇻",
    COD: "🇨🇩", UZB: "🇺🇿", CZE: "🇨🇿", RSA: "🇿🇦", CUW: "🇨🇼", IRQ: "🇮🇶",
};

const FD_API_KEY_STORAGE = "prode_fd_api_key";

async function fetchFromFootballData(apiKey) {
    const url = "https://api.football-data.org/v4/competitions/WC/matches";
    const res = await fetch(url, {
        headers: { "X-Auth-Token": apiKey },
        mode: "cors",
    });
    if (!res.ok) {
        if (res.status === 403) throw new Error("API key inválida o sin acceso a la competición WC");
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
}

function matchApiResult(fixtureMatch, apiMatches) {
    for (const m of apiMatches) {
        if (m.status !== "FINISHED") continue;
        if (m.homeTeam?.tla === fixtureMatch.home && m.awayTeam?.tla === fixtureMatch.away) {
            const hs = m.score?.fullTime?.home;
            const as = m.score?.fullTime?.away;
            if (hs != null && as != null) return { home: String(hs), away: String(as) };
        }
    }
    return null;
}

function exportCSV(usuarios, todosPronosticos, resultados, fixture) {
    const rows = [["Usuario", "Partido", "Local", "Visitante", "Pronóstico Local", "Pronóstico Visitante", "Resultado Local", "Resultado Visitante", "Puntos"]];
    fixture.forEach(m => {
        const r = resultados[m.id];
        const hasResult = r && r.home !== undefined && r.away !== undefined;
    Object.entries(todosPronosticos).forEach(([uid, pron]) => {
            const p = pron[m.id];
            if (p == null || p.home === "" || p.home === undefined) return;
            const user = usuarios.find(u => u.uid === uid);
            const alias = user?.alias ?? uid;
            let pts = "-";
            if (hasResult) {
                const ph = Number(p.home), pa = Number(p.away);
                const rh = Number(r.home), ra = Number(r.away);
                if (ph === rh && pa === ra) pts = "6";
                else {
                    let total = 0;
                    if ((ph > pa && rh > ra) || (ph < pa && rh < ra) || (ph === pa && rh === ra)) total += 3;
                    if (ph === rh) total += 1;
                    if (pa === ra) total += 1;
                    pts = String(total);
                }
            }
            rows.push([alias, `${m.home} vs ${m.away}`, m.home, m.away, String(p.home), String(p.away), hasResult ? String(r.home) : "", hasResult ? String(r.away) : "", pts]);
        });
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PRODEAR-pronosticos.csv";
    a.click();
    URL.revokeObjectURL(a.href);
}

export default function Admin() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [resultados, setResultados] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [filter, setFilter] = useState("all");
    const [tab, setTab] = useState("dashboard");
    const [usuarios, setUsuarios] = useState([]);
    const [todosPronosticos, setTodosPronosticos] = useState({});
    const [selectedUser, setSelectedUser] = useState("");
    const [dataLoaded, setDataLoaded] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem(FD_API_KEY_STORAGE) ?? "");
    const [fetching, setFetching] = useState(false);
    const [fetchMsg, setFetchMsg] = useState(null);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const [rSnap, uSnap, pSnap] = await Promise.all([
                getDoc(doc(db, "resultados", "oficial")),
                getDocs(collection(db, "usuarios")),
                getDocs(collection(db, "pronosticos"))
            ]);
            if (rSnap.exists()) setResultados(rSnap.data());
            setUsuarios(uSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
            const pronos = {};
            pSnap.docs.forEach(d => { pronos[d.id] = d.data(); });
            setTodosPronosticos(pronos);
            setDataLoaded(true);
        };
        load();
    }, [user]);

    const calcPts = (pred, result) => {
        if (!pred || !result || pred.home === undefined || pred.away === undefined || result.home === undefined || result.away === undefined) return 0;
        const [ph, pa] = [pred.home, pred.away];
        const [rh, ra] = [result.home, result.away];
        if (ph === rh && pa === ra) return 6;
        let total = 0;
        const winOk = (ph > pa && rh > ra) || (ph < pa && rh < ra) || (ph === pa && rh === ra);
        if (winOk) total += 3;
        if (ph === rh) total += 1;
        if (pa === ra) total += 1;
        return total;
    };

    const handleInput = (matchId, side, value) => {
        const num = value === "" ? "" : Math.max(0, parseInt(value) || 0);
        setResultados(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: num } }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        const validResults = {};
        for (const [id, r] of Object.entries(resultados)) {
            if (r?.home !== "" && r?.away !== "" && r?.home !== undefined && r?.away !== undefined) {
                validResults[id] = r;
            }
        }
        await setDoc(doc(db, "resultados", "oficial"), validResults);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleLoadFixture = async () => {
        if (!confirm("¿Cargar el fixture completo en Firestore? Esto crea los 72 partidos y la config del torneo.")) return;
        const batch = writeBatch(db);
        const sorted = sortMatchesChronologically(FIXTURE);
        sorted.forEach(m => {
            const ref = doc(collection(db, "partidos"), m.id);
            batch.set(ref, { ...m, kickoff: Timestamp.fromDate(getMatchKickoffDate(m)) });
        });
        batch.set(doc(db, "config", "torneo"), {
            firstKickoff: Timestamp.fromDate(getMatchKickoffDate(sorted[0])),
            pronosticosLockMinutes: 3,
            updatedAt: serverTimestamp(),
        });
        await batch.commit();
        alert("✅ Fixture y config cargados correctamente.");
    };

    const handleFetchFromAPI = async () => {
        if (!apiKey.trim()) { setFetchMsg("Ingresá tu API key de football-data.org primero."); return; }
        setFetching(true);
        setFetchMsg(null);
        try {
            const data = await fetchFromFootballData(apiKey.trim());
            localStorage.setItem(FD_API_KEY_STORAGE, apiKey.trim());
            const apiMatches = data.matches ?? [];
            const updated = { ...resultados };
            let count = 0;
            FIXTURE.forEach(m => {
                if (updated[m.id]) return;
                const match = matchApiResult(m, apiMatches);
                if (match) { updated[m.id] = match; count++; }
            });
            if (count > 0) {
                setResultados(updated);
                setFetchMsg(`✅ ${count} resultado(s) importado(s) desde football-data.org`);
            } else {
                const finishedCount = apiMatches.filter(m => m.status === "FINISHED").length;
                if (finishedCount === 0) {
                    setFetchMsg("ℹ️ La API no tiene partidos finalizados todavía. Los resultados aparecerán automáticamente cuando se jueguen.");
                } else {
                    setFetchMsg("ℹ️ No se encontraron partidos que coincidan. Verificá que la API key sea correcta.");
                }
            }
        } catch (e) {
            if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError") || e.message?.includes("Load failed")) {
                setFetchMsg("❌ Bloqueado por CORS. Asegurate de tener ACTIVADA la extensión CORS Unblock en Chrome (click en el icono → ON). Si sigue sin andar, probá con Edge o Firefox con la extensión \"CORS Everywhere\".");
            } else {
                setFetchMsg(`❌ ${e.message}`);
            }
        } finally {
            setFetching(false);
        }
    };

    const handleExport = () => {
        setExporting(true);
        setTimeout(() => {
            exportCSV(usuarios, todosPronosticos, resultados, FIXTURE);
            setExporting(false);
        }, 100);
    };

    const dates = getMatchDatesSorted(FIXTURE);
    const filtered = sortMatchesChronologically(filter === "all" ? FIXTURE : FIXTURE.filter(m => m.date === filter));

    const totalUsuarios = usuarios.length;
    const totalConPronosticos = Object.keys(todosPronosticos).length;
    const totalPredictions = Object.values(todosPronosticos).reduce((sum, pron) => {
        return sum + Object.keys(pron).filter(k => k !== "campeon").length;
    }, 0);
    const totalResultados = Object.keys(resultados).filter(k => k !== "campeon").length;
    const totalPartidos = FIXTURE.length;
    const pctResultados = totalPartidos ? Math.round((totalResultados / totalPartidos) * 100) : 0;

    const predictionStats = {};
    Object.entries(todosPronosticos).forEach(([uid, pron]) => {
        Object.entries(pron).forEach(([matchId, pred]) => {
            if (!pred || pred.home === "" || pred.home === undefined) return;
            if (!predictionStats[matchId]) predictionStats[matchId] = { total: 0, homeWins: 0, draws: 0, awayWins: 0, exactCount: 0 };
            predictionStats[matchId].total++;
            const ph = Number(pred.home), pa = Number(pred.away);
            if (ph > pa) predictionStats[matchId].homeWins++;
            else if (ph === pa) predictionStats[matchId].draws++;
            else predictionStats[matchId].awayWins++;
            const r = resultados[matchId];
            if (r && ph === Number(r.home) && pa === Number(r.away)) predictionStats[matchId].exactCount++;
        });
    });

    if (loading) return <div className="admin-loading">Cargando...</div>;
    if (user.uid !== ADMIN_UID) {
        return <div className="admin-wrap"><div className="admin-loading"><p>No tenés permisos de administrador.</p></div></div>;
    }
    if (!dataLoaded) return <div className="admin-loading">Cargando...</div>;

    return (
        <div className="admin-wrap">
            <div className="admin-header">
                <h2 className="admin-title"><SettingsIcon size={20} /> Panel Admin</h2>
                <div className="admin-header-actions">
                    <button className="fixture-btn" onClick={handleLoadFixture}>Cargar fixture</button>
                    <button className="fixture-btn" onClick={() => navigate("/perfil")}><ArrowLeftIcon size={14} /> Volver</button>
                </div>
            </div>

            <div className="admin-tabs">
                <button className={`atab ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>Dashboard</button>
                <button className={`atab ${tab === "fixture" ? "active" : ""}`} onClick={() => setTab("fixture")}>Fixture</button>
                <button className={`atab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>Auditoría</button>
            </div>

            {tab === "dashboard" && (
                <div className="dash-wrap">
                    <div className="dash-grid">
                        <div className="dash-card">
                            <div className="dash-num">{totalUsuarios}</div>
                            <div className="dash-label">Usuarios registrados</div>
                            <div className="dash-sub">{totalConPronosticos} ya pronosticaron</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-num">{totalPredictions}</div>
                            <div className="dash-label">Pronósticos cargados</div>
                            <div className="dash-sub">{totalConPronosticos > 0 ? Math.round(totalPredictions / totalConPronosticos) : 0} promedio por usuario</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-num">{totalResultados}/{totalPartidos}</div>
                            <div className="dash-label">Partidos con resultado</div>
                            <div className="dash-sub">{pctResultados}% del total</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-num">{totalUsuarios > 0 ? Math.round((totalConPronosticos / totalUsuarios) * 100) : 0}%</div>
                            <div className="dash-label">Participación</div>
                            <div className="dash-sub">{totalConPronosticos} de {totalUsuarios} usuarios</div>
                        </div>
                    </div>

                    <div className="dash-actions">
                        <button className="dash-action-btn export" onClick={handleExport} disabled={exporting}>
                            <DownloadIcon size={14} /> {exporting ? "Exportando..." : "Exportar CSV"}
                        </button>
                    </div>

                    <div className="dash-fd-section">
                        <div className="dash-fd-title">⚽ football-data.org</div>
                        <p className="dash-fd-desc">Registrate gratis en <a href="https://www.football-data.org/client/register" target="_blank" rel="noopener noreferrer" className="dash-link">football-data.org</a> y pegá acá tu API key.</p>
                        <div className="dash-fd-row">
                            <input className="dash-fd-input" type="text" placeholder="API key..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                            <button className="dash-fd-btn" onClick={handleFetchFromAPI} disabled={fetching}>
                                <RefreshIcon size={14} /> {fetching ? "Trayendo..." : "Traer resultados"}
                            </button>
                        </div>
                        {fetchMsg && <div className="dash-fd-msg">{fetchMsg}</div>}
                    </div>
                </div>
            )}

            {tab === "fixture" && (
                <>
                    <div className="admin-filter">
                        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">Todos los partidos</option>
                            {dates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {filtered.map(m => {
                        const r = resultados[m.id] ?? {};
                        const ps = predictionStats[m.id];
                        return (
                            <div key={m.id} className="admin-card">
                                <div className="admin-card-header">
                                    <span className="admin-group">{m.group} · {m.date}</span>
                                    <span className="admin-time">{m.time} ARG</span>
                                </div>
                                <div className="admin-card-body">
                                    <span className="admin-team">{TEAM_FLAGS[m.home] ?? ""} {m.home}</span>
                                    <div className="admin-score">
                                        <input className="admin-input" type="number" min="0" max="20" placeholder="–"
                                            value={r.home ?? ""} onChange={e => handleInput(m.id, "home", e.target.value)} />
                                        <span className="admin-sep">:</span>
                                        <input className="admin-input" type="number" min="0" max="20" placeholder="–"
                                            value={r.away ?? ""} onChange={e => handleInput(m.id, "away", e.target.value)} />
                                    </div>
                                    <span className="admin-team right">{TEAM_FLAGS[m.away] ?? ""} {m.away}</span>
                                </div>
                                {ps && ps.total > 0 && (
                                    <div className="admin-pred-bar-wrap">
                                        <div className="admin-pred-bar">
                                            {ps.homeWins > 0 && <div className="admin-pred-fill home" style={{ width: `${(ps.homeWins / ps.total) * 100}%` }} title={`Local: ${ps.homeWins} (${Math.round((ps.homeWins / ps.total) * 100)}%)`} />}
                                            {ps.draws > 0 && <div className="admin-pred-fill draw" style={{ width: `${(ps.draws / ps.total) * 100}%` }} title={`Empate: ${ps.draws} (${Math.round((ps.draws / ps.total) * 100)}%)`} />}
                                            {ps.awayWins > 0 && <div className="admin-pred-fill away" style={{ width: `${(ps.awayWins / ps.total) * 100}%` }} title={`Visitante: ${ps.awayWins} (${Math.round((ps.awayWins / ps.total) * 100)}%)`} />}
                                        </div>
                                        <div className="admin-pred-stats">
                                            <span className="home">{ps.homeWins}</span>
                                            <span className="draw">{ps.draws}</span>
                                            <span className="away">{ps.awayWins}</span>
                                            {resultados[m.id] && <span className="exact-count">🎯 {ps.exactCount} exactos</span>}
                                        </div>
                                    </div>
                                )}
                                <div className="admin-stadium">{m.stadium}</div>
                            </div>
                        );
                    })}

                    <div className="admin-save-area admin-save-sticky">
                        <button className={`admin-save-all ${saving ? "saving" : ""} ${saved ? "saved" : ""}`} onClick={handleSaveAll} disabled={saving}>
                            {saved ? "✓ ¡Resultados Guardados!" : saving ? "Guardando..." : "Guardar todos los resultados"}
                        </button>
                    </div>
                </>
            )}

            {tab === "audit" && (
                <div className="admin-audit">
                    <div className="audit-toolbar">
                        <select className="filter-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                            <option value="">-- Seleccionar Jugador --</option>
                            {usuarios.map(u => <option key={u.uid} value={u.uid}>{u.alias} ({u.email})</option>)}
                        </select>
                    </div>

                    {selectedUser && (
                        <div className="audit-list">
                            {FIXTURE.map(m => {
                                const r = resultados[m.id];
                                const p = todosPronosticos[selectedUser]?.[m.id];
                                if (!p || p.home === undefined || p.home === "") return null;
                                const pts = r ? calcPts(p, r) : "-";
                                return (
                                    <div key={m.id} className="admin-card">
                                        <div className="admin-card-header">
                                            <span className="admin-group">{TEAM_FLAGS[m.home] ?? ""} {m.home} vs {TEAM_FLAGS[m.away] ?? ""} {m.away}</span>
                                            <span className="admin-time">{r ? `${r.home}-${r.away}` : "Pendiente"}</span>
                                        </div>
                                        <div className="admin-card-body" style={{ justifyContent: 'space-between', padding: '10px 16px' }}>
                                            <div>Pronóstico: <strong>{p.home} - {p.away}</strong></div>
                                            <div className="audit-pts">{pts} pts</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}