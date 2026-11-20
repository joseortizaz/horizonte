import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { escribirCopia, leerCopia } from '../lib/copiaLocal'
import { AVATAR_INICIAL } from './tipos'
import type { Apariencia, Avatar, Companero } from './tipos'

// Carga y guarda el personaje del usuario en Supabase.
// Guarda también una copia en el dispositivo para poder jugar sin conexión.
export function useAvatar(userId: string) {
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const clave = `horizonte:avatar:${userId}`

  useEffect(() => {
    let activo = true
    setCargando(true)

    supabase
      .from('avatars')
      .select('apariencia, companero')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data, error: fallo }) => {
        if (!activo) return

        if (fallo) {
          // Sin conexión: se usa la copia del dispositivo, si existe
          const copia = leerCopia<Avatar>(clave)
          if (copia) setAvatar(copia)
          else setError(true)
          setCargando(false)
          return
        }

        if (data) {
          const cargado: Avatar = {
            apariencia: { ...AVATAR_INICIAL.apariencia, ...(data.apariencia as Partial<Apariencia>) },
            companero: data.companero as Companero,
          }
          escribirCopia(clave, cargado)
          setAvatar(cargado)
        }
        setError(false)
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [userId, clave, intento])

  async function guardar(nuevo: Avatar) {
    const { error } = await supabase.from('avatars').upsert({
      profile_id: userId,
      apariencia: nuevo.apariencia,
      companero: nuevo.companero,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    escribirCopia(clave, nuevo)
    setAvatar(nuevo)
  }

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return { avatar, cargando, error, reintentar, guardar }
}
