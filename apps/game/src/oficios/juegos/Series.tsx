import { useState } from 'react'
import type { PropsJuego } from '../TallerOficio'

// Observatorio (investigador): descubrir la regla escondida en cada serie.
const RETOS = [
  { serie: ['2', '4', '8', '16'], opciones: ['18', '24', '32', '30'], correcta: '32', regla: 'Cada número es el doble del anterior.' },
  { serie: ['●', '▲', '■', '●', '▲'], opciones: ['●', '▲', '■', '◆'], correcta: '■', regla: 'Las tres figuras se repiten siempre en el mismo orden.' },
  { serie: ['1', '1', '2', '3', '5', '8'], opciones: ['11', '13', '10', '16'], correcta: '13', regla: 'Cada número es la suma de los dos anteriores (5 + 8 = 13).' },
  { serie: ['81', '27', '9', '3'], opciones: ['0', '1', '2', '6'], correcta: '1', regla: 'Cada número es la tercera parte del anterior.' },
  { serie: ['A', 'C', 'E', 'G'], opciones: ['H', 'I', 'J', 'K'], correcta: 'I', regla: 'Se salta una letra cada vez: A (b) C (d) E (f) G (h) I.' },
  { serie: ['3', '5', '9', '17'], opciones: ['25', '33', '31', '34'], correcta: '33', regla: 'Cada número es el doble del anterior menos uno: 17 × 2 − 1 = 33.' },
]

export function Series({ onFin }: PropsJuego) {
  const [i, setI] = useState(0)
  const [elegida, setElegida] = useState<string | null>(null)
  const [aciertos, setAciertos] = useState(0)
  const reto = RETOS[i]
  const ultimo = i === RETOS.length - 1

  function elegir(opcion: string) {
    if (elegida) return
    setElegida(opcion)
    if (opcion === reto.correcta) setAciertos((a) => a + 1)
  }

  function siguiente() {
    if (ultimo) {
      onFin({ desempeno: (aciertos / RETOS.length) * 100 })
      return
    }
    setI((n) => n + 1)
    setElegida(null)
  }

  return (
    <section className="juego">
      <p className="juego-instruccion">
        Serie {i + 1} de {RETOS.length}: ¿qué viene después?
      </p>
      <div className="series-fila">
        {reto.serie.map((x, k) => (
          <span key={k} className="series-casilla">
            {x}
          </span>
        ))}
        <span className="series-casilla incognita">{elegida ?? '?'}</span>
      </div>
      <div className="series-opciones">
        {reto.opciones.map((o) => (
          <button
            key={o}
            className={
              'opcion ' +
              (elegida && o === reto.correcta ? 'correcta' : elegida === o ? 'incorrecta' : '')
            }
            onClick={() => elegir(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {elegida && (
        <div className="juego-final">
          <p>
            <strong>{elegida === reto.correcta ? '¡Exacto!' : `Era ${reto.correcta}.`}</strong> {reto.regla}
          </p>
          <button className="creador-guardar" onClick={siguiente}>
            {ultimo ? `Terminar (${aciertos} de ${RETOS.length})` : 'Siguiente serie'}
          </button>
        </div>
      )}
    </section>
  )
}
