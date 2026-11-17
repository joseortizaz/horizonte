import { useEffect, useState } from 'react'
import { PhaserGame } from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import './App.css'

export default function App() {
  const [faros, setFaros] = useState(0)
  const [mensaje, setMensaje] = useState('Explora la isla y encuentra el faro.')

  useEffect(() => {
    const alEncenderFaro = () => {
      setFaros((n) => n + 1)
      setMensaje('¡Encendiste el Faro de las Raíces! La Bruma retrocede.')
    }
    EventBus.on('faro-encendido', alEncenderFaro)
    return () => {
      EventBus.off('faro-encendido', alEncenderFaro)
    }
  }, [])

  return (
    <div className="app">
      <header className="hud">
        <strong>Horizonte</strong>
        <span>Faros encendidos: {faros} / 7</span>
      </header>
      <PhaserGame />
      <p className="mensaje">{mensaje}</p>
    </div>
  )
}
