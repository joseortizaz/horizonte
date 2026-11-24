import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Fila {
  momento: string
  dimension: string
  promedio: number | null
  respuestas: number
}

const MOMENTOS = [
  { id: 'inicio', nombre: 'Inicio' },
  { id: 'fin_acto1', nombre: 'Fin del Acto I' },
  { id: 'seguimiento', nombre: '4 semanas' },
]

const DIMENSIONES = [
  { id: 'claridad', nombre: 'Claridad de metas' },
  { id: 'autoconocimiento', nombre: 'Autoconocimiento' },
  { id: 'planificacion', nombre: 'Planificación' },
  { id: 'confianza', nombre: 'Confianza en el futuro' },
  { id: 'satisfaccion', nombre: 'Satisfacción con el juego' },
]

const MINIMO = 5

// Resultados del cuestionario del grupo: solo promedios, y solo con 5 respuestas o más
export function EvaluacionPanel({ grupoId }: { grupoId: string }) {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFilas(null)
    void supabase.rpc('evaluacion_grupo', { p_grupo: grupoId }).then(({ data, error }) => {
      if (error) setError('No pudimos cargar los resultados del cuestionario.')
      else setFilas((data ?? []) as Fila[])
    })
    void supabase.rpc('es_admin').then(({ data }) => setEsAdmin(data === true))
  }, [grupoId])

  const celda = (momento: string, dimension: string) => {
    const f = filas?.find((x) => x.momento === momento && x.dimension === dimension)
    if (!f || f.respuestas === 0) return <span className="panel-eval-vacio">—</span>
    if (f.promedio === null)
      return <span className="panel-eval-vacio" title={`Hacen falta ${MINIMO} respuestas`}>{f.respuestas} resp.</span>
    return (
      <span>
        <strong>{Number(f.promedio).toFixed(1)}</strong> <small>({f.respuestas})</small>
      </span>
    )
  }

  // Archivo CSV con código anónimo, una fila por joven y momento, una columna por ítem
  async function exportar() {
    setExportando(true)
    const [{ data: items }, { data: filasExp, error }] = await Promise.all([
      supabase.rpc('evaluacion_items'),
      supabase.rpc('evaluacion_exportar'),
    ])
    setExportando(false)
    if (error || !items || !filasExp) {
      setError('No se pudo exportar.')
      return
    }
    const ids = (items as { id: string }[]).map((i) => i.id)
    const comillas = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lineas = [
      ['codigo', 'grupo', 'centro', 'edad', 'momento', 'estado', 'fecha', ...ids].map(comillas).join(','),
      ...(filasExp as { codigo: string; grupo: string; centro: string; edad: number; momento: string; estado: string; fecha: string; respuestas: Record<string, unknown> | null }[]).map((f) =>
        [f.codigo, f.grupo, f.centro, f.edad, f.momento, f.estado, f.fecha, ...ids.map((id) => f.respuestas?.[id] ?? '')]
          .map(comillas)
          .join(',')
      ),
    ]
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = `proyectate-evaluacion-${new Date().toISOString().slice(0, 10)}.csv`
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  return (
    <section className="panel-evaluacion">
      <div className="panel-titulo-seccion">
        <h3>Cuestionario del programa</h3>
        {esAdmin && (
          <button className="opcion" disabled={exportando} onClick={() => void exportar()}>
            {exportando ? 'Preparando…' : 'Descargar todas las respuestas (CSV)'}
          </button>
        )}
      </div>
      {error && <p className="auth-error">{error}</p>}
      {filas === null ? (
        <p>Cargando…</p>
      ) : (
        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th>Dimensión (1 a 5)</th>
                {MOMENTOS.map((m) => (
                  <th key={m.id}>{m.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMENSIONES.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre}</td>
                  {MOMENTOS.map((m) => (
                    <td key={m.id}>{celda(m.id, d.id)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="bitacora-nota">
        Promedio del grupo (entre paréntesis, cuántos jóvenes respondieron). Por privacidad, el promedio
        solo se muestra con {MINIMO} respuestas o más, y nunca las respuestas de cada joven.
      </p>
    </section>
  )
}
