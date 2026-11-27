import { useState } from 'react'
import type { PropsJuego } from '../TallerOficio'

// Mercadito (emprendedor): un puesto de jugos durante tres días.
// Cada día se decide cuántos jugos preparar y a qué precio, según el clima.
// Cada jugo cuesta RD$15 en frutas; lo que no se vende se pierde.
const COSTO = 15
const DIAS = [
  { nombre: 'Lunes', clima: 'Soleado y caluroso', base: 40 },
  { nombre: 'Martes', clima: 'Lluvioso', base: 12 },
  { nombre: 'Miércoles', clima: 'Nublado', base: 25 },
]
const PRECIOS = [
  { valor: 25, factor: 1.25 },
  { valor: 50, factor: 1 },
  { valor: 75, factor: 0.55 },
]
const CANTIDADES = [10, 20, 30, 40, 50]

const demanda = (base: number, factor: number) => Math.round(base * factor)
const ganancia = (preparados: number, precio: number, quieren: number) =>
  Math.min(preparados, quieren) * precio - preparados * COSTO

// La mejor ganancia posible de cada día (para medir cómo le fue, de 0 a 100)
const mejorDelDia = (base: number) =>
  Math.max(...PRECIOS.flatMap((p) => CANTIDADES.map((c) => ganancia(c, p.valor, demanda(base, p.factor)))))

interface Dia {
  preparados: number
  precio: number
  vendidos: number
  resultado: number
}

export function Mercadito({ onFin }: PropsJuego) {
  const [dia, setDia] = useState(0)
  const [cantidad, setCantidad] = useState(20)
  const [precio, setPrecio] = useState(50)
  const [historial, setHistorial] = useState<Dia[]>([])
  const hoy = DIAS[dia]
  const visto = historial[dia]
  const caja = 500 + historial.reduce((s, d) => s + d.resultado, 0)

  function abrirPuesto() {
    const p = PRECIOS.find((x) => x.valor === precio)!
    const quieren = demanda(hoy.base, p.factor)
    const vendidos = Math.min(cantidad, quieren)
    setHistorial((h) => [...h, { preparados: cantidad, precio, vendidos, resultado: ganancia(cantidad, precio, quieren) }])
  }

  function siguiente() {
    if (dia === DIAS.length - 1) {
      const total = historial.reduce((s, d) => s + d.resultado, 0)
      const mejor = DIAS.reduce((s, d) => s + mejorDelDia(d.base), 0)
      onFin({ desempeno: Math.max(0, Math.min(100, (total / mejor) * 100)), extra: { ganancia: total } })
      return
    }
    setDia((d) => d + 1)
  }

  return (
    <section className="juego">
      <p className="juego-instruccion">
        Día {dia + 1} de {DIAS.length}: <strong>{hoy.nombre}</strong>. Pronóstico: <strong>{hoy.clima}</strong>. Caja:
        RD${caja}
      </p>
      {!visto ? (
        <>
          <h3>¿Cuántos jugos preparas? (RD${COSTO} cada uno)</h3>
          <div className="opciones">
            {CANTIDADES.map((c) => (
              <button key={c} className={c === cantidad ? 'opcion activa' : 'opcion'} onClick={() => setCantidad(c)}>
                {c}
              </button>
            ))}
          </div>
          <h3>¿A qué precio los vendes?</h3>
          <div className="opciones">
            {PRECIOS.map((p) => (
              <button key={p.valor} className={p.valor === precio ? 'opcion activa' : 'opcion'} onClick={() => setPrecio(p.valor)}>
                RD${p.valor}
              </button>
            ))}
          </div>
          <p className="bitacora-nota">
            Pista de Yaritza: con calor la gente compra más; si el precio es muy alto, compra menos. Lo que no vendes,
            lo pierdes.
          </p>
          <button className="creador-guardar" onClick={abrirPuesto}>
            Abrir el puesto
          </button>
        </>
      ) : (
        <div className="juego-final">
          <p>
            Preparaste {visto.preparados} jugos a RD${visto.precio} y vendiste <strong>{visto.vendidos}</strong>.
            {visto.vendidos === visto.preparados ? ' ¡Se acabaron todos! Quizás pudiste preparar más.' : ` Sobraron ${visto.preparados - visto.vendidos}.`}
          </p>
          <p>
            Resultado del día:{' '}
            <strong className={visto.resultado >= 0 ? 'mercado-gana' : 'mercado-pierde'}>
              {visto.resultado >= 0 ? `ganaste RD$${visto.resultado}` : `perdiste RD$${-visto.resultado}`}
            </strong>
          </p>
          <button className="creador-guardar" onClick={siguiente}>
            {dia === DIAS.length - 1 ? 'Cerrar el negocio y ver el total' : 'Siguiente día'}
          </button>
        </div>
      )}
    </section>
  )
}
