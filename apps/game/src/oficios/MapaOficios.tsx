import { useEffect, useState } from 'react'
import { TIPOS, cargarTalleres, principales } from './mapa'
import type { ResultadoTaller } from './mapa'

// "Mi mapa de oficios" en la Bitácora: un hexágono con lo que el joven disfrutó
// y lo que sintió que se le dio bien en cada islita del Archipiélago de los Oficios.
const C = 160
const R = 110

function punto(i: number, valor: number) {
  const a = ((-90 + i * 60) * Math.PI) / 180
  const r = (valor / 4) * R
  return [C + Math.cos(a) * r, C + Math.sin(a) * r]
}

export function MapaOficios() {
  const [filas, setFilas] = useState<ResultadoTaller[] | null>(null)

  useEffect(() => {
    void cargarTalleres().then(setFilas)
  }, [])

  if (filas === null) return null

  if (filas.length === 0) {
    return (
      <section className="bitacora-pagina bloqueada mapa-oficios">
        <h2>Mi mapa de oficios</h2>
        <p>Esta página aún está en blanco.</p>
        <p className="bitacora-nota">Pista: zarpa desde la Isla de las Raíces hacia el Archipiélago de los Oficios.</p>
      </section>
    )
  }

  const valor = (id: string, campo: 'disfrute' | 'habilidad') => filas.find((f) => f.taller === id)?.[campo] ?? 0
  const poligono = (campo: 'disfrute' | 'habilidad') =>
    TIPOS.map((t, i) => punto(i, valor(t.id, campo)).join(',')).join(' ')
  const top = principales(filas)

  return (
    <section className="bitacora-pagina mapa-oficios">
      <h2>Mi mapa de oficios</h2>
      <p>
        Visitaste {filas.length} de 6 islitas. Así se ve lo que disfrutaste y lo que sentiste que se te dio bien:
      </p>
      <svg viewBox="0 0 320 330" className="mapa-hexagono" role="img" aria-label="Hexágono de intereses">
        {[1, 2, 3, 4].map((n) => (
          <polygon
            key={n}
            points={TIPOS.map((_, i) => punto(i, n).join(',')).join(' ')}
            fill="none"
            stroke="#d5d8dc"
            strokeWidth={n === 4 ? 2 : 1}
          />
        ))}
        {TIPOS.map((_, i) => {
          const [x, y] = punto(i, 4)
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#d5d8dc" />
        })}
        <polygon points={poligono('disfrute')} fill="#1abc9c55" stroke="#148f77" strokeWidth={3} />
        <polygon points={poligono('habilidad')} fill="none" stroke="#e67e22" strokeWidth={3} strokeDasharray="7 5" />
        {TIPOS.map((t, i) => {
          const [x, y] = punto(i, 5.1)
          const visitado = filas.some((f) => f.taller === t.id)
          return (
            <text
              key={t.id}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill={visitado ? '#1c2833' : '#aab7b8'}
            >
              {t.nombre}
            </text>
          )
        })}
      </svg>
      <p className="mapa-leyenda">
        <span className="mapa-muestra disfrute" /> Lo que disfruté <span className="mapa-muestra habilidad" /> Lo que se me
        dio bien
      </p>

      {top.map((f) => {
        const t = TIPOS.find((x) => x.id === f.taller)!
        return (
          <div key={f.taller} className="mapa-tipo">
            <strong>
              {t.nombre}: {t.lema.toLowerCase()}
            </strong>
            <p className="bitacora-nota">Campos para explorar:</p>
            <ul className="bitacora-etiquetas">
              {t.oficios.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className="bitacora-nota">
        Es un mapa para explorar, no un destino ni un test. Puede cambiar con el tiempo, y no tienes que elegir un solo
        camino. La mejor forma de comprobarlo es conversar con alguien que trabaje en lo que te llamó la atención.
      </p>
    </section>
  )
}
