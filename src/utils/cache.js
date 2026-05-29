export const CACHE_KEYS = {
    PARTIDOS: "prode_partidos",
    RESULTADOS: "prode_resultados_oficial",
    PRONOSTICOS_USER: (uid) => `prode_pronosticos_${uid}`,
    TABLA_CONSOLIDADA: "prode_tabla_consolidada",
    TABLA_EXTRA: "prode_tabla_extra",
    FEED: "prode_feed",
    TABLA_PREV: "prode_tabla_prev",
    USER_PROFILE: (uid) => `prode_usuario_${uid}`,
    ALIAS: (uid) => `prode_alias_${uid}`,
};

export const DEFAULT_TTLS = {
    PARTIDOS: 10 * 60 * 1000,      // 10 minutes
    RESULTADOS: 5 * 60 * 1000,     // 5 minutes
    PRONOSTICOS: 5 * 60 * 1000,    // 5 minutes
    TABLA: 5 * 60 * 1000,          // 5 minutes
};

export function getCache(key, ttl) {
    try {
        const valStr = localStorage.getItem(key);
        if (!valStr) return null;
        const item = JSON.parse(valStr);
        const age = Date.now() - item.timestamp;
        if (age < ttl) {
            return item.data;
        }
    } catch (e) {
        console.error("Error reading cache for key:", key, e);
    }
    return null;
}

export function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (e) {
        console.error("Error setting cache for key:", key, e);
    }
}

export function invalidateCache(key) {
    localStorage.removeItem(key);
}

export function getCacheAgeMessage(key) {
    try {
        const valStr = localStorage.getItem(key);
        if (!valStr) return "";
        const item = JSON.parse(valStr);
        const diffSecs = Math.floor((Date.now() - item.timestamp) / 1000);
        if (diffSecs < 10) return "ahora mismo";
        if (diffSecs < 60) return `hace ${diffSecs} seg`;
        const diffMins = Math.floor(diffSecs / 60);
        return `hace ${diffMins} min`;
    } catch (e) {
        return "";
    }
}
