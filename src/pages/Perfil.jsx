import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { signOut, updateProfile } from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { getCache, setCache, invalidateCache, CACHE_KEYS, DEFAULT_TTLS } from "../utils/cache";
import { buildLeaderboard } from "../utils/leaderboard";
import { getUserTitle } from "../utils/rankings";
import { WORLD_CUP_TEAMS, getTeam } from "../utils/teams";
import { LOCK_BUFFER_MS } from "../utils/matchSort";
import { StarIcon, TrophyIcon, ClipboardIcon, SettingsIcon, MoonIcon, SunIcon, LogoutIcon, UserIcon, MedalIcon, CheckIcon, TargetIcon } from "../components/Icons";
import "./Perfil.css";

const DEFAULT_AVATARS = [
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Maria",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Leo",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Max",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Luna",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Sofia",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Milo",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Nina",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Kai",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Dani",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Ricky",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Sam",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Nico",
    "https://api.dicebear.com/9.x/adventurer/svg?seed=Vale",
];

export default function Perfil() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [alias, setAlias] = useState("");
    const [campeon, setCampeon] = useState("");
    const [champOpen, setChampOpen] = useState(false);
    const champRef = useRef(null);
    const champMenuRef = useRef(null);
    const [pts, setPts] = useState(0);
    const [exactos, setExactos] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [savingAvatar, setSavingAvatar] = useState(false);

    useEffect(() => {
        if (!champOpen) return;
        const handler = (e) => {
            if (champRef.current && !champRef.current.contains(e.target)) setChampOpen(false);
        };
        document.addEventListener("mousedown", handler);
        setTimeout(() => {
            if (champMenuRef.current) {
                const active = champMenuRef.current.querySelector(".champ-opt.active");
                if (active) active.scrollIntoView({ block: "nearest" });
            }
        }, 10);
        return () => document.removeEventListener("mousedown", handler);
    }, [champOpen]);
    const [reglasOpen, setReglasOpen] = useState(false);
    const [premiosOpen, setPremiosOpen] = useState(false);
    const [champLocked, setChampLocked] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
        localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const cached = getCache(CACHE_KEYS.USER_PROFILE(user.uid), 60 * 60 * 1000);
            if (cached) {
                setAlias(cached.alias ?? "");
                setCampeon(cached.campeon ?? "");
                setPts(cached.pts ?? 0);
                setExactos(cached.exactos ?? 0);
                setAvatarUrl(cached.photoURL ?? user?.photoURL ?? "");
                return;
            }
            const snap = await getDoc(doc(db, "usuarios", user.uid));
            if (snap.exists()) {
                const d = snap.data();
                setAlias(d.alias ?? "");
                setCampeon(d.campeon ?? "");
                setPts(d.pts ?? 0);
                setExactos(d.exactos ?? 0);
                setAvatarUrl(d.photoURL ?? user?.photoURL ?? "");
                setCache(CACHE_KEYS.USER_PROFILE(user.uid), {
                    alias: d.alias,
                    campeon: d.campeon,
                    pts: d.pts,
                    exactos: d.exactos,
                    photoURL: d.photoURL,
                });
            } else {
                setAvatarUrl(user?.photoURL ?? "");
            }
        };
        load();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const loadRanking = async () => {
            const cached = getCache(CACHE_KEYS.TABLA_CONSOLIDADA, DEFAULT_TTLS.TABLA);
            if (cached) {
                setLeaderboard(cached);
                return;
            }
            const [usuariosSnap, pronosticosSnap, resultadosSnap] = await Promise.all([
                getDocs(collection(db, "usuarios")),
                getDocs(collection(db, "pronosticos")),
                getDoc(doc(db, "resultados", "oficial")),
            ]);
            const resultados = resultadosSnap.exists() ? resultadosSnap.data() : {};
            setLeaderboard(buildLeaderboard(usuariosSnap, pronosticosSnap, resultados));
        };
        loadRanking();
    }, [user]);

    useEffect(() => {
        const loadConfig = async () => {
            const cfgSnap = await getDoc(doc(db, "config", "torneo"));
            if (!cfgSnap.exists()) {
                setChampLocked(false);
                return;
            }
            const first = cfgSnap.data().firstKickoff;
            const firstMs = first?.toMillis?.() ?? (first?.seconds ? first.seconds * 1000 : null);
            if (firstMs) {
                setChampLocked(Date.now() >= firstMs - LOCK_BUFFER_MS);
            }
        };
        loadConfig();
    }, [user]);

    const me = leaderboard.find(j => j.uid === user?.uid);
    const displayPts = me?.pts ?? pts;
    const displayExactos = me?.exactos ?? exactos;
    const userTitle = user ? getUserTitle(user.uid, leaderboard) : null;

    const handleSave = async (options = {}) => {
        if (!user) return;
        const { campeonOnly = false } = options;
        if (campeonOnly && champLocked) return;
        setSaving(true);
        try {
            const payload = { alias: alias.trim() };
            if (!champLocked) payload.campeon = campeon;
            if (campeonOnly) {
                delete payload.alias;
                payload.campeon = campeon;
            }
            await updateDoc(doc(db, "usuarios", user.uid), payload);
            if (!campeonOnly) {
                await updateProfile(auth.currentUser, { displayName: alias.trim() });
            }
            invalidateCache(CACHE_KEYS.TABLA_CONSOLIDADA);
            invalidateCache(CACHE_KEYS.USER_PROFILE(user.uid));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleAliasChange = (e) => {
        let val = e.target.value.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ_.-]/g, '');
        if (val.length > 16) val = val.substring(0, 16);
        setAlias(val);
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    const openAvatarPicker = () => {
        setSelectedAvatar(avatarUrl || user?.photoURL || null);
        setShowAvatarPicker(true);
    };

    const handleConfirmAvatar = async () => {
        if (!user || !selectedAvatar) return;
        setSavingAvatar(true);
        try {
            await updateProfile(auth.currentUser, { photoURL: selectedAvatar });
            await updateDoc(doc(db, "usuarios", user.uid), { photoURL: selectedAvatar });
            invalidateCache(CACHE_KEYS.TABLA_CONSOLIDADA);
            invalidateCache(CACHE_KEYS.USER_PROFILE(user.uid));
            setAvatarUrl(selectedAvatar);
            setShowAvatarPicker(false);
        } catch (error) {
            console.error("Error setting avatar:", error);
            alert("Hubo un error al guardar el avatar.");
        } finally {
            setSavingAvatar(false);
        }
    };

    const displayAvatar = avatarUrl || user?.photoURL;
    const selectedChamp = getTeam(campeon);

    return (
        <div className="perfil-wrap">
            <div className="pcard" style={{ animationDelay: "0s" }}>
                <div className="pavatar-container">
                    {displayAvatar ? (
                        <img src={displayAvatar} alt="Avatar" className="pavatar-img" />
                    ) : (
                        <div className="pavatar">
                            {alias?.[0]?.toUpperCase() ?? "?"}
                        </div>
                    )}
                </div>
                <div className="avatar-btns">
                    <button className="avatar-btn-pick" onClick={openAvatarPicker}>
                        <UserIcon size={16} /> Elegir avatar
                    </button>
                </div>
                
                <div className="flabel">Alias</div>
                <input
                    className="finput"
                    type="text"
                    value={alias}
                    maxLength={16}
                    placeholder="Tu alias en el prode"
                    onChange={handleAliasChange}
                />
                <div className="flabel">Mail</div>
                <input
                    className="finput"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    style={{ opacity: .5 }}
                />
                <button className={`save-btn ${saving ? "saving" : ""} ${saved ? "saved" : ""}`} onClick={handleSave} disabled={saving} style={{ marginTop: "4px" }}>
                    {saved ? <><CheckIcon size={16} /> ¡Guardado!</> : saving ? "Guardando..." : "Guardar perfil"}
                </button>
            </div>

            <div className="pcard" style={{ animationDelay: "0.04s" }}>
                <div className="sec-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><TargetIcon size={12} /> Mis estadísticas</span>
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: userTitle?.bg ?? "#f3f4f6",
                        color: userTitle?.color ?? "#6b7280",
                        fontWeight: 'bold',
                        fontSize: '11px'
                    }}>
                        Rango: {userTitle?.title ?? "En cancha ⚽"}
                    </span>
                </div>
                <div className="stat-row">
                    <div className="sbox"><div className="sval">{displayPts}</div><div className="slbl">Puntos</div></div>
                    <div className="sbox"><div className="sval">{displayExactos}</div><div className="slbl">Exactos</div></div>
                </div>
            </div>

            <div className="pcard" style={{ animationDelay: "0.08s", position: "relative", zIndex: 2 }}>
                <div className="sec-title"><StarIcon size={12} /> Mi campeón</div>
                <p className="champ-note">
                    {champLocked
                        ? "El campeón ya quedó bloqueado (cerró el plazo del primer partido)."
                        : "Solo podés cambiarlo antes del primer partido."}
                </p>
                <div className="champ-select-wrap" ref={champRef}>
                    <button
                        className="champ-select-btn"
                        disabled={champLocked}
                        onClick={() => setChampOpen(o => !o)}
                    >
                        {selectedChamp ? (
                            <span className="champ-btn-inner">
                                <img src={selectedChamp.flagLg} alt="" className="champ-btn-flag" />
                                {selectedChamp.name}
                            </span>
                        ) : (
                            "Elegí tu campeón..."
                        )}
                        <span className="champ-arrow">{champOpen ? "▾" : "▸"}</span>
                    </button>
                    {champOpen && (
                        <div className="champ-menu" ref={champMenuRef}>
                            <div className="champ-opt" onClick={() => { setCampeon(""); setChampOpen(false); }}>
                                — Sin selección —
                            </div>
                            {WORLD_CUP_TEAMS.map(t => (
                                <div
                                    key={t.key}
                                    className={`champ-opt ${campeon === t.key ? "active" : ""}`}
                                    onClick={() => { setCampeon(t.key); setChampOpen(false); }}
                                >
                                    <img src={t.flagLg} alt="" className="champ-opt-flag" />
                                    {t.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {selectedChamp && (
                    <div className="champ-preview">
                        <img className="champ-preview-flag" src={selectedChamp.flagLg} alt={selectedChamp.name} />
                        <div className="champ-preview-name">{selectedChamp.name}</div>
                    </div>
                )}
                <button className={`save-btn ${saving ? "saving" : ""} ${saved ? "saved" : ""}`} onClick={() => handleSave({ campeonOnly: true })} disabled={saving || champLocked}>
                    {saved ? <><CheckIcon size={16} /> ¡Guardado!</> : saving ? "Guardando..." : champLocked ? "Campeón bloqueado" : "Confirmar campeón"}
                </button>
            </div>

            <div className="pcard" style={{ animationDelay: "0.12s" }}>
                <div
                    className="sec-title collapsible-title"
                    onClick={() => setReglasOpen(o => !o)}
                >
                    <span><ClipboardIcon size={14} /> Reglas</span>
                    <span className="collapse-chevron">{reglasOpen ? "▾" : "▸"}</span>
                </div>
                {reglasOpen && <div className="reglas">
                    <div className="regla-row">
                        <span className="regla-icon"><MedalIcon tier="gold" size={20} /></span>
                        <div className="regla-content"><strong>Resultado exacto</strong><span className="regla-pts">6 pts</span></div>
                    </div>
                    <div className="regla-row">
                        <span className="regla-icon"><CheckIcon size={20} /></span>
                        <div className="regla-content"><strong>Ganador / empate correcto</strong><span className="regla-pts">3 pts</span></div>
                    </div>
                    <div className="regla-row">
                        <span className="regla-icon"><TargetIcon size={20} /></span>
                        <div className="regla-content"><strong>Goles de un equipo acertados</strong><span className="regla-pts">1 pt</span></div>
                    </div>
                    <div className="regla-row">
                        <span className="regla-icon"><StarIcon size={20} /></span>
                        <div className="regla-content"><strong>Campeón acertado</strong><span className="regla-pts">15 pts</span></div>
                    </div>
                    <p className="regla-nota">El máximo por partido es 6 pts. Los goles solo suman si no acertaste el resultado exacto.</p>
                </div>}
            </div>

            <div className="pcard" style={{ animationDelay: "0.16s" }}>
                <div
                    className="sec-title collapsible-title"
                    onClick={() => setPremiosOpen(o => !o)}
                >
                    <span><TrophyIcon size={14} /> Premios</span>
                    <span className="collapse-chevron">{premiosOpen ? "▾" : "▸"}</span>
                </div>
                {premiosOpen && <div className="premios">
                    <div className="premio-row primero">
                        <span className="premio-icon"><MedalIcon tier="gold" size={28} /></span>
                        <div className="premio-content"><strong>1<sup>er</sup> puesto</strong><span className="premio-valor">TBD</span></div>
                    </div>
                    <div className="premio-row segundo">
                        <span className="premio-icon"><MedalIcon tier="silver" size={28} /></span>
                        <div className="premio-content"><strong>2<sup>do</sup> puesto</strong><span className="premio-valor">TBD</span></div>
                    </div>
                    <div className="premio-row tercero">
                        <span className="premio-icon"><MedalIcon tier="bronze" size={28} /></span>
                        <div className="premio-content"><strong>3<sup>er</sup> puesto</strong><span className="premio-valor">TBD</span></div>
                    </div>
                </div>}
            </div>

            <div className="pcard" style={{ animationDelay: "0.2s" }}>
                <div
                    className="sec-title collapsible-title"
                    onClick={() => setDarkMode(o => !o)}
                >
                    <span className="mode-toggle-label">{darkMode ? <SunIcon size={16} /> : <MoonIcon size={16} />} Modo {darkMode ? "claro" : "oscuro"}</span>
                </div>
            </div>

            <button className="logout-btn" onClick={handleLogout} style={{ animation: `cardFadeIn .4s ease 0.24s both` }}>
                Cerrar sesión
            </button>
            {user?.uid === "jXL20lPJY7Nv96E5zm4bmJtMir82" && (
                <button className="admin-link-btn" onClick={() => navigate("/admin")} style={{ animation: `cardFadeIn .4s ease 0.28s both` }}>
                    <SettingsIcon size={16} /> Admin
                </button>
            )}
            {showAvatarPicker && (
                <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
                    <div className="avatar-picker-modal" onClick={e => e.stopPropagation()}>
                        <div className="avatar-picker-title">Elegí tu avatar</div>
                        <div className="avatar-grid">
                            {DEFAULT_AVATARS.map((url, i) => (
                                <div
                                    key={i}
                                    className={`avatar-option ${selectedAvatar === url ? "selected" : ""}`}
                                    onClick={() => setSelectedAvatar(url)}
                                >
                                    <img src={url} alt={`Avatar ${i + 1}`} />
                                </div>
                            ))}
                        </div>
                        <div className="avatar-picker-actions">
                            <button className="avatar-picker-close" onClick={() => setShowAvatarPicker(false)}>Cancelar</button>
                            <button
                                className="avatar-picker-confirm"
                                onClick={handleConfirmAvatar}
                                disabled={!selectedAvatar || savingAvatar}
                            >
                                {savingAvatar ? "Guardando..." : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}