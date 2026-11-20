import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PhaserGame } from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { supabase } from './lib/supabase'
import './App.css'

export default function App() {
  const { session, cargando } = useSession()

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!session) return <AuthScreen />
  return <Juego session={session} />
}

function Juego({ session }: { session: Session }) {
  const [faros, setFaros] = useState(0)
  const [mensaje, setMensaje] = useState('Explora la isla y encuentra el faro.')
  const nombre = (session.user.user_metadata.display_name as string | undefined) ?? 'Navegante'

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
        <span className="hud-usuario">
          {nombre}
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </span>
      </header>
      <PhaserGame />
      <p className="mensaje">{mensaje}</p>
    </div>
  )
}
