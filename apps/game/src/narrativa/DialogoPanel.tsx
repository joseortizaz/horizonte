import { useEffect, useState } from 'react'
import type { PasoDialogo } from './motor'

interface Props {
  paso: PasoDialogo
  onElegir: (indice: number) => void
  onCerrar: () => void
}

// Muestra la conversación línea por línea y, al final, las opciones.
// Teclado: Enter o Espacio para continuar; 1, 2, 3… para elegir.
export function DialogoPanel({ paso, onElegir, onCerrar }: Props) {
  const [indice, setIndice] = useState(0)
  const linea = paso.lineas[indice]
  const esUltima = indice >= paso.lineas.length - 1
  const mostrarOpciones = esUltima && paso.opciones.length > 0

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      // Si hay un botón enfocado, el navegador ya se encarga de Enter y Espacio
      if (e.target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!esUltima) setIndice((i) => i + 1)
        else if (!mostrarOpciones) onCerrar()
        return
      }

      const numero = Number(e.key)
      if (mostrarOpciones && numero >= 1 && numero <= paso.opciones.length) {
        onElegir(numero - 1)
      }
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [esUltima, mostrarOpciones, onCerrar, onElegir, paso.opciones.length])

  return (
    <div className="dialogo" role="dialog" aria-live="polite">
      {linea?.hablante && <div className="dialogo-hablante">{linea.hablante}</div>}
      {linea && <p className="dialogo-texto">{linea.texto}</p>}

      {!esUltima && (
        <button className="dialogo-continuar" onClick={() => setIndice((i) => i + 1)}>
          Continuar ▸
        </button>
      )}

      {mostrarOpciones && (
        <div className="dialogo-opciones">
          {paso.opciones.map((opcion, i) => (
            <button key={opcion} onClick={() => onElegir(i)}>
              <span className="dialogo-numero">{i + 1}</span>
              {opcion}
            </button>
          ))}
        </div>
      )}

      {esUltima && !mostrarOpciones && (
        <button className="dialogo-continuar" onClick={onCerrar}>
          Cerrar
        </button>
      )}
    </div>
  )
}
