import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { usePrefetch } from "../hooks/usePrefetch";
import { getCache, setCache, CACHE_KEYS } from "../utils/cache";
import { CalendarIcon, ChartIcon, FeedIcon } from "./Icons";
import "./Layout.css";

export default function Layout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [alias, setAlias] = useState("");
    const [aliasReady, setAliasReady] = useState(false);
    usePrefetch();

    useEffect(() => {
        if (!user) return;
        const cachedAlias = getCache(CACHE_KEYS.ALIAS(user.uid), 60 * 60 * 1000);
        if (cachedAlias) { setAlias(cachedAlias); setAliasReady(true); return; }
        const load = async () => {
            const snap = await getDoc(doc(db, "usuarios", user.uid));
            if (snap.exists() && snap.data().alias) {
                setAlias(snap.data().alias);
                setCache(CACHE_KEYS.ALIAS(user.uid), snap.data().alias);
            }
            setAliasReady(true);
        };
        load();
    }, [user]);

    const handleProfileClick = () => {
        navigate("/perfil");
    };

    const topbarAlias = alias || user?.displayName || "";

    return (
        <div className="app">
            <div className="topbar">
                <div className="logo">
                    <div className="logo-ball">⚽</div>
                    <em>PRODEAR</em>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <NavLink to="/faq" className="faq-btn" title="Preguntas frecuentes">?</NavLink>
                    <div className="user-pill" onClick={handleProfileClick} title="Mi Perfil">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="avatar-img" />
                        ) : (
                            <div className="avatar">
                                {user?.email?.[0]?.toUpperCase() ?? "?"}
                            </div>
                        )}
                        {topbarAlias && <span className="topbar-alias">{topbarAlias}</span>}
                    </div>
                </div>
            </div>

            <div className="screen-content">
                {aliasReady ? <Outlet /> : null}
            </div>

            <nav className="bottom-nav">
                <NavLink to="/" end className={({ isActive }) => isActive ? "bnav-btn active" : "bnav-btn"}>
                    <span className="bnav-icon"><CalendarIcon size={20} /></span>
                    <span className="bnav-label">Pronósticos</span>
                </NavLink>
                <NavLink to="/tabla" className={({ isActive }) => isActive ? "bnav-btn active" : "bnav-btn"}>
                    <span className="bnav-icon"><ChartIcon size={20} /></span>
                    <span className="bnav-label">Tabla</span>
                </NavLink>
                <NavLink to="/feed" className={({ isActive }) => isActive ? "bnav-btn active" : "bnav-btn"}>
                    <span className="bnav-icon"><FeedIcon size={20} /></span>
                    <span className="bnav-label">Actividad</span>
                </NavLink>
            </nav>
        </div>
    );
}