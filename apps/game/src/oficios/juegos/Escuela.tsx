import { useMemo, useState } from 'react'
import type { PropsJuego } from '../TallerOficio'

// Escuela (social): atender a tres vecinos. Cuenta escuchar y acompañar, no solo resolver.
const VECINOS = [
  {
    quien: 'Luisito, 9 años',
    dice: 'No entiendo las fracciones y todos se ríen de mí cuando pregunto.',
    respuestas: [
      { texto: 'Ven, lo vemos juntos con una pizza dibujada. Aquí nadie se ríe de las preguntas.', puntos: 2, reaccion: 'Luisito sonríe y saca su cuaderno.' },
      { texto: 'Tienes que estudiar más en casa.', puntos: 1, reaccion: 'Luisito asiente, pero sigue sin entender.' },
      { texto: 'Las fracciones son fáciles, no es para tanto.', puntos: 0, reaccion: 'Luisito baja la cabeza.' },
    ],
  },
  {
    quien: 'Doña Mercedes, 78 años',
    dice: 'Me torcí el tobillo y estoy asustada. Vivo sola y no sé cómo voy a hacer.',
    respuestas: [
      { texto: 'Tranquila, vamos a revisarlo con calma. ¿Hay alguien a quien podamos avisar para que la acompañe?', puntos: 2, reaccion: 'Doña Mercedes respira más tranquila y te da el número de su sobrina.' },
      { texto: 'Póngale hielo y ya se le pasa.', puntos: 1, reaccion: 'Doña Mercedes se pone hielo, pero sigue preocupada.' },
      { texto: 'Eso le pasa por andar apurada.', puntos: 0, reaccion: 'Doña Mercedes se queda callada, avergonzada.' },
    ],
  },
  {
    quien: 'Camila, 16 años',
    dice: 'Me peleé con mis amigas y no sé cómo arreglarlo. Me siento fatal.',
    respuestas: [
      { texto: 'Cuéntame qué pasó. ¿Qué te gustaría que pasara ahora con ellas?', puntos: 2, reaccion: 'Camila te cuenta todo y se le ocurre una forma de hablar con ellas.' },
      { texto: 'Pídeles perdón y listo.', puntos: 1, reaccion: 'Camila no está segura de que eso funcione.' },
      { texto: 'Búscate otras amigas.', puntos: 0, reaccion: 'Camila se siente peor que antes.' },
    ],
  },
]

const barajar = <T,>(lista: T[]) => [...lista].sort(() => Math.random() - 0.5)

export function Escuela({ onFin }: PropsJuego) {
  const [i, setI] = useState(0)
  const [elegida, setElegida] = useState<number | null>(null)
  const [puntos, setPuntos] = useState(0)
  const vecino = VECINOS[i]
  const opciones = useMemo(() => barajar(vecino.respuestas), [vecino])
  const ultimo = i === VECINOS.length - 1
  const max = VECINOS.length * 2

  function elegir(k: number) {
    if (elegida !== null) return
    setElegida(k)
    setPuntos((p) => p + opciones[k].puntos)
  }

  return (
    <section className="juego">
      <p className="juego-instruccion">
        Vecino {i + 1} de {VECINOS.length}. ¿Qué le respondes?
      </p>
      <div className="escuela-vecino">
        <strong>{vecino.quien}</strong>
        <p>«{vecino.dice}»</p>
      </div>
      <div className="escuela-opciones">
        {opciones.map((r, k) => (
          <button
            key={r.texto}
            className={'opcion ' + (elegida === k ? (r.puntos === 2 ? 'correcta' : 'incorrecta') : '')}
            onClick={() => elegir(k)}
            disabled={elegida !== null && elegida !== k}
          >
            {r.texto}
          </button>
        ))}
      </div>
      {elegida !== null && (
        <div className="juego-final">
          <p>{opciones[elegida].reaccion}</p>
          {opciones[elegida].puntos < 2 && (
            <p className="bitacora-nota">Doña Altagracia: «Antes de resolver, escucha y pregunta. La gente necesita sentirse entendida».</p>
          )}
          <button
            className="creador-guardar"
            onClick={() => {
              if (ultimo) onFin({ desempeno: (puntos / max) * 100 })
              else {
                setI((n) => n + 1)
                setElegida(null)
              }
            }}
          >
            {ultimo ? 'Terminar' : 'Siguiente vecino'}
          </button>
        </div>
      )}
    </section>
  )
}
