export function calcMatchPts(pred, result) {
    if (!result || pred.home === undefined || pred.away === undefined) return { pts: 0, exacto: false, golesOk: 0 };
    const [ph, pa] = [pred.home, pred.away];
    const [rh, ra] = [result.home, result.away];
    if (ph === rh && pa === ra) return { pts: 6, exacto: true, golesOk: 2 };
    let pts = 0;
    let golesOk = 0;
    const winOk = (ph > pa && rh > ra) || (ph < pa && rh < ra) || (ph === pa && rh === ra);
    if (winOk) pts += 3;
    if (ph === rh) { pts += 1; golesOk++; }
    if (pa === ra) { pts += 1; golesOk++; }
    return { pts, exacto: false, golesOk };
}

export function buildLeaderboard(usuariosSnap, pronosticosSnap, resultados) {
    const pronByUid = Object.fromEntries(pronosticosSnap.docs.map(d => [d.id, d.data()]));

    const lista = usuariosSnap.docs.map((uDoc) => {
        const u = uDoc.data();
        const pron = pronByUid[uDoc.id] ?? {};
        let pts = 0;
        let exactos = 0;
        let golesAcertados = 0;

        Object.entries(pron).forEach(([matchId, pred]) => {
            const { pts: p, exacto, golesOk } = calcMatchPts(pred, resultados[matchId]);
            pts += p;
            if (exacto) exactos++;
            golesAcertados += golesOk;
        });

        // Bonus de campeón: 15 pts si acertó
        if (u.campeon && resultados.campeon === u.campeon) {
            pts += 15;
        }

        return {
            uid: uDoc.id,
            alias: u.alias,
            email: u.email,
            pts,
            exactos,
            golesAcertados,
            campeon: u.campeon,
            photoURL: u.photoURL,
        };
    });

    lista.sort((a, b) => b.pts - a.pts || b.exactos - a.exactos || b.golesAcertados - a.golesAcertados);
    return lista;
}

/** Calcula puntos por jugador para una fecha específica y devuelve quiénes fueron top ese día. */
export function calcDailyPts(pronByUid, resultados, dailyMatchIds) {
    const dailyPts = {};
    for (const [uid, pron] of Object.entries(pronByUid)) {
        let pts = 0;
        for (const matchId of dailyMatchIds) {
            const pred = pron[matchId];
            const result = resultados[matchId];
            if (pred && result && pred.home !== undefined && pred.away !== undefined) {
                const { pts: p } = calcMatchPts(pred, result);
                pts += p;
            }
        }
        dailyPts[uid] = pts;
    }
    const maxPts = Math.max(...Object.values(dailyPts), 0);
    const topUids = new Set(
        maxPts > 0
            ? Object.entries(dailyPts).filter(([_, p]) => p === maxPts).map(([uid]) => uid)
            : []
    );
    return { dailyPts, topUids };
}

/** Badge para fila compacta de pronóstico. */
export function getResultBadge(pred, result) {
    if (!pred || pred.home === "" || pred.away === "" || pred.home === undefined || pred.away === undefined) {
        return { icon: "—", cls: "b-none" };
    }
    if (!result) {
        return { icon: "○", cls: "b-pending" };
    }
    const { pts } = calcMatchPts(pred, result);
    if (pts === 6) return { icon: "✓", cls: "b-exact", text: `+6` };
    if (pts > 0) return { icon: "%", cls: "b-partial", text: `+${pts}` };
    return { icon: "%", cls: "b-zero", text: "0" };
}

/** Resumen de una fecha: puntos totales, acertados, total con resultado. */
export function calcDaySummary(pron, resultados, matchIds) {
    let totalPts = 0;
    let correctCount = 0;
    let totalWithResult = 0;
    for (const id of matchIds) {
        const pred = pron[id];
        const result = resultados[id];
        if (pred && pred.home !== "" && pred.home !== undefined && pred.away !== "" && pred.away !== undefined) {
            if (result) {
                const { pts } = calcMatchPts(pred, result);
                totalPts += pts;
                totalWithResult++;
                if (pts > 0) correctCount++;
            }
        }
    }
    return { totalPts, correctCount, totalWithResult };
}