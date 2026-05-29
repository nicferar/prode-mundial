const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.world/scoreboard";

const NAME_TO_CODE = {
    "México": "MEX", "Mexico": "MEX",
    "Sudáfrica": "RSA", "South Africa": "RSA",
    "Corea del Sur": "KOR", "South Korea": "KOR",
    "Rep. Checa": "CZE", "Czech Republic": "CZE",
    "Canadá": "CAN", "Canada": "CAN",
    "Bosnia": "BIH",
    "Qatar": "QAT",
    "Suiza": "SUI", "Switzerland": "SUI",
    "Brasil": "BRA", "Brazil": "BRA",
    "Marruecos": "MAR", "Morocco": "MAR",
    "Haití": "HAI", "Haiti": "HAI",
    "Escocia": "SCO", "Scotland": "SCO",
    "Estados Unidos": "USA", "United States": "USA",
    "Paraguay": "PAR",
    "Australia": "AUS",
    "Turquía": "TUR", "Turkey": "TUR",
    "Alemania": "GER", "Germany": "GER",
    "Curaçao": "CUW", "Curacao": "CUW",
    "Holanda": "NED", "Netherlands": "NED",
    "Japón": "JPN", "Japan": "JPN",
    "Costa de Marfil": "CIV", "Ivory Coast": "CIV", "Côte d'Ivoire": "CIV",
    "Ecuador": "ECU",
    "Suecia": "SWE", "Sweden": "SWE",
    "Túnez": "TUN", "Tunisia": "TUN",
    "España": "ESP", "Spain": "ESP",
    "Cabo Verde": "CPV", "Cape Verde": "CPV",
    "Bélgica": "BEL", "Belgium": "BEL",
    "Egipto": "EGY", "Egypt": "EGY",
    "Arabia Saudita": "KSA", "Saudi Arabia": "KSA",
    "Uruguay": "URU",
    "Irán": "IRN", "Iran": "IRN",
    "Nueva Zelanda": "NZL", "New Zealand": "NZL",
    "Francia": "FRA", "France": "FRA",
    "Senegal": "SEN",
    "Irak": "IRQ", "Iraq": "IRQ",
    "Noruega": "NOR", "Norway": "NOR",
    "Argentina": "ARG",
    "Argelia": "ALG", "Algeria": "ALG",
    "Austria": "AUT",
    "Jordania": "JOR", "Jordan": "JOR",
    "Portugal": "POR",
    "RD Congo": "COD", "DR Congo": "COD", "Congo DR": "COD",
    "Inglaterra": "ENG", "England": "ENG",
    "Croacia": "CRO", "Croatia": "CRO",
    "Ghana": "GHA",
    "Panamá": "PAN", "Panama": "PAN",
    "Uzbekistán": "UZB", "Uzbekistan": "UZB",
    "Colombia": "COL",
};

function teamToCode(team) {
    if (!team) return null;
    const abbr = team.abbreviation;
    if (abbr && /^[A-Za-z]{3}$/.test(abbr)) return abbr.toUpperCase();
    const name = team.displayName || team.shortDisplayName || team.name;
    if (!name) return null;
    return NAME_TO_CODE[name] || null;
}

export async function fetchLiveScores() {
    try {
        const res = await fetch(ESPN_URL);
        if (!res.ok) return {};
        const data = await res.json();
        const results = {};
        for (const event of data.events || []) {
            const comp = event.competitions?.[0];
            if (!comp) continue;
            const competitors = comp.competitors || [];
            if (competitors.length < 2) continue;
            const home = teamToCode(competitors[0]?.team);
            const away = teamToCode(competitors[1]?.team);
            if (!home || !away) continue;
            const state = comp.status?.type?.state;
            if (state === "pre") continue;
            const hs = competitors[0]?.score;
            const as = competitors[1]?.score;
            if (hs == null || as == null) continue;
            results[`${home}_${away}`] = {
                home: String(hs),
                away: String(as),
                status: state === "in" ? "live" : "finished",
            };
        }
        return results;
    } catch (e) {
        console.warn("ESPN fetch error:", e);
        return {};
    }
}
