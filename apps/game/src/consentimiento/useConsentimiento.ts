import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { escribirCopia, leerCopia } from '../lib/copiaLocal'

export type EstadoConsentimiento =
  | 'no-requerido'
  | 'aceptado'
  | 'pendiente'
  | 'rechazado'
  | 'sin-solicitud'

// ¿Puede este usuario jugar? Los menores de 18 necesitan autorización de su tutor.
export function useConsentimiento(userId: string) {
  const [estado, setEstado] = useState<EstadoConsentimiento | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const clave = `horizonte:consentimiento:${userId}`

  useEffect(() => {
    let activo = true

    supabase.rpc('mi_estado_consentimiento').then(({ data, error: fallo }) => {
      if (!activo) return
      if (fallo || !data) {
        // Sin conexión: si ya estaba autorizado, se permite seguir jugando
        const copia = leerCopia<EstadoConsentimiento>(clave)
        if (copia) setEstado(copia)
        else setError(true)
        return
      }
      const nuevo = data as EstadoConsentimiento
      escribirCopia(clave, nuevo)
      setEstado(nuevo)
      setError(false)
    })

    return () => {
      activo = false
    }
  }, [clave, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  const puedeJugar = estado === 'no-requerido' || estado === 'aceptado'

  return { estado, puedeJugar, cargando: estado === null && !error, error, recargar }
}
