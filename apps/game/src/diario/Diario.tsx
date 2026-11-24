import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PantallaApoyo } from '../riesgo/PantallaApoyo'
import { NuevaRuta } from './NuevaRuta'
import { useDiario } from './useDiario'
import { AVANCES, nombreArea } from './tipos'
import type { Meta } from './tipos'

interface Props {
  desbloqueado: boolean
  onCerrar: () => void
  onInsignia: (cualidad: string) => void
  onCambio: () => void
}

function fechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Una ruta con su revisión de esta semana
function TarjetaRuta({ meta, onRevisada, onApoyo }: {
  meta: Meta
  onRevisada: (insignia: boolean) => Promise<void>
  onApoyo: (nivel: 'moderado' | 'alto') => void
}) {
  const [avance, setAvance] = useState<number | null>(meta.revision_semana?.avance ?? null)
  const [nota, setNota] = useState(meta.revision_semana?.nota ?? '')
  const [editando, setEditando] = useState(!meta.revision_semana)
  const [verPlan, setVerPlan] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const activa = meta.estado === 'activa'

  async function guardar() {
    if (avance === null) return
    setGuardando(true)
    setError('')
    const { data, error } = await supabase.rpc('revisar_meta', { p_meta: meta.id, p_avance: avance, p_nota: nota })
    setGuardando(false)
    if (error) {
      setError('No pudimos guardar tu revisión. Revisa tu conexión.')
      return
    }
    const r = data as { nivel: string; insignia: boolean }
    setEditando(false)
    if (r.nivel === 'moderado' || r.nivel === 'alto') onApoyo(r.nivel)
    await onRevisada(r.insignia)
  }

  async function cambiarEstado(estado: string) {
    const { error } = await supabase.rpc('cambiar_estado_meta', { p_id: meta.id, p_estado: estado })
    if (error) {
      setError(error.message.includes('3 rutas') ? 'Ya tienes 3 rutas activas.' : 'No se pudo actualizar la ruta.')
      return
    }
    await onRevisada(false)
  }

  return (
    <article className={`ruta ${meta.estado}`}>
      <header>
        <span className="ruta-area">{nombreArea(meta.area)}</span>
        {meta.fecha_objetivo && <span className="ruta-fecha">Para el {fechaCorta(meta.fecha_objetivo)}</span>}
        {meta.estado === 'lograda' && <span className="ruta-lograda">Lograda</span>}
        {meta.estado === 'pausada' && <span className="ruta-pausada">En pausa</span>}
      </header>
      <h3>{meta.deseo}</h3>

      {meta.historial.length > 0 && (
        <div className="ruta-historial" aria-label="Avance de las últimas semanas">
          {meta.historial.map((h) => (
            <span key={h.semana} title={`Semana del ${fechaCorta(h.semana)}`} className={`punto avance-${h.avance}`} />
          ))}
          <small>últimas semanas</small>
        </div>
      )}

      <button className="auth-cambiar ruta-ver-plan" onClick={() => setVerPlan((v) => !v)}>
        {verPlan ? 'Ocultar mi plan' : 'Ver mi plan'}
      </button>
      {verPlan && (
        <dl className="ruta-plan">
          <dt>Cuando lo logre</dt>
          <dd>{meta.resultado}</dd>
          <dt>Lo que podría frenarme</dt>
          <dd>{meta.obstaculo}</dd>
          <dt>Mi plan</dt>
          <dd>{meta.plan}</dd>
        </dl>
      )}

      {activa &&
        (editando ? (
          <div className="ruta-revision">
            <p className="ruta-pregunta">Esta semana, ¿cómo te fue con esta ruta?</p>
            <div className="ruta-avances">
              {AVANCES.map((a) => (
                <button
                  key={a.valor}
                  className={avance === a.valor ? 'opcion activa' : 'opcion'}
                  onClick={() => setAvance(a.valor)}
                >
                  <span aria-hidden="true">{a.simbolo}</span> {a.nombre}
                </button>
              ))}
            </div>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="¿Qué pasó? ¿Qué te ayudó o qué te frenó? (opcional)"
            />
            <div className="nota-acciones">
              <button className="creador-guardar" disabled={avance === null || guardando} onClick={() => void guardar()}>
                {guardando ? 'Guardando…' : 'Guardar revisión'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ruta-hecha">
            <span>
              Esta semana: <strong>{AVANCES.find((a) => a.valor === avance)?.nombre}</strong>
            </span>
            <button className="auth-cambiar" onClick={() => setEditando(true)}>
              Cambiar
            </button>
          </div>
        ))}

      <div className="ruta-acciones">
        {activa && avance === 3 && (
          <button className="opcion" onClick={() => void cambiarEstado('lograda')}>
            Marcar ruta como lograda
          </button>
        )}
        {activa && (
          <button className="auth-cambiar" onClick={() => void cambiarEstado('pausada')}>
            Pausar
          </button>
        )}
        {meta.estado === 'pausada' && (
          <button className="auth-cambiar" onClick={() => void cambiarEstado('activa')}>
            Retomar
          </button>
        )}
      </div>

      {error && <p className="auth-error">{error}</p>}
    </article>
  )
}

// Interruptor del recordatorio semanal por correo
function Recordatorios() {
  const [activo, setActivo] = useState<boolean | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: perfil } = await supabase.from('profiles').select('recordatorios').eq('id', data.user.id).single()
      if (vivo && perfil) setActivo((perfil as { recordatorios: boolean }).recordatorios)
    })
    return () => {
      vivo = false
    }
  }, [])

  async function cambiar(valor: boolean) {
    const anterior = activo
    setActivo(valor)
    setError(false)
    const { data } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').update({ recordatorios: valor }).eq('id', data.user?.id ?? '')
    if (error) {
      setActivo(anterior)
      setError(true)
    }
  }

  if (activo === null) return null
  return (
    <section className="diario-recordatorio">
      <label>
        <input type="checkbox" checked={activo} onChange={(e) => void cambiar(e.target.checked)} />
        Recordarme por correo los sábados si tengo rutas sin revisar
      </label>
      {error && <p className="auth-error">No se pudo guardar el cambio. Revisa tu conexión.</p>}
    </section>
  )
}

