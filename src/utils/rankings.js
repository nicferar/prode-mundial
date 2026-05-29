/** Título neutro mientras nadie sumó puntos (todos en 0). */
export const NEUTRAL_TITLE = {
    title: "En cancha ⚽",
    color: "#6b7280",
    bg: "#f3f4f6",
};

const TIERS = [
    { title: "Leyenda 🐐", color: "#dd6b20", bg: "#feebc8", maxRankPct: 0.1 },
    { title: "Nostradamus 🔮", color: "#805ad5", bg: "#faf5ff", maxRankPct: 0.3 },
    { title: "Experto 🧠", color: "#3182ce", bg: "#ebf4ff", maxRankPct: 0.5 },
    { title: "Promesa 🏃‍♂️", color: "#2d9b5a", bg: "#e6f4ea", maxRankPct: 0.7 },
    { title: "Fantasma 👻", color: "#5a4a6a", bg: "#ede8f0", maxRankPct: 0.9 },
    { title: "Tronco 🪵", color: "#8b5a2b", bg: "#f3e8e0", maxRankPct: 1 },
];

/**
 * Rango competitivo (1,1,3…) según pts, exactos y goles acertados, igual que la tabla.
 * @param {Array<{ pts: number, exactos: number, golesAcertados: number }>} sorted — orden desc por pts
 */
export function getCompetitionRanks(sorted) {
    const ranks = [];
    for (let i = 0; i < sorted.length; i++) {
        if (
            i === 0 ||
            sorted[i].pts !== sorted[i - 1].pts ||
            sorted[i].exactos !== sorted[i - 1].exactos ||
            sorted[i].golesAcertados !== sorted[i - 1].golesAcertados
        ) {
            ranks.push(i + 1);
        } else {
            ranks.push(ranks[i - 1]);
        }
    }
    return ranks;
}

/** Tier según posición relativa (top 10% = Leyenda, bottom 10% = Tronco). */
export function getTitleFromRank(rank, total) {
    if (total <= 0) return NEUTRAL_TITLE;
    if (total === 1) return TIERS[2]; // un solo jugador → Experto, no Tronco ni Leyenda extrema

    const pct = rank / total;
    const tier = TIERS.find(t => pct <= t.maxRankPct) ?? TIERS[TIERS.length - 1];
    return { title: tier.title, color: tier.color, bg: tier.bg };
}

/**
 * Asigna título a cada jugador según su lugar en la tabla.
 * @returns {Map<string, { title, color, bg }>}
 */
export function assignTitles(sortedLeaderboard) {
    const map = new Map();
    if (!sortedLeaderboard.length) return map;

    const allZero = sortedLeaderboard.every(j => j.pts === 0);
    if (allZero) {
        sortedLeaderboard.forEach(j => map.set(j.uid, NEUTRAL_TITLE));
        return map;
    }

    const ranks = getCompetitionRanks(sortedLeaderboard);
    sortedLeaderboard.forEach((j, i) => {
        map.set(j.uid, getTitleFromRank(ranks[i], sortedLeaderboard.length));
    });
    return map;
}

export function getUserTitle(uid, sortedLeaderboard) {
    const titles = assignTitles(sortedLeaderboard);
    return titles.get(uid) ?? NEUTRAL_TITLE;
}
