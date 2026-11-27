import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsJuego } from '../TallerOficio'

// Astillero (realista): clavar en el momento justo.
// Un indicador va y viene por una barra; hay que martillar cuando pasa por la zona verde.
// En el centro exacto el clavo entra de un golpe; cerca, hacen falta dos.
const CLAVOS = 6
const GOLPES = 12

export function Clavos({ onFin }: PropsJuego) {
  const [posicion, setPosicion] = useState(0) // 0 a 100
  const [clavos, setClavos] = useState<number[]>(Array(CLAVOS).fill(0)) // 0 = fuera, 1 = a medias, 2 = clavado
  const [golpes, setGolpes] = useState(0)
  const [aviso, setAviso] = useState('Toca «Martillar» (o pulsa Espacio) cuando la marca esté en la zona verde.')
  const [empezado, setEmpezado] = useState(false)
  const tiempo = useRef(0)
  const actual = clavos.findIndex((c) => c < 2)
  const terminado = actual === -1 || golpes >= GOLPES
  // Cada clavo terminado acelera un poco la marca
  const velocidad = 0.9 + clavos.filter((c) => c === 2).length * 0.18

  useEffect(() => {
    if (!empezado || terminado) return
    let marco = 0
    let antes = performance.now()
    const animar = (ahora: number) => {
      tiempo.current += (ahora - antes) * 0.0016 * velocidad
      antes = ahora
      setPosicion(50 + Math.sin(tiempo.current * Math.PI) * 50)
      marco = requestAnimationFrame(animar)
    }
    marco = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(marco)
  }, [empezado, terminado, velocidad])

  const martillar = useCallback(() => {
    if (!empezado) {
      setEmpezado(true)
      return
    }
    if (terminado) return
    const distancia = Math.abs(posicion - 50)
    setGolpes((g) => g + 1)
    setClavos((lista) => {
      const nueva = [...lista]
      if (distancia < 6) {
        nueva[actual] = 2
        setAviso('¡Perfecto! El clavo entró de un golpe.')
      } else if (distancia < 16) {
        nueva[actual] = Math.min(2, nueva[actual] + 1)
        setAviso(nueva[actual] === 2 ? '¡Clavado!' : 'Bien, pero le falta un golpe más.')
      } else {
        setAviso('¡Uy! Le diste a la madera. Espera la zona verde.')
      }
      return nueva
    })
  }, [empezado, terminado, posicion, actual])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        martillar()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [martillar])

  const clavados = clavos.filter((c) => c === 2).length

  return (
    <section className="juego">
      <p className="juego-instruccion">{aviso}</p>
      <div className="clavos-casco" aria-label={`${clavados} de ${CLAVOS} clavos`}>
        {clavos.map((c, i) => (
          <span key={i} className={`clavo estado-${c} ${i === actual && !terminado ? 'actual' : ''}`} />
        ))}
      </div>
      <div className="clavos-barra" aria-hidden="true">
        <div className="clavos-zona-buena" />
        <div className="clavos-zona-perfecta" />
        <div className="clavos-marca" style={{ left: `${posicion}%` }} />
      </div>
      <p className="juego-marcador">
        Clavos: {clavados} / {CLAVOS} · Golpes: {golpes} / {GOLPES}
      </p>
      {terminado ? (
        <div className="juego-final">
          <p>
            {clavados === CLAVOS
              ? `¡Casco listo! Usaste ${golpes} golpes.`
              : `Se acabaron los golpes: clavaste ${clavados} de ${CLAVOS}. Don Fermín terminará el resto.`}
          </p>
          <button className="creador-guardar" onClick={() => onFin({ desempeno: Math.max(0, (clavados / CLAVOS) * 100 - Math.max(0, golpes - CLAVOS) * 3) })}>
            Terminar
          </button>
        </div>
      ) : (
        <button className="creador-guardar juego-boton-grande" onClick={martillar}>
          {empezado ? 'Martillar' : 'Empezar'}
        </button>
      )}
    </section>
  )
}