export function Diario({ desbloqueado, onCerrar, onInsignia, onCambio }: Props) {
  const { datos, error, recargar } = useDiario()
  const [trazando, setTrazando] = useState(false)
  const [apoyo, setApoyo] = useState<'moderado' | 'alto' | null>(null)
  const [verAnteriores, setVerAnteriores] = useState(false)

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !apoyo && !trazando) onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar, apoyo, trazando])

  const actualizar = async (insignia: boolean) => {
    await recargar()
    onCambio()
    if (insignia) onInsignia('perseverancia')
  }

  const activas = datos?.metas.filter((m) => m.estado === 'activa') ?? []
  const otras = datos?.metas.filter((m) => m.estado !== 'activa') ?? []

  return (
    <div className="bitacora-fondo" role="dialog" aria-label="Diario de Navegación">
      <article className="bitacora diario">
        <header className="bitacora-cabecera">
          <div>
            <p className="bitacora-antetitulo">Tu brújula</p>
            <h1>Diario de Navegación</h1>
          </div>
          <div className="bitacora-acciones">
            <button className="creador-guardar" onClick={onCerrar}>
              Volver al juego
            </button>
          </div>
        </header>

        {!desbloqueado ? (
          <section className="diario-bloqueado">
            <p>Tu brújula todavía está en blanco.</p>
            <p className="bitacora-nota">
              Enciende el Faro de las Raíces para que la aguja empiece a moverse. Entonces podrás trazar tus
              primeras rutas: las metas que quieres alcanzar en tu vida real.
            </p>
          </section>
        ) : error ? (
          <p className="auth-error">No pudimos cargar tu diario. Revisa tu conexión e inténtalo de nuevo.</p>
        ) : !datos ? (
          <p>Cargando…</p>
        ) : trazando ? (
          <NuevaRuta
            onCancelar={() => setTrazando(false)}
            onGuardada={async (nivel) => {
              setTrazando(false)
              if (nivel === 'moderado' || nivel === 'alto') setApoyo(nivel)
              await actualizar(false)
            }}
          />
        ) : (
          <>
            <section className="bitacora-progreso diario-progreso">
              <div>
                <strong>{activas.length} / 3</strong>
                <span>rutas activas</span>
              </div>
              <div>
                <strong>{datos.semanas_navegadas}</strong>
                <span>semanas navegadas</span>
              </div>
              <div>
                <strong>{datos.metas.filter((m) => m.estado === 'lograda').length}</strong>
                <span>rutas logradas</span>
              </div>
            </section>

            <p className="bitacora-privacidad">
              Cada semana, revisa cómo vas con tus rutas. No importa si una semana no avanzas: lo que cuenta es
              volver a mirar tu brújula. Tus notas son privadas; solo si escribes algo que haga pensar que tu
              seguridad está en riesgo, una persona adulta del equipo lo leerá para poder ayudarte.
            </p>

            {activas.length === 0 && (
              <p className="diario-vacio">
                Todavía no has trazado ninguna ruta. ¿Qué te gustaría lograr en los próximos meses?
              </p>
            )}

            <div className="rutas">
              {activas.map((m) => (
                <TarjetaRuta key={m.id} meta={m} onRevisada={actualizar} onApoyo={setApoyo} />
              ))}
            </div>

            {activas.length < 3 && (
              <button className="creador-guardar diario-nueva" onClick={() => setTrazando(true)}>
                + Trazar una nueva ruta
              </button>
            )}

            <Recordatorios />

            {otras.length > 0 && (
              <section className="diario-anteriores">
                <button className="auth-cambiar" onClick={() => setVerAnteriores((v) => !v)}>
                  {verAnteriores ? 'Ocultar rutas logradas y en pausa' : `Ver rutas logradas y en pausa (${otras.length})`}
                </button>
                {verAnteriores && (
                  <div className="rutas">
                    {otras.map((m) => (
                      <TarjetaRuta key={m.id} meta={m} onRevisada={actualizar} onApoyo={setApoyo} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </article>
      {apoyo && <PantallaApoyo nivel={apoyo} onCerrar={() => setApoyo(null)} />}
    </div>
  )
}
