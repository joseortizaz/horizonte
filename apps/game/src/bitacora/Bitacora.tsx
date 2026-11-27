import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { construirBitacora, NOMBRES_INSIGNIAS } from './contenido'
import type { LeerVariable } from './contenido'
import { MapaOficios } from '../oficios/MapaOficios'
import { UnirseAGrupo } from './UnirseAGrupo'
import { NotaPagina } from './NotaPagina'
import { PantallaApoyo } from '../riesgo/PantallaApoyo'

interface Props {
  userId: string
  nombre: string
  leer: LeerVariable
  faros: number
  onCerrar: () => void
}

interface Insignia {
  cualidad: string
  nivel: string
}

// La Bitácora: lo que el joven ha ido descubriendo de sí en el juego
export function Bitacora({ userId, nombre, leer, faros, onCerrar }: Props) {
  const [secciones] = useState(() => construirBitacora(leer))
  const [insignias, setInsignias] = useState<Insignia[]>([])
  const [notas, setNotas] = useState<Record<string, string> | null>(null)
  const [apoyo, setApoyo] = useState<'moderado' | 'alto' | null>(null)
  const recuerdos = Number(leer('recuerdos') ?? 0)
  const descubiertas = secciones.filter((s) => s.descubierta).length

  useEffect(() => {
    let activo = true
    supabase
      .from('insignias')
      .select('cualidad, nivel')
      .eq('profile_id', userId)
      .order('created_at')
      .then(({ data }) => {
        if (activo && data) setInsignias(data as Insignia[])
      })
    supabase
      .from('bitacora_notas')
      .select('seccion, texto')
      .eq('profile_id', userId)
      .then(({ data }) => {
        if (!activo) return
        const mapa: Record<string, string> = {}
        for (const fila of data ?? []) mapa[fila.seccion as string] = fila.texto as string
        setNotas(mapa)
      })

    return () => {
      activo = false
    }
  }, [userId])

  // Cerrar con Escape
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !apoyo) onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar, apoyo])

  return (
    <div className="bitacora-fondo" role="dialog" aria-label="Bitácora">
      <article className="bitacora">
        <header className="bitacora-cabecera">
          <div>
            <p className="bitacora-antetitulo">Bitácora de</p>
            <h1>{nombre}</h1>
          </div>
          <div className="bitacora-acciones">
            <button className="opcion" onClick={() => window.print()}>
              Imprimir o guardar PDF
            </button>
            <button className="creador-guardar" onClick={onCerrar}>
              Volver al juego
            </button>
          </div>
        </header>

        <section className="bitacora-progreso">
          <div>
            <strong>{descubiertas} / {secciones.length}</strong>
            <span>páginas descubiertas</span>
          </div>
          <div>
            <strong>{recuerdos} / 3</strong>
            <span>Recuerdos</span>
          </div>
          <div>
            <strong>{faros} / 7</strong>
            <span>faros encendidos</span>
          </div>
        </section>

        <p className="bitacora-privacidad">
          Tus notas son privadas: tu orientador no puede leerlas. Solo si escribes algo que nos haga pensar
          que tu seguridad está en riesgo, una persona adulta del equipo lo leerá para poder ayudarte.
        </p>

        <div className="bitacora-paginas">
          {secciones.map((s) =>
            s.descubierta ? (
              <section key={s.id} className="bitacora-pagina">
                <h2>{s.titulo}</h2>
                {s.parrafos.filter(Boolean).map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {s.etiquetas && s.etiquetas.length > 0 && (
                  <ul className="bitacora-etiquetas">
                    {s.etiquetas.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                {s.nota && <p className="bitacora-nota">{s.nota}</p>}
                {notas && (
                  <NotaPagina seccion={s.id} inicial={notas[s.id] ?? ''} onRiesgo={setApoyo} />
                )}
              </section>
            ) : (
              <section key={s.id} className="bitacora-pagina bloqueada">
                <h2>{s.titulo}</h2>
                <p>Esta página aún está en blanco.</p>
                <p className="bitacora-nota">Pista: {s.pista}</p>
              </section>
            )
          )}
        </div>

        <MapaOficios />

        <section className="bitacora-insignias">
          <h2>Mis insignias</h2>
          {insignias.length === 0 ? (
            <p className="bitacora-nota">
              Todavía no tienes insignias. Las ganarás con lo que hagas, no con respuestas correctas.
            </p>
          ) : (
            <ul>
              {insignias.map((i) => (
                <li key={`${i.cualidad}-${i.nivel}`} className={`insignia ${i.nivel}`}>
                  <span className="insignia-medalla">★</span>
                  <span>
                    <strong>{NOMBRES_INSIGNIAS[i.cualidad] ?? i.cualidad}</strong>
                    <small>{i.nivel}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <UnirseAGrupo />

        <p className="bitacora-pie">
          Esta Bitácora es tuya. Refleja lo que elegiste en el juego, no es un diagnóstico ni una
          evaluación. Puedes compartirla con quien tú decidas.
        </p>
      </article>
      {apoyo && <PantallaApoyo nivel={apoyo} onCerrar={() => setApoyo(null)} />}
    </div>
  )
}
