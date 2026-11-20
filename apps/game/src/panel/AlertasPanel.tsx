import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMERGENCIAS, RECURSOS } from '../riesgo/recursos'

interface Alerta {
  id: string
  joven: string
  grupo: string | null
  nivel: 'moderado' | 'alto'
  origen: string
  texto: string | null
  estado: 'nueva' | 'atendida'
  creada: string
  atendida_por: string | null
  atendida_en: string | null
  nota_seguimiento: string | null
}

function fecha(valor: string) {
  return new Date(valor).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })
}

// Alertas de bienestar: señales de riesgo en lo que escriben los jóvenes
export function AlertasPanel() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [verAtendidas, setVerAtendidas] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mis_alertas')
    if (error) {
      setError('No pudimos cargar las alertas.')
      return
    }
    setAlertas((data ?? []) as Alerta[])
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function atender(id: string) {
    const nota = (notas[id] ?? '').trim()
    if (!nota) {
      setError('Escribe una breve nota de seguimiento antes de marcar la alerta como atendida.')
      return
    }
    setError('')
    const { error } = await supabase.rpc('atender_alerta', { p_id: id, p_nota: nota })
    if (error) {
      setError('No pudimos actualizar la alerta.')
      return
    }
    await cargar()
  }

  if (alertas === null) return null

  const nuevas = alertas.filter((a) => a.estado === 'nueva')
  const atendidas = alertas.filter((a) => a.estado === 'atendida')
  const visibles = verAtendidas ? alertas : nuevas

  return (
    <section className={nuevas.length > 0 ? 'alertas hay-nuevas' : 'alertas'}>
      <div className="panel-titulo-seccion">
        <h2>
          Alertas de bienestar{' '}
          {nuevas.length > 0 && <span className="alertas-contador">{nuevas.length} nueva(s)</span>}
        </h2>
        <button className="opcion" onClick={() => void cargar()}>
          Actualizar
        </button>
      </div>

      {nuevas.length === 0 && !verAtendidas && (
        <p className="bitacora-nota">No hay alertas nuevas.</p>
      )}

      {error && <p className="auth-error">{error}</p>}

      <div className="alertas-lista">
        {visibles.map((a) => (
          <article key={a.id} className={`alerta ${a.nivel} ${a.estado}`}>
            <header>
              <span className={`alerta-nivel ${a.nivel}`}>
                {a.nivel === 'alto' ? 'Riesgo alto' : 'Riesgo moderado'}
              </span>
              <strong>{a.joven}</strong>
              {a.grupo && <span className="alerta-grupo">{a.grupo}</span>}
              <span className="alerta-fecha">{fecha(a.creada)}</span>
            </header>

            {a.texto ? (
              <blockquote>{a.texto}</blockquote>
            ) : (
              <p className="bitacora-nota">
                Por privacidad, el texto de las alertas de riesgo moderado no se muestra. Conviene un
                acercamiento cuidadoso para saber cómo está.
              </p>
            )}

            {a.estado === 'nueva' ? (
              <div className="alerta-atender">
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="Nota de seguimiento: qué se hizo (contacto con el joven, con la familia, referimiento…)"
                  value={notas[a.id] ?? ''}
                  onChange={(e) => setNotas((n) => ({ ...n, [a.id]: e.target.value }))}
                />
                <button className="creador-guardar" onClick={() => void atender(a.id)}>
                  Marcar como atendida
                </button>
              </div>
            ) : (
              <p className="alerta-seguimiento">
                Atendida por {a.atendida_por ?? 'alguien del equipo'}
                {a.atendida_en ? ` el ${fecha(a.atendida_en)}` : ''}: {a.nota_seguimiento}
              </p>
            )}
          </article>
        ))}
      </div>

      {atendidas.length > 0 && (
        <button className="auth-cambiar" onClick={() => setVerAtendidas((v) => !v)}>
          {verAtendidas ? 'Ocultar alertas atendidas' : `Ver alertas atendidas (${atendidas.length})`}
        </button>
      )}

      {nuevas.some((a) => a.nivel === 'alto') && (
        <div className="alertas-guia">
          <strong>Ante una alerta de riesgo alto:</strong> contacta al joven el mismo día, valora el riesgo
          y, si hay peligro inmediato, activa el {EMERGENCIAS.nombre}. Recursos para referir:{' '}
          {RECURSOS.map((r) => r.nombre).join(' y ')}.
        </div>
      )}
    </section>
  )
}
