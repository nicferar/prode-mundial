import { useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getCache, setCache, CACHE_KEYS, DEFAULT_TTLS } from "../utils/cache";
import { buildLeaderboard } from "../utils/leaderboard";
import { useAuth } from "./useAuth";

const READ_DELAY = 2000;

export function usePrefetch() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const alreadyCached = getCache(CACHE_KEYS.TABLA_CONSOLIDADA, DEFAULT_TTLS.TABLA);
        if (alreadyCached) return;

        const schedule = (fn) => {
            if ("requestIdleCallback" in window) {
                requestIdleCallback(fn, { timeout: 4000 });
            } else {
                setTimeout(fn, READ_DELAY);
            }
        };

        schedule(async () => {
            try {
                const [usuariosSnap, pronosticosSnap, resultadosSnap] = await Promise.all([
                    getDocs(collection(db, "usuarios")),
                    getDocs(collection(db, "pronosticos")),
                    getDoc(doc(db, "resultados", "oficial")),
                ]);

                const resultados = resultadosSnap.exists() ? resultadosSnap.data() : {};
                const leaderboard = buildLeaderboard(usuariosSnap, pronosticosSnap, resultados);
                setCache(CACHE_KEYS.TABLA_CONSOLIDADA, leaderboard);
            } catch (e) {
                console.warn("Prefetch failed (non-critical):", e);
            }
        });
    }, [user]);
}