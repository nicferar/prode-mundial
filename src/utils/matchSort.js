/** Cierre de pronósticos 3 minutos antes del kickoff (hora ARG). */
export const LOCK_BUFFER_MS = 3 * 60 * 1000;

/** Timestamp del kickoff en hora ARG (GMT-3), mismo criterio que el bloqueo de pronósticos. */
export function getMatchTimeMs(m) {
    return new Date(`${m.date} 2026 ${m.time} GMT-0300`).getTime();
}

export function getMatchKickoffDate(m) {
    return new Date(getMatchTimeMs(m));
}

/** kickoff de Firestore (Timestamp) o campos date/time del fixture. */
export function getMatchKickoffMs(m) {
    if (m.kickoff?.toMillis) return m.kickoff.toMillis();
    if (m.kickoff?.seconds) return m.kickoff.seconds * 1000;
    return getMatchTimeMs(m);
}

/** Bloquea pronósticos: 3 min antes del partido o si el admin cargó resultado oficial. */
export function isMatchLocked(m, resultados, nowMs, timeOffsetMs = 0) {
    if (resultados?.[m.id]) return true;
    return nowMs + timeOffsetMs >= getMatchKickoffMs(m) - LOCK_BUFFER_MS;
}

export function sortMatchesChronologically(matches) {
    return [...matches].sort((a, b) => getMatchTimeMs(a) - getMatchTimeMs(b));
}

/** Fechas únicas en orden cronológico. */
export function getMatchDatesSorted(matches) {
    const seen = new Set();
    const dates = [];
    sortMatchesChronologically(matches).forEach(m => {
        if (!seen.has(m.date)) {
            seen.add(m.date);
            dates.push(m.date);
        }
    });
    return dates;
}

/** Agrupa por día calendario; días y partidos dentro de cada día van en orden cronológico. */
export function buildMatchDays(matches) {
    const daysMap = new Map();
    sortMatchesChronologically(matches).forEach(m => {
        if (!daysMap.has(m.date)) {
            daysMap.set(m.date, { date: m.date, label: m.label, matches: [] });
        }
        daysMap.get(m.date).matches.push(m);
    });
    return Array.from(daysMap.values());
}
