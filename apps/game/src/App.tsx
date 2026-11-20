import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PhaserGame } from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { AvatarCreator } from './avatar/AvatarCreator'
import { useAvatar } from './avatar/useAvatar'
import type { Avatar } from './avatar/tipos'
import { supabase } from './lib/supabase'
import './App.css'

export default function App() {
  const { session, cargando } = useSession()

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!session) return <AuthScreen />
  return <Sesion key={session.user.id} session={session} />
}

// Con sesión iniciada: primero el creador de personaje (si no existe), luego el juego
function Sesion({ session }: { session: Session }) {
  const { avatar, cargando, guardar } = useAvatar(session.user.id)
  const [editando, setEditando] = useState(false)

  if (cargando) return <div className="cargando">Cargando…</div>

  if (!avatar || editando) {
    return (
      <AvatarCreator
        inicial={avatar}
        onGuardar={async (nuevo) => {
          await guardar(nuevo)
          setEditando(false)
        }}
        onCancelar={avatar ? () => setEditando(false) : undefined}
      />
    )
  }

  return <Juego session={session} avatar={avatar} onEditarPersonaje={() => setEditando(true)} />
}

function Juego({ session, avatar, onEditarPersonaje }: {
  session: Session
  avatar: Avatar
  onEditarPersonaje: () => void
}) {
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
          <button onClick={onEditarPersonaje}>Personaje</button>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </span>
      </header>
      <PhaserGame avatar={avatar} />
      <p className="mensaje">{mensaje}</p>
    </div>
  )
}
