import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AVATAR_INICIAL } from './tipos'
import type { Apariencia, Avatar, Companero } from './tipos'

// Carga y guarda el personaje del usuario en Supabase
export function useAvatar(userId: string) {
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    supabase
      .from('avatars')
      .select('apariencia, companero')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        if (data) {
          setAvatar({
            apariencia: { ...AVATAR_INICIAL.apariencia, ...(data.apariencia as Partial<Apariencia>) },
            companero: data.companero as Companero,
          })
        }
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [userId])

  async function guardar(nuevo: Avatar) {
    const { error } = await supabase.from('avatars').upsert({
      profile_id: userId,
      apariencia: nuevo.apariencia,
      companero: nuevo.companero,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    setAvatar(nuevo)
  }

  return { avatar, cargando, guardar }
}
