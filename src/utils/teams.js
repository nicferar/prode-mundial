export const FLAG_CODES = {
    MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
    CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
    BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
    USA: "us", PAR: "py", AUS: "au", TUR: "tr",
    GER: "de", CUW: "cw", NED: "nl", JPN: "jp",
    CIV: "ci", ECU: "ec", SWE: "se", TUN: "tn",
    ESP: "es", CPV: "cv", BEL: "be", EGY: "eg",
    KSA: "sa", URU: "uy", IRN: "ir", NZL: "nz",
    FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
    ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
    POR: "pt", COD: "cd", ENG: "gb-eng", CRO: "hr",
    GHA: "gh", PAN: "pa", UZB: "uz", COL: "co",
};

export const TEAM_NAMES = {
    MEX: "México", RSA: "Sudáfrica", KOR: "Corea del Sur", CZE: "Rep. Checa",
    CAN: "Canadá", BIH: "Bosnia", QAT: "Qatar", SUI: "Suiza",
    BRA: "Brasil", MAR: "Marruecos", HAI: "Haití", SCO: "Escocia",
    USA: "Estados Unidos", PAR: "Paraguay", AUS: "Australia", TUR: "Turquía",
    GER: "Alemania", CUW: "Curaçao", NED: "Holanda", JPN: "Japón",
    CIV: "Costa de Marfil", ECU: "Ecuador", SWE: "Suecia", TUN: "Túnez",
    ESP: "España", CPV: "Cabo Verde", BEL: "Bélgica", EGY: "Egipto",
    KSA: "Arabia Saudita", URU: "Uruguay", IRN: "Irán", NZL: "Nueva Zelanda",
    FRA: "Francia", SEN: "Senegal", IRQ: "Irak", NOR: "Noruega",
    ARG: "Argentina", ALG: "Argelia", AUT: "Austria", JOR: "Jordania",
    POR: "Portugal", COD: "RD Congo", ENG: "Inglaterra", CRO: "Croacia",
    GHA: "Ghana", PAN: "Panamá", UZB: "Uzbekistán", COL: "Colombia",
};

export const getFlagUrl = (code, width = 40) =>
    `https://flagcdn.com/w${width}/${FLAG_CODES[code] ?? code.toLowerCase()}.png`;

/** 48 selecciones del Mundial, ordenadas por nombre. */
export const WORLD_CUP_TEAMS = Object.keys(TEAM_NAMES)
    .map(key => ({
        key,
        name: TEAM_NAMES[key],
        flag: getFlagUrl(key, 40),
        flagLg: getFlagUrl(key, 80),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

export function getTeam(code) {
    if (!code) return null;
    return WORLD_CUP_TEAMS.find(t => t.key === code) ?? {
        key: code,
        name: TEAM_NAMES[code] ?? code,
        flag: getFlagUrl(code, 40),
        flagLg: getFlagUrl(code, 80),
    };
}
