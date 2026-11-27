import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Session } from '@supabase/supabase-js'
import { PhaserGame } from './game/PhaserGame'
import { EventBus } from './game/EventBus'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { AvatarCreator } from './avatar/AvatarCreator'
import { useAvatar } from './avatar/useAvatar'
import { COMPANEROS } from './avatar/tipos'
import type { Avatar } from './avatar/tipos'
import { usePartida } from './partida/usePartida'
import type { Partida, Posicion } from './partida/tipos'
import { Narrativa } from './narrativa/motor'
import type { PasoDialogo } from './narrativa/motor'
import { DialogoPanel } from './narrativa/DialogoPanel'
import { Bitacora } from './bitacora/Bitacora'
import { Diario } from './diario/Diario'
import { NOMBRES_INSIGNIAS } from './bitacora/contenido'
import { supabase } from './lib/supabase'
import { useConsentimiento } from './consentimiento/useConsentimiento'
import { EsperaConsentimiento } from './consentimiento/EsperaConsentimiento'
import { MensajesAcompanamiento } from './riesgo/MensajesAcompanamiento'
import { PantallaApoyo } from './riesgo/PantallaApoyo'
import { Cuestionario } from './evaluacion/Cuestionario'
import { TallerOficio } from './oficios/TallerOficio'
import type { Taller } from './oficios/TallerOficio'
import { cambiarVela } from './game/estado'
import type { EvaluacionPendiente } from './evaluacion/Cuestionario'
import './App.css'

const GUARDADO_POSICION_MS = 15000

// Qué variables de la historia indican que algo de la isla ya quedó resuelto
const RESUELTOS: Record<string, string> = {
  marea: 'conoce_a_marea',
  concha: 'tiene_concha',
  huella: 'tiene_huella',
  semilla: 'tiene_semilla',
  eco: 'eco_resuelto',
  'marea-despedida': 'insignia_autoconocimiento',
  // Acto II
  'llegada-oficios': 'llegada_oficios_vista',
  brisa: 'conoce_a_brisa',
  'brisa-despedida': 'insignia_curiosidad',
  'eco-oficios': 'eco_oficios_resuelto',
  'taller:realista': 'taller_realista',
  'taller:investigador': 'taller_investigador',
  'taller:artistico': 'taller_artistico',
  'taller:social': 'taller_social',
  'taller:emprendedor': 'taller_emprendedor',
  'taller:convencional': 'taller_convencional',
}

// Escena de Phaser de cada región
const ESCENAS: Record<string, string> = { raices: 'PuertoScene', oficios: 'ArchipielagoScene' }
const ORIGEN_INSIGNIA: Record<string, string> = { raices: 'isla-raices', oficios: 'archipielago-oficios' }

export default function App() {
  const { session, cargando } = useSession()

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!session) return <AuthScreen />
  return <Sesion key={session.user.id} session={session} />
}

