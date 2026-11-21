import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DatosDiario } from './tipos'

export function useDiario() {
  const [datos, setDatos] = useState<DatosDiario | null>(null)
  const [error, setError] = useState(false)

  const recargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mi_diario')
    if (error || !data) {
      setError(true)
      return
    }
    setError(false)
    setDatos(data as DatosDiario)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  // ¿Hay alguna ruta activa sin revisar esta semana?
  const revisionPendiente =
    datos?.metas.some((m) => m.estado === 'activa' && !m.revision_semana) ?? false

  return { datos, error, recargar, revisionPendiente }
}
