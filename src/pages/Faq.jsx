import "./Faq.css";

const faqData = [
    {
        section: "General",
        items: [
            {
                q: "¿Qué es Prode Mundial 2026?",
                a: "Es una app para pronosticar los resultados del Mundial 2026. Competís contra otros usuarios acertando resultados, goles y el campeón. Gana el que más puntos acumule al final del torneo."
            },
            {
                q: "¿Cómo empiezo?",
                a: "Registrate con tu mail y una contraseña, elegí un alias y un avatar. Después andá a la pestaña Pronósticos y empezá a cargar tus predicciones partido por partido."
            }
        ]
    },
    {
        section: "Pronósticos",
        items: [
            {
                q: "¿Cómo pronostico un partido?",
                a: 'En la pantalla de Pronósticos, cada partido tiene dos campos numéricos. Ingresá los goles que creés que va a hacer cada equipo y después apretá "Guardar todos los pronósticos". La app te confirma con un cartel cuando se guardó.'
            },
            {
                q: '¿Hasta cuándo puedo cambiar mi pronóstico?',
                a: "Podés cambiarlo tantas veces como quieras, hasta que el partido empiece. Una vez que arranca, ese pronóstico se bloquea automáticamente y ya no se puede modificar."
            },
            {
                q: '¿Qué significa "bloqueado"?',
                a: "Un partido bloqueado es uno que ya empezó o terminó. Se marca con un candado y el fondo se vuelve gris. No se puede modificar el pronóstico."
            },
            {
                q: "¿Qué pasa si no pronostico un partido?",
                a: "No pasa nada, simplemente no sumás puntos en ese partido. No hay penalización, pero perdés la chance de sumar."
            },
            {
                q: "¿Cómo uso los filtros?",
                a: 'Arriba de la lista de partidos hay tres filtros: <strong>Todos</strong> (muestra todos los partidos), <strong>Predichos</strong> (solo los que ya pronosticaste) y <strong>Pendientes</strong> (solo los que te faltan). Tocando cada uno cambiás la vista al instante.'
            },
            {
                q: "¿Qué significa la barra de progreso?",
                a: "Es el indicador que aparece arriba de los partidos y muestra qué porcentaje del fixture completaste. Si ves \"60%\", significa que pronosticaste 43 de los 72 partidos. Te ayuda a no perderte ningún partido."
            }
        ]
    },
    {
        section: "Puntajes",
        items: [
            {
                q: "¿Cómo se calculan los puntos?",
                a: "Por cada partido:<br><br><strong>Resultado exacto</strong> (acertás los goles de los dos equipos): <strong>6 pts</strong><br><strong>Ganador o empate correcto</strong> (sin acertar los goles exactos): <strong>3 pts</strong><br><strong>Gol de un equipo acertado</strong> (acertás el gol de uno solo): <strong>1 pt</strong><br><br>El máximo por partido es 6 puntos. Si acertás el resultado exacto, no se suman los puntos individuales de los goles."
            },
            {
                q: "¿Qué es el bonus de campeón?",
                a: "Antes del primer partido del Mundial, elegís un equipo como tu campeón desde tu Perfil. Si ese equipo termina siendo el campeón real, sumás <strong>15 puntos extra</strong>. Una vez que arranca el primer partido, la selección queda bloqueada."
            },
            {
                q: "¿Dónde veo mi puntaje?",
                a: "En la pestaña <strong>Tabla</strong> ves el ranking completo con los puntos de todos los jugadores. En tu <strong>Perfil</strong> están tus estadísticas personales (puntos totales y exactos)."
            },
            {
                q: "¿Qué son los rangos o títulos?",
                a: 'Según tu posición en la tabla, la app te asigna un título en tu Perfil:<br><br><strong>Leyenda</strong> (top 10%)<br><strong>Nostradamus</strong> (top 30%)<br><strong>Experto</strong> (top 50%)<br><strong>Promesa</strong> (top 70%)<br><strong>Fantasma</strong> (top 90%)<br><strong>Tronco</strong> (últimos 10%)<br><br>Si todos están en 0, todos ven <strong>"En cancha"</strong>.'
            },
            {
                q: "¿Qué significan los indicadores en la tabla?",
                a: 'Al lado de cada jugador en la Tabla hay un indicador de movimiento: <strong>subió</strong> 🠕, <strong>bajó</strong> 🠗 o <strong>se mantuvo</strong> ● respecto a la fecha anterior. También aparece un <strong>icono de fuego</strong> 🔥 al lado del jugador que más puntos hizo en la última fecha (el "mejor del día").'
            }
        ]
    },
    {
        section: "Horarios y cierres",
        items: [
            {
                q: "¿A qué hora cierran los pronósticos?",
                a: "Cada partido se bloquea automáticamente 3 minutos antes de la hora de inicio que figura en su tarjeta. No se puede modificar después de ese horario, ni siquiera si el partido se demora."
            },
            {
                q: "¿En qué huso horario están los partidos?",
                a: "Todos los horarios están en <strong>Argentina (GMT-3)</strong>."
            },
            {
                q: "¿Puedo cambiar mi campeón después del primer partido?",
                a: "No. Una vez que arranca el primer partido del Mundial, tu selección de campeón queda fija. Podés cambiarla antes desde tu Perfil todas las veces que quieras."
            }
        ]
    },
    {
        section: "Tabla de posiciones",
        items: [
            {
                q: "¿Cómo veo el detalle de otro jugador?",
                a: "En la pestaña <strong>Tabla</strong>, toca cualquier jugador de la lista y se va a abrir un modal con toda su información: puntos totales, resultados exactos, su campeón elegido y el detalle de sus pronósticos fecha por fecha."
            },
            {
                q: "¿Cómo comparto la tabla?",
                a: "En la pestaña <strong>Tabla</strong>, toca el botón <strong>Compartir</strong> (arriba a la derecha). La app genera una imagen del ranking y te permite compartirla por WhatsApp, redes sociales o descargarla. Ideal para presumir si estás primero."
            }
        ]
    },
    {
        section: "Cuenta",
        items: [
            {
                q: "¿Olvidé mi contraseña?",
                a: 'En la pantalla de inicio de sesión, toca <strong>"¿Olvidaste tu contraseña?"</strong>, ingresá tu mail y te va a llegar un link para restablecerla. Si no lo ves, revisá la carpeta de spam.'
            },
            {
                q: "¿Cómo cambio mi avatar?",
                a: "En tu <strong>Perfil</strong>, toca tu avatar actual y se abre un selector con 16 avatares diferentes. Elegí el que más te guste y se guarda automáticamente. Son generados por DiceBear, así que cada uno es único."
            }
        ]
    },
    {
        section: "App",
        items: [
            {
                q: "¿Cómo activo el modo oscuro?",
                a: 'En tu Perfil hay un botón que dice "Modo oscuro / Modo claro". La preferencia se guarda automáticamente y se mantiene aunque cierres el navegador.'
            },
            {
                q: "¿Se guardan mis pronósticos automáticamente?",
                a: 'No. Tenés que apretar <strong>"Guardar todos los pronósticos"</strong> cada vez que hagas cambios. La app te muestra un cartel verde cuando se guardaron correctamente. Tus datos quedan guardados en la nube, así que si cerrás sesión o entrás desde otro dispositivo, tus pronósticos siguen ahí.'
            },
            {
                q: "¿Hay partidos de eliminatorias (octavos, cuartos, etc.)?",
                a: "Por ahora la app solo incluye la <strong>fase de grupos</strong> (72 partidos). Las eliminatorias se habilitarán más adelante, cuando se definan los cruces. Seguí atento a las actualizaciones."
            }
        ]
    }
];

export default function Faq() {
    return (
        <div className="faq-wrap">
            <h1 className="faq-title">Preguntas frecuentes</h1>
            {faqData.map((section, i) => (
                <div key={i} className="faq-section">
                    <h2 className="faq-section-title">{section.section}</h2>
                    {section.items.map((item, j) => (
                        <details key={j} className="faq-item">
                            <summary className="faq-q">{item.q}</summary>
                            <p className="faq-a" dangerouslySetInnerHTML={{ __html: item.a }} />
                        </details>
                    ))}
                </div>
            ))}
        </div>
    );
}