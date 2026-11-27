import { useState } from 'react'
import type { ReactElement } from 'react'
import { supabase } from '../lib/supabase'
import { cambiarVela } from '../game/estado'
import { Clavos } from './juegos/Clavos'
import { Series } from './juegos/Series'
import { Vela } from './juegos/Vela'
import { Escuela } from './juegos/Escuela'
import { Mercadito } from './juegos/Mercadito'
import { Carga } from './juegos/Carga'

export type Taller = 'realista' | 'investigador' | 'artistico' | 'social' | 'emprendedor' | 'convencional'

// Lo que devuelve cada minijuego al terminar
export interface ResultadoJuego {
  desempeno: number | null // 0 a 100 (null si no hay respuestas correctas, como en el diseño de la vela)
  extra?: Record<string, unknown>
}

export interface PropsJuego {
  onFin: (r: ResultadoJuego) => void
}

const TALLERES: Record<Taller, { titulo: string; mentor: string; Juego: (p: PropsJuego) => ReactElement }> = {
  realista: { titulo: 'El astillero', mentor: 'Don Fermín', Juego: Clavos },
  investigador: { titulo: 'El observatorio', mentor: 'Ana Luz', Juego: Series },
  artistico: { titulo: 'El taller de colores', mentor: 'Kiko', Juego: Vela },
  social: { titulo: 'La escuela', mentor: 'Doña Altagracia', Juego: Escuela },
  emprendedor: { titulo: 'El mercadito', mentor: 'Yaritza', Juego: Mercadito },
  convencional: { titulo: 'La capitanía', mentor: 'Ramón', Juego: Carga },
}

const DISFRUTE = ['Nada', 'Un poco', 'Bastante', 'Mucho']
const HABILIDAD = ['Me costó mucho', 'Me costó un poco', 'Me salió bien', 'Me salió muy bien']

interface Props {
  taller: Taller
  // disfrute = 1 a 4, o null si salió sin terminar
  onTerminar: (taller: Taller, disfrute: number | null) => void
}

export function TallerOficio({ taller, onTerminar }: Props) {
  const { titulo, mentor, Juego } = TALLERES[taller]
  const [resultado, setResultado] = useState<ResultadoJuego | null>(null)
  const [disfrute, setDisfrute] = useState<number | null>(null)
  const [habilidad, setHabilidad] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    if (!resultado || disfrute === null || habilidad === null) return
    setGuardando(true)
    setError('')
    const { error } = await supabase.rpc('guardar_taller', {
      p_taller: taller,
      p_disfrute: disfrute,
      p_habilidad: habilidad,
      p_desempeno: resultado.desempeno === null ? null : Math.round(resultado.desempeno),
      p_extra: resultado.extra ?? null,
    })
    setGuardando(false)
    if (error) {
      setError('No pudimos guardar tu resultado. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    const vela = (resultado.extra as { vela?: string[] } | undefined)?.vela
    if (vela) cambiarVela(vela)
    onTerminar(taller, disfrute)
  }

  return (
    <div className="bitacora-fondo" role="dialog" aria-label={titulo}>
      <article className="bitacora taller">
        <header className="taller-cabecera">
          <div>
            <p className="bitacora-antetitulo">Taller de {mentor}</p>
            <h1>{titulo}</h1>
          </div>
          {!resultado && (
            <button className="opcion" onClick={() => onTerminar(taller, null)}>
              Salir
            </button>
          )}
        </header>

        {!resultado ? (
          <Juego onFin={setResultado} />
        ) : (
          <section className="taller-reflexion">
            <h2>Antes de seguir, piensa un momento</h2>
            <p className="bitacora-nota">
              No hay respuestas correctas. Lo que disfrutas y lo que se te da bien no siempre coinciden, y las dos
              cosas cuentan.
            </p>
            <h3>¿Cuánto disfrutaste esta actividad?</h3>
            <div className="opciones taller-escala">
              {DISFRUTE.map((t, i) => (
                <button key={t} className={disfrute === i + 1 ? 'opcion activa' : 'opcion'} onClick={() => setDisfrute(i + 1)}>
                  {t}
                </button>
              ))}
            </div>
            <h3>¿Qué tan bien sientes que te salió?</h3>
            <div className="opciones taller-escala">
              {HABILIDAD.map((t, i) => (
                <button key={t} className={habilidad === i + 1 ? 'opcion activa' : 'opcion'} onClick={() => setHabilidad(i + 1)}>
                  {t}
                </button>
              ))}
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button
              className="creador-guardar"
              disabled={disfrute === null || habilidad === null || guardando}
              onClick={() => void guardar()}
            >
              {guardando ? 'Guardando…' : 'Continuar'}
            </button>
          </section>
        )}
      </article>
    </div>
  )
}
