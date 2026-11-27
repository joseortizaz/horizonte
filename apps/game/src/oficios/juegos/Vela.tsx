import { useState } from 'react'
import type { PropsJuego } from '../TallerOficio'
import { barcaSvg } from '../../game/arte/barca'
import { svgADataUri } from '../../avatar/dibujo'

// Taller de colores (artístico): diseñar la vela de la barca en una cuadrícula de 6 × 6.
// No hay respuestas correctas; el diseño se guarda y la barca lo lleva puesto.
const COLORES = ['#fdf6e3', '#1c2833', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2e86c1', '#8e44ad', '#ec407a', '#5dade2']
const LADO = 6

export function Vela({ onFin }: PropsJuego) {
  const [celdas, setCeldas] = useState<string[]>(Array(LADO * LADO).fill(COLORES[0]))
  const [color, setColor] = useState(COLORES[2])
  const [espejo, setEspejo] = useState(true)
  const [pintando, setPintando] = useState(false)

  function pintar(i: number) {
    setCeldas((c) => {
      const nueva = [...c]
      nueva[i] = color
      if (espejo) {
        const fila = Math.floor(i / LADO)
        const col = i % LADO
        nueva[fila * LADO + (LADO - 1 - col)] = color
      }
      return nueva
    })
  }

  const coloresUsados = new Set(celdas).size

  return (
    <section className="juego">
      <p className="juego-instruccion">
        Elige un color y toca los cuadros de la vela. Con «Espejo» lo que pintas a un lado aparece también al otro.
      </p>
      <div className="vela-area">
        <div
          className="vela-cuadricula"
          onPointerLeave={() => setPintando(false)}
          onPointerUp={() => setPintando(false)}
        >
          {celdas.map((c, i) => (
            <button
              key={i}
              className="vela-celda"
              style={{ background: c }}
              aria-label={`Cuadro ${i + 1}`}
              onPointerDown={() => {
                setPintando(true)
                pintar(i)
              }}
              onPointerEnter={() => pintando && pintar(i)}
            />
          ))}
        </div>
        <img className="vela-vista" src={svgADataUri(barcaSvg(celdas))} alt="Así se verá tu barca" />
      </div>
      <div className="vela-paleta">
        {COLORES.map((c) => (
          <button
            key={c}
            className={c === color ? 'muestra activa' : 'muestra'}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            aria-pressed={c === color}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="cuestionario-acciones">
        <button className={espejo ? 'opcion activa' : 'opcion'} onClick={() => setEspejo((e) => !e)}>
          Espejo {espejo ? 'activado' : 'desactivado'}
        </button>
        <button className="opcion" onClick={() => setCeldas(Array(LADO * LADO).fill(color))}>
          Rellenar todo
        </button>
        <button className="opcion" onClick={() => setCeldas(Array(LADO * LADO).fill(COLORES[0]))}>
          Borrar
        </button>
      </div>
      <button
        className="creador-guardar"
        onClick={() => onFin({ desempeno: null, extra: { vela: celdas, colores: coloresUsados } })}
      >
        ¡Mi vela está lista!
      </button>
    </section>
  )
}
