import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ItemEvaluacion {
  id: string
  texto: string
  tipo: 'likert' | 'texto'
}

export interface EvaluacionPendiente {
  momento: 'inicio' | 'fin_acto1' | 'seguimiento'
  items: ItemEvaluacion[]
}

const ESCALA = [
  { valor: 1, texto: 'Nada de acuerdo' },
  { valor: 2, texto: 'Poco de acuerdo' },
  { valor: 3, texto: 'Más o menos' },
  { valor: 4, texto: 'Bastante de acuerdo' },
  { valor: 5, texto: 'Totalmente de acuerdo' },
]

const PRESENTACION: Record<EvaluacionPendiente['momento'], { titulo: string; texto: string }> = {
  inicio: {
    titulo: 'Antes de zarpar',
    texto:
      'Queremos saber cómo te ves hoy. Son frases cortas: dinos qué tan de acuerdo estás con cada una. No hay respuestas buenas ni malas.',
  },
  fin_acto1: {
    titulo: '¡Terminaste el Acto I!',
    texto:
      'Responde las mismas frases del principio y cuéntanos qué te pareció el juego. Te toma unos 3 minutos.',
  },
  seguimiento: {
    titulo: 'Un mes después',
    texto: 'Ha pasado un mes desde que encendiste el faro. ¿Cómo te ves hoy? Son las mismas frases cortas de antes.',
  },
}

interface Props {
  evaluacion: EvaluacionPendiente
  // nivel = riesgo detectado en el texto abierto (para mostrar la pantalla de apoyo)
  onCerrar: (nivel: string) => void
}

export function Cuestionario({ evaluacion, onCerrar }: Props) {
  const { momento, items } = evaluacion
  const [paso, setPaso] = useState(-1) // -1 = presentación; items.length = enviar
  const [respuestas, setRespuestas] = useState<Record<string, number | string>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [terminado, setTerminado] = useState<string | null>(null)
  const p = PRESENTACION[momento]
  const item = items[paso]

  async function posponer(definitivo: boolean) {
    await supabase.rpc('posponer_evaluacion', { p_momento: momento, p_definitivo: definitivo })
    onCerrar('ninguno')
  }

  async function enviar() {
    setEnviando(true)
    setError('')
    const { data, error } = await supabase.rpc('responder_evaluacion', { p_momento: momento, p_respuestas: respuestas })
    setEnviando(false)
    if (error) {
      setError('No pudimos guardar tus respuestas. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    setTerminado((data as string) ?? 'ninguno')
  }

  function elegir(valor: number) {
    setRespuestas((r) => ({ ...r, [item.id]: valor }))
    setPaso((n) => n + 1)
  }

  return (
    <div className="bitacora-fondo" role="dialog" aria-label="Cuestionario">
      <article className="bitacora cuestionario">
        {terminado !== null ? (
          <section className="cuestionario-centro">
            <h2>¡Gracias!</h2>
            <p>Tus respuestas nos ayudan a que Proyéctate sea mejor para otros jóvenes.</p>
            <button className="creador-guardar" onClick={() => onCerrar(terminado)}>
              Seguir jugando
            </button>
          </section>
        ) : paso === -1 ? (
          <section className="cuestionario-centro">
            <p className="bitacora-antetitulo">Cuestionario breve</p>
            <h2>{p.titulo}</h2>
            <p>{p.texto}</p>
            <p className="bitacora-nota">
              Es voluntario. Tu orientador no verá tus respuestas, solo promedios de todo el grupo.
            </p>
            <div className="cuestionario-acciones">
              <button className="creador-guardar" onClick={() => setPaso(0)}>
                Empezar
              </button>
              <button className="opcion" onClick={() => void posponer(false)}>
                Ahora no
              </button>
              <button className="auth-cambiar" onClick={() => void posponer(true)}>
                Prefiero no responder
              </button>
            </div>
          </section>
        ) : paso < items.length ? (
          <section className="cuestionario-centro">
            <div className="cuestionario-progreso" aria-hidden="true">
              <div style={{ width: `${(paso / items.length) * 100}%` }} />
            </div>
            <p className="bitacora-antetitulo">
              {paso + 1} de {items.length}
            </p>
            <h2 className="cuestionario-frase">{item.texto}</h2>
            {item.tipo === 'likert' ? (
              <div className="cuestionario-escala">
                {ESCALA.map((e) => (
                  <button
                    key={e.valor}
                    className={respuestas[item.id] === e.valor ? 'opcion activa' : 'opcion'}
                    onClick={() => elegir(e.valor)}
                  >
                    {e.texto}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <textarea
                  className="cuestionario-texto"
                  maxLength={1000}
                  rows={4}
                  value={(respuestas[item.id] as string) ?? ''}
                  onChange={(ev) => setRespuestas((r) => ({ ...r, [item.id]: ev.target.value }))}
                />
                <button className="creador-guardar" onClick={() => setPaso((n) => n + 1)}>
                  Continuar
                </button>
              </>
            )}
            {paso > 0 && (
              <button className="auth-cambiar" onClick={() => setPaso((n) => n - 1)}>
                ← Anterior
              </button>
            )}
          </section>
        ) : (
          <section className="cuestionario-centro">
            <h2>¿Enviamos tus respuestas?</h2>
            <p>Puedes volver atrás para cambiar alguna.</p>
            {error && <p className="auth-error">{error}</p>}
            <div className="cuestionario-acciones">
              <button className="creador-guardar" disabled={enviando} onClick={() => void enviar()}>
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
              <button className="auth-cambiar" onClick={() => setPaso((n) => n - 1)}>
                ← Anterior
              </button>
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
