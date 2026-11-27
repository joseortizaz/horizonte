import { useEffect, useMemo, useState } from 'react'
import type { PropsJuego } from '../TallerOficio'

// Capitanía (convencional): repartir la carga en el muelle correcto, con atención al detalle.
// Regla: cada caja va al muelle de su figura (● Norte, ▲ Sur, ■ Este),
// salvo las marcadas como FRÁGIL, que van siempre a Revisión.
const MUELLES = [
  { id: 'norte', nombre: 'Norte', figura: '●' },
  { id: 'sur', nombre: 'Sur', figura: '▲' },
  { id: 'este', nombre: 'Este', figura: '■' },
  { id: 'revision', nombre: 'Revisión', figura: '⚠' },
]
const FIGURAS = ['●', '▲', '■']
const COLORES = ['#c0392b', '#2e86c1', '#27ae60', '#d68910']
const TOTAL = 12
const SEGUNDOS = 6

interface Caja {
  figura: string
  color: string
  fragil: boolean
  codigo: string
}

function crearCajas(): Caja[] {
  return Array.from({ length: TOTAL }, (_, i) => ({
    figura: FIGURAS[Math.floor(Math.random() * 3)],
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    fragil: i > 1 && Math.random() < 0.25,
    codigo: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}-${100 + Math.floor(Math.random() * 900)}`,
  }))
}

const destinoCorrecto = (c: Caja) => (c.fragil ? 'revision' : MUELLES.find((m) => m.figura === c.figura)!.id)

export function Carga({ onFin }: PropsJuego) {
  const cajas = useMemo(crearCajas, [])
  const [i, setI] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [restante, setRestante] = useState(SEGUNDOS)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [empezado, setEmpezado] = useState(false)
  const terminado = i >= TOTAL
  const caja = cajas[i]

  // Cuenta regresiva por caja (un poco más rápida a medida que avanza)
  useEffect(() => {
    if (!empezado || terminado || aviso) return
    if (restante <= 0) {
      setAviso({ ok: false, texto: `¡Se acabó el tiempo! Iba al muelle ${MUELLES.find((m) => m.id === destinoCorrecto(caja))!.nombre}.` })
      return
    }
    const t = window.setTimeout(() => setRestante((r) => r - 1), 1000)
    return () => window.clearTimeout(t)
  }, [empezado, terminado, aviso, restante, caja])

  // Después de cada caja, la siguiente llega sola
  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(() => {
      setAviso(null)
      setI((n) => n + 1)
      setRestante(Math.max(3, SEGUNDOS - Math.floor((i + 1) / 4)))
    }, 900)
    return () => window.clearTimeout(t)
  }, [aviso, i])

  function enviar(muelle: string) {
    if (aviso || terminado) return
    const correcto = destinoCorrecto(caja)
    if (muelle === correcto) {
      setAciertos((a) => a + 1)
      setAviso({ ok: true, texto: '¡Bien!' })
    } else {
      setAviso({ ok: false, texto: `Iba al muelle ${MUELLES.find((m) => m.id === correcto)!.nombre}.` })
    }
  }

  if (!empezado) {
    return (
      <section className="juego">
        <p className="juego-instruccion">Ramón te explica la regla del puerto:</p>
        <ul className="carga-reglas">
          <li>● va al muelle <strong>Norte</strong>, ▲ al <strong>Sur</strong> y ■ al <strong>Este</strong>.</li>
          <li>El color y el código no importan.</li>
          <li>
            Pero si la caja dice <strong>FRÁGIL</strong>, va siempre a <strong>Revisión</strong>.
          </li>
        </ul>
        <p className="bitacora-nota">Tienes unos segundos por caja. Son {TOTAL} cajas.</p>
        <button className="creador-guardar" onClick={() => setEmpezado(true)}>
          Empezar
        </button>
      </section>
    )
  }

  if (terminado) {
    return (
      <section className="juego">
        <div className="juego-final">
          <p>
            Repartiste bien <strong>{aciertos}</strong> de {TOTAL} cajas.
          </p>
          <button className="creador-guardar" onClick={() => onFin({ desempeno: (aciertos / TOTAL) * 100 })}>
            Terminar
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="juego">
      <p className="juego-marcador">
        Caja {i + 1} de {TOTAL} · Aciertos: {aciertos} · Tiempo: {restante} s
      </p>
      <div className="carga-caja" style={{ borderColor: caja.color }}>
        <span className="carga-figura" style={{ color: caja.color }}>
          {caja.figura}
        </span>
        <span className="carga-codigo">{caja.codigo}</span>
        {caja.fragil && <span className="carga-fragil">FRÁGIL</span>}
      </div>
      <p className={'carga-aviso ' + (aviso ? (aviso.ok ? 'ok' : 'error') : '')}>{aviso?.texto ?? ' '}</p>
      <div className="carga-muelles">
        {MUELLES.map((m) => (
          <button key={m.id} className="opcion" onClick={() => enviar(m.id)}>
            <span className="carga-figura-boton">{m.figura}</span> {m.nombre}
          </button>
        ))}
      </div>
    </section>
  )
}
