import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PhaserGame } from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { AvatarCreator } from './avatar/AvatarCreator'
import { useAvatar } from './avatar/useAvatar'
import type { Avatar } from './avatar/tipos'
import { usePartida } from './partida/usePartida'
import type { Partida, Posicion } from './partida/tipos'
import { supabase } from './lib/supabase'
import './App.css'

const GUARDADO_POSICION_MS = 15000

export default function App() {
  const { session, cargando } = useSession()

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!session) return <AuthScreen />
  return <Sesion key={session.user.id} session={session} />
}

// Con sesión iniciada: primero el creador de personaje (si no existe), luego el juego
function Sesion({ session }: { session: Session }) {
  const { avatar, cargando: cargandoAvatar, guardar: guardarAvatar } = useAvatar(session.user.id)
  const { partidaInicial, cargando: cargandoPartida, guardar, actual } = usePartida(session.user.id)
  const [editando, setEditando] = useState(false)
  // Al volver del editor, el juego arranca con la partida más reciente
  const [partidaJuego, setPartidaJuego] = useState<Partida | null>(null)

  if (cargandoAvatar || cargandoPartida || !partidaInicial) {
    return <div className="cargando">Cargando…</div>
  }

  const volverAlJuego = () => {
    setPartidaJuego({ ...actual.current })
    setEditando(false)
  }

  if (!avatar || editando) {
    return (
      <AvatarCreator
        inicial={avatar}
        onGuardar={async (nuevo) => {
          await guardarAvatar(nuevo)
          volverAlJuego()
        }}
        onCancelar={avatar ? volverAlJuego : undefined}
      />
    )
  }

  return (
    <Juego
      session={session}
      avatar={avatar}
      partida={partidaJuego ?? partidaInicial}
      actual={actual}
      guardar={guardar}
      onEditarPersonaje={() => setEditando(true)}
    />
  )
}

function Juego({ session, avatar, partida, actual, guardar, onEditarPersonaje }: {
  session: Session
  avatar: Avatar
  partida: Partida
  actual: RefObject<Partida>
  guardar: (cambios: Partial<Partida>) => Promise<void>
  onEditarPersonaje: () => void
}) {
  const [faros, setFaros] = useState(partida.faros.length)
  const [mensaje, setMensaje] = useState(
    partida.faros.includes('raices')
      ? 'El Faro de las Raíces ya brilla. Pronto se abrirán nuevas regiones.'
      : 'Explora la isla y encuentra el faro.'
  )
  const posicionPendiente = useRef<Posicion | null>(null)
  const nombre = (session.user.user_metadata.display_name as string | undefined) ?? 'Navegante'

  useEffect(() => {
    // Guarda la última posición conocida, si hay una pendiente
    const guardarPosicion = () => {
      if (!posicionPendiente.current) return
      const posicion = posicionPendiente.current
      posicionPendiente.current = null
      void guardar({ posicion })
    }

    const alMoverse = (posicion: Posicion) => {
      posicionPendiente.current = posicion
    }

    const alEncenderFaro = (id: string) => {
      const encendidos = actual.current.faros
      if (encendidos.includes(id)) return
      setFaros(encendidos.length + 1)
      setMensaje('¡Encendiste el Faro de las Raíces! La Bruma retrocede.')
      void guardar({ faros: [...encendidos, id] })
    }

    const alOcultarse = () => {
      if (document.visibilityState === 'hidden') guardarPosicion()
    }

    EventBus.on('posicion', alMoverse)
    EventBus.on('faro-encendido', alEncenderFaro)
    document.addEventListener('visibilitychange', alOcultarse)
    const intervalo = window.setInterval(guardarPosicion, GUARDADO_POSICION_MS)

    return () => {
      guardarPosicion()
      EventBus.off('posicion', alMoverse)
      EventBus.off('faro-encendido', alEncenderFaro)
      document.removeEventListener('visibilitychange', alOcultarse)
      window.clearInterval(intervalo)
    }
  }, [actual, guardar])

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
      <PhaserGame avatar={avatar} partida={partida} />
      <p className="mensaje">{mensaje}</p>
    </div>
  )
}
