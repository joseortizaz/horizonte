import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PARTIDA_NUEVA } from './tipos'
import type { Partida, Posicion } from './tipos'

// Carga la partida al entrar y la guarda en Supabase cuando cambia.
// La partida inicial no cambia después de cargarse, para no reiniciar el juego
// cada vez que se guarda; los cambios se acumulan en una referencia.
export function usePartida(userId: string) {
  const [partidaInicial, setPartidaInicial] = useState<Partida | null>(null)
  const actual = useRef<Partida>(PARTIDA_NUEVA)

  useEffect(() => {
    let activo = true

    supabase
      .from('game_saves')
      .select('region, faros_encendidos, posicion, narrativa')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        const partida: Partida = data
          ? {
              region: data.region as string,
              faros: (data.faros_encendidos as string[]) ?? [],
              posicion: (data.posicion as Posicion | null) ?? null,
              narrativa: (data.narrativa as string | null) ?? null,
            }
          : PARTIDA_NUEVA
        actual.current = partida
        setPartidaInicial(partida)
      })

    return () => {
      activo = false
    }
  }, [userId])

  const guardar = useCallback(
    async (cambios: Partial<Partida>) => {
      actual.current = { ...actual.current, ...cambios }
      const p = actual.current
      const { error } = await supabase.from('game_saves').upsert({
        profile_id: userId,
        region: p.region,
        faros_encendidos: p.faros,
        posicion: p.posicion,
        narrativa: p.narrativa,
        updated_at: new Date().toISOString(),
      })
      if (error) console.warn('No se pudo guardar la partida:', error.message)
    },
    [userId]
  )

  return { partidaInicial, cargando: partidaInicial === null, guardar, actual }
}