// Con sesión iniciada: primero el creador de personaje (si no existe), luego el juego
function Sesion({ session }: { session: Session }) {
  const consentimiento = useConsentimiento(session.user.id)
  const {
    avatar,
    cargando: cargandoAvatar,
    error: errorAvatar,
    reintentar: reintentarAvatar,
    guardar: guardarAvatar,
  } = useAvatar(session.user.id)
  const {
    partidaInicial,
    cargando: cargandoPartida,
    error: errorPartida,
    reintentar: reintentarPartida,
    guardar,
    actual,
  } = usePartida(session.user.id)
  const [editando, setEditando] = useState(false)
  // Al volver del editor, el juego arranca con la partida más reciente
  const [partidaJuego, setPartidaJuego] = useState<Partida | null>(null)

  // Sin conexión la primera vez: todavía no hay copia en el dispositivo
  if (errorAvatar || errorPartida || consentimiento.error) {
    return (
      <div className="cargando">
        <div className="sin-conexion">
          <p>No pudimos cargar tu partida. Revisa tu conexión a internet.</p>
          <button
            className="creador-guardar"
            onClick={() => {
              reintentarAvatar()
              reintentarPartida()
              consentimiento.recargar()
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (cargandoAvatar || cargandoPartida || consentimiento.cargando || !partidaInicial) {
    return <div className="cargando">Cargando…</div>
  }

  // Menores de 18: esperar la autorización de su madre, padre o tutor
  if (!consentimiento.puedeJugar && consentimiento.estado) {
    return (
      <EsperaConsentimiento
        userId={session.user.id}
        nombre={(session.user.user_metadata.display_name as string | undefined) ?? 'Navegante'}
        estado={consentimiento.estado}
        onRevisar={consentimiento.recargar}
      />
    )
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

// Pantalla completa y orientación horizontal (Android; en iPhone se logra instalando la app)
const puedePantallaCompleta =
  typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)

async function alternarPantallaCompleta() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await document.documentElement.requestFullscreen()
    const orientacion = screen.orientation as ScreenOrientation & {
      lock?: (orientacion: string) => Promise<void>
    }
    await orientacion.lock?.('landscape')
  } catch {
    // Algunos navegadores no permiten bloquear la orientación: no pasa nada
  }
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
    partida.region === 'oficios'
      ? 'Navega entre las islitas del Archipiélago de los Oficios.'
      : partida.faros.includes('raices')
        ? 'El Faro de las Raíces ya brilla. La barca de la orilla sur te lleva al Archipiélago de los Oficios.'
        : 'Explora la Isla de las Raíces.'
  )
  const posicionPendiente = useRef<Posicion | null>(null)
  const nombre = (session.user.user_metadata.display_name as string | undefined) ?? 'Navegante'

  // Motor de diálogos: se crea una vez, con las decisiones guardadas en la partida
  const [narrativa] = useState(() => {
    const companero = COMPANEROS.find((c) => c.id === avatar.companero)?.nombre ?? 'Compañero'
    const n = new Narrativa(partida.narrativa, companero)
    n.fijarVariable('faro_encendido', partida.faros.includes('raices'))
    n.fijarVariable('faro_oficios_encendido', partida.faros.includes('oficios'))
    return n
  })
  // Lo que ya está resuelto en la isla, para que el juego no lo vuelva a mostrar
  const [resueltos] = useState(() =>
    Object.keys(RESUELTOS).filter((id) => narrativa.leerVariable(RESUELTOS[id]) === true)
  )
  const [insignia, setInsignia] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<{ paso: PasoDialogo; id: number } | null>(null)
  const dialogoAbierto = useRef(false)
  const contadorPasos = useRef(0)

  const [bitacoraAbierta, setBitacoraAbierta] = useState(false)
  const [seguirEnVertical, setSeguirEnVertical] = useState(false)
  const [diarioAbierto, setDiarioAbierto] = useState(false)
  const [revisionPendiente, setRevisionPendiente] = useState(false)

  const abrirBitacora = () => {
    if (dialogoAbierto.current) return
    EventBus.emit('pausar')
    setBitacoraAbierta(true)
  }

  const cerrarBitacora = useCallback(() => {
    setBitacoraAbierta(false)
    EventBus.emit('reanudar')
  }, [])

  // Cuestionario de evaluación del piloto (voluntario)
  const [evaluacion, setEvaluacion] = useState<EvaluacionPendiente | null>(null)
  const [apoyo, setApoyo] = useState<'moderado' | 'alto' | null>(null)
  const consultaEvaluacion = useRef<Promise<EvaluacionPendiente | null> | null>(null)
  const prologoTrasEvaluacion = useRef(false) // el prólogo espera a que termine el cuestionario inicial
  const ofrecerAlCerrarDialogo = useRef(false) // al terminar el Acto I

  const buscarEvaluacion = useCallback(async () => {
    const { data, error } = await supabase.rpc('evaluacion_pendiente')
    if (error || !data) return null
    const e = data as EvaluacionPendiente
    return e.items?.length ? e : null
  }, [])

  useEffect(() => {
    consultaEvaluacion.current = buscarEvaluacion()
  }, [buscarEvaluacion])

  const abrirEvaluacion = useCallback((e: EvaluacionPendiente) => {
    EventBus.emit('pausar')
    setEvaluacion(e)
  }, [])

  const continuarTrasEvaluacion = useCallback(() => {
    EventBus.emit('reanudar')
    if (prologoTrasEvaluacion.current) {
      prologoTrasEvaluacion.current = false
      EventBus.emit('hablar', 'prologo')
    }
  }, [])

  const cerrarEvaluacion = useCallback(
    (nivel: string) => {
      setEvaluacion(null)
      if (nivel === 'moderado' || nivel === 'alto') {
        setApoyo(nivel) // primero la pantalla de apoyo; el juego sigue al cerrarla
        return
      }
      continuarTrasEvaluacion()
    },
    [continuarTrasEvaluacion]
  )

  const cerrarApoyo = useCallback(() => {
    setApoyo(null)
    continuarTrasEvaluacion()
  }, [continuarTrasEvaluacion])

  // Acto II: minijuego del taller (se abre al cerrar la presentación del mentor)
  const [taller, setTaller] = useState<Taller | null>(null)
  const tallerPendiente = useRef<Taller | null>(null)
  const viajarPendiente = useRef<string | null>(null)

  // La vela diseñada en el taller de colores (para dibujar la barca)
  useEffect(() => {
    void supabase
      .from('oficios_talleres')
      .select('extra')
      .eq('profile_id', session.user.id)
      .eq('taller', 'artistico')
      .maybeSingle()
      .then(({ data }) => {
        const vela = (data?.extra as { vela?: string[] } | null)?.vela
        if (vela) cambiarVela(vela)
      })
  }, [session.user.id])

  const resueltosAhora = useCallback(
    () => Object.keys(RESUELTOS).filter((id) => narrativa.leerVariable(RESUELTOS[id]) === true),
    [narrativa]
  )

  // Viajar a otra región: se guarda la región, se olvida la posición y cambia la escena
  const viajar = useCallback(
    (region: string) => {
      if (!ESCENAS[region] || region === actual.current.region) return
      void guardar({ region, posicion: null, narrativa: narrativa.guardarEstado() }).then(() => {
        EventBus.emit('cambiar-escena', { escena: ESCENAS[region], partida: { ...actual.current }, resueltos: resueltosAhora() })
      })
      setMensaje(region === 'oficios' ? 'Rumbo al Archipiélago de los Oficios…' : 'Rumbo a la Isla de las Raíces…')
    },
    [actual, guardar, narrativa, resueltosAhora]
  )

  const terminarTaller = useCallback(
    (id: Taller, disfrute: number | null) => {
      setTaller(null)
      EventBus.emit('reanudar')
      if (disfrute === null) return // salió sin terminar: puede volver a intentarlo
      narrativa.fijarVariable('ultimo_disfrute', disfrute)
      EventBus.emit('hablar', `cierre_${id}`)
    },
    [narrativa]
  )

  const abrirDiario = () => {
    if (dialogoAbierto.current) return
    EventBus.emit('pausar')
    setDiarioAbierto(true)
  }

  const cerrarDiario = useCallback(() => {
    setDiarioAbierto(false)
    EventBus.emit('reanudar')
  }, [])

  // ¿Hay rutas sin revisar esta semana? (para avisar al joven)
  const revisarPendientes = useCallback(async () => {
    const { data } = await supabase.rpc('mi_diario')
    const metas = (data as { metas?: { estado: string; revision_semana: unknown }[] } | null)?.metas ?? []
    const pendiente = metas.some((m) => m.estado === 'activa' && !m.revision_semana)
    setRevisionPendiente(pendiente)
    return pendiente
  }, [])

  useEffect(() => {
    void revisarPendientes().then((pendiente) => {
      if (pendiente) setMensaje('Es hora de revisar tu rumbo: abre tu Diario de Navegación.')
    })
  }, [revisarPendientes])

  const otorgarInsignia = useCallback(
    (cualidad: string) => {
      setInsignia(NOMBRES_INSIGNIAS[cualidad] ?? cualidad)
      window.setTimeout(() => setInsignia(null), 6000)
      void supabase
        .from('insignias')
        .upsert(
          { profile_id: session.user.id, cualidad, nivel: 'bronce', origen: ORIGEN_INSIGNIA[actual.current.region] ?? 'juego' },
          { onConflict: 'profile_id,cualidad,nivel', ignoreDuplicates: true }
        )
        .then(({ error }) => {
          if (error) console.warn('No se pudo guardar la insignia:', error.message)
        })
    },
    [session.user.id, actual]
  )

  // Insignias que otorga el servidor (por ejemplo, Perseverancia en el Diario): solo se muestra el aviso
  const otorgarInsigniaVisible = useCallback((cualidad: string) => {
    setInsignia(NOMBRES_INSIGNIAS[cualidad] ?? cualidad)
    window.setTimeout(() => setInsignia(null), 6000)
  }, [])

  // Reacciona a los eventos que marca el guion (# evento: ...)
  const mostrarPaso = useCallback(
    (paso: PasoDialogo) => {
      for (const evento of paso.eventos) {
        const [tipo, valor] = evento.split(':')
        const recuerdos = Number(narrativa.leerVariable('recuerdos') ?? 0)

        if (tipo === 'mision-marea') {
          setMensaje('Habla con la mujer del bastón, en la orilla.')
        } else if (tipo === 'mision-recuerdos') {
          setMensaje(`Misión: encuentra los tres Recuerdos entre la Bruma (${recuerdos} / 3).`)
        } else if (tipo === 'recoger') {
          EventBus.emit('resolver', valor)
          setMensaje(
            recuerdos >= 3
              ? '¡Tienes los tres Recuerdos! Ve al faro, al noreste de la isla.'
              : `Recuerdos encontrados: ${recuerdos} / 3`
          )
        } else if (tipo === 'ocultar') {
          EventBus.emit('resolver', valor)
        } else if (tipo === 'encender-faro') {
          EventBus.emit('encender-faro')
        } else if (tipo === 'insignia') {
          otorgarInsignia(valor)
        } else if (tipo === 'viajar') {
          viajarPendiente.current = valor
        } else if (tipo === 'minijuego') {
          tallerPendiente.current = valor as Taller
        } else if (tipo === 'taller-completado') {
          EventBus.emit('resolver', `taller:${valor}`)
          const n = Number(narrativa.leerVariable('talleres_visitados') ?? 0)
          setMensaje(n >= 4 ? `Islitas visitadas: ${n} / 6. ¡Ya puedes ir al faro de la roca central!` : `Islitas visitadas: ${n} / 6`)
        } else if (tipo === 'mision-brisa') {
          setMensaje('Habla con la mujer del mapa, en el muelle de la roca central.')
        } else if (tipo === 'mision-talleres') {
          setMensaje('Misión: navega a las islitas y prueba al menos cuatro oficios (0 / 6).')
        } else if (tipo === 'fin-acto-2') {
          setMensaje('Fin del Acto II. Mira tu Mapa de oficios en la Bitácora y traza una ruta en tu Diario.')
        } else if (tipo === 'fin-acto-1') {
          setMensaje('Fin del Acto I. Traza tus rutas en el Diario o zarpa en la barca de la orilla sur.')
          ofrecerAlCerrarDialogo.current = true
        }
      }
      contadorPasos.current += 1
      setDialogo({ paso, id: contadorPasos.current })
    },
    [narrativa, otorgarInsignia]
  )

  const elegir = useCallback(
    (indice: number) => mostrarPaso(narrativa.elegir(indice)),
    [mostrarPaso, narrativa]
  )

  const cerrarDialogo = useCallback(() => {
    dialogoAbierto.current = false
    setDialogo(null)
    EventBus.emit('dialogo-cerrado')
    void guardar({ narrativa: narrativa.guardarEstado() })
    // Lo que el guion pidió hacer al terminar la conversación
    if (tallerPendiente.current) {
      const id = tallerPendiente.current
      tallerPendiente.current = null
      EventBus.emit('pausar')
      setTaller(id)
    }
    if (viajarPendiente.current) {
      const region = viajarPendiente.current
      viajarPendiente.current = null
      viajar(region)
    }
    // Al cerrar el Acto I se ofrece el cuestionario final (cuando la insignia ya quedó guardada)
    if (ofrecerAlCerrarDialogo.current) {
      ofrecerAlCerrarDialogo.current = false
      window.setTimeout(() => {
        void buscarEvaluacion().then((e) => {
          if (e && e.momento === 'fin_acto1' && !dialogoAbierto.current) abrirEvaluacion(e)
        })
      }, 2000)
    }
  }, [guardar, narrativa, buscarEvaluacion, abrirEvaluacion, viajar])

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

    const alHablar = (nudo: string) => {
      if (dialogoAbierto.current) return
      dialogoAbierto.current = true
      EventBus.emit('dialogo-abierto')
      mostrarPaso(narrativa.iniciar(nudo))
    }

    const alEncenderFaro = (id: string) => {
      const encendidos = actual.current.faros
      if (encendidos.includes(id)) return
      setFaros(encendidos.length + 1)
      if (id === 'oficios') {
        narrativa.fijarVariable('faro_oficios_encendido', true)
        setMensaje('¡El Faro de los Oficios brilla! Cuéntaselo a Brisa, en el muelle.')
      } else {
        narrativa.fijarVariable('faro_encendido', true)
        setMensaje(
          narrativa.leerVariable('conoce_a_marea')
            ? '¡El Faro de las Raíces brilla! Vuelve con Marea.'
            : '¡El Faro de las Raíces brilla! Busca a Marea, la mujer del bastón, en la orilla.'
        )
      }
      void guardar({ faros: [...encendidos, id], narrativa: narrativa.guardarEstado() })
    }

    // Primera vez en la isla: el prólogo empieza solo (antes, el cuestionario inicial si lo acepta).
    // En otras visitas, si hay un cuestionario pendiente, se ofrece al poco de llegar.
    const alEscenaLista = (region?: string) => {
      // Primera llegada al archipiélago: la escena de bienvenida empieza sola
      if (region === 'oficios') {
        if (!narrativa.leerVariable('llegada_oficios_vista')) window.setTimeout(() => alHablar('llegada_oficios'), 600)
        return
      }
      void (consultaEvaluacion.current ?? Promise.resolve(null)).then((e) => {
        const sinPrologo = !narrativa.leerVariable('prologo_visto')
        if (e && e.momento === 'inicio' && sinPrologo) {
          prologoTrasEvaluacion.current = true
          abrirEvaluacion(e)
        } else if (sinPrologo) {
          alHablar('prologo')
        } else if (e && e.momento !== 'inicio') {
          window.setTimeout(() => {
            if (!dialogoAbierto.current) abrirEvaluacion(e)
          }, 1500)
        }
      })
    }

    const alOcultarse = () => {
      if (document.visibilityState === 'hidden') guardarPosicion()
    }

    EventBus.on('posicion', alMoverse)
    EventBus.on('hablar', alHablar)
    EventBus.on('faro-encendido', alEncenderFaro)
    EventBus.on('escena-lista', alEscenaLista)
    document.addEventListener('visibilitychange', alOcultarse)
    const intervalo = window.setInterval(guardarPosicion, GUARDADO_POSICION_MS)

    return () => {
      guardarPosicion()
      EventBus.off('posicion', alMoverse)
      EventBus.off('hablar', alHablar)
      EventBus.off('faro-encendido', alEncenderFaro)
      EventBus.off('escena-lista', alEscenaLista)
      document.removeEventListener('visibilitychange', alOcultarse)
      window.clearInterval(intervalo)
    }
  }, [actual, guardar, mostrarPaso, narrativa, abrirEvaluacion])

  return (
    <div className="app">
      <header className="hud">
        <strong className="hud-titulo">Proyéctate</strong>
        <span>
          Faros<span className="hud-largo"> encendidos</span>: {faros} / 7
        </span>
        <span className="hud-usuario">
          <span className="hud-nombre">{nombre}</span>
          {puedePantallaCompleta && (
            <button className="solo-tactil" onClick={alternarPantallaCompleta} aria-label="Pantalla completa">
              ⛶
            </button>
          )}
          <button onClick={abrirDiario} className={revisionPendiente ? 'con-aviso' : undefined}>
            Diario
          </button>
          <button onClick={abrirBitacora}>Bitácora</button>
          <button onClick={onEditarPersonaje}>Personaje</button>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </span>
      </header>
      <div className="escenario">
        <PhaserGame avatar={avatar} partida={partida} resueltos={resueltos} />
        {insignia && (
          <div className="insignia-toast" role="status">
            <span className="insignia-medalla">★</span>
            <span>
              <small>Nueva insignia</small>
              <strong>{insignia}</strong>
            </span>
          </div>
        )}
        {dialogo && (
          <DialogoPanel
            key={dialogo.id}
            paso={dialogo.paso}
            onElegir={elegir}
            onCerrar={cerrarDialogo}
          />
        )}
      </div>
      <p className="mensaje">{mensaje}</p>
      <MensajesAcompanamiento />

      {/* En el teléfono en vertical: sugerir girarlo */}
      {!seguirEnVertical && (
        <div className="girar" role="dialog" aria-label="Gira tu teléfono">
          <div className="girar-telefono" aria-hidden="true" />
          <h2>Gira tu teléfono</h2>
          <p>Proyéctate se disfruta mejor en horizontal.</p>
          {puedePantallaCompleta && (
            <button className="creador-guardar" onClick={() => void alternarPantallaCompleta()}>
              Jugar en pantalla completa
            </button>
          )}
          <button className="girar-seguir" onClick={() => setSeguirEnVertical(true)}>
            Seguir en vertical
          </button>
        </div>
      )}

      {diarioAbierto && (
        <Diario
          desbloqueado={faros > 0}
          onCerrar={cerrarDiario}
          onInsignia={otorgarInsigniaVisible}
          onCambio={() => void revisarPendientes()}
        />
      )}

      {taller && <TallerOficio taller={taller} onTerminar={terminarTaller} />}
      {evaluacion && <Cuestionario evaluacion={evaluacion} onCerrar={cerrarEvaluacion} />}
      {apoyo && <PantallaApoyo nivel={apoyo} onCerrar={cerrarApoyo} />}

      {bitacoraAbierta && (
        <Bitacora
          userId={session.user.id}
          nombre={nombre}
          leer={(variable) => narrativa.leerVariable(variable)}
          faros={faros}
          onCerrar={cerrarBitacora}
        />
      )}
    </div>
  )
}
