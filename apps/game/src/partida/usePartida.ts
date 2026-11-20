import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { escribirCopia, leerCopia } from '../lib/copiaLocal'
import { PARTIDA_NUEVA } from './tipos'
import type { Partida, Posicion } from './tipos'

// Copia de la partida guardada en el dispositivo
interface CopiaPartida {
  partida: Partida
  actualizada: string // fecha del último cambio
  pendiente: boolean // true = todavía no se subió a Supabase
}

// Carga la partida al entrar y la guarda cuando cambia.
// Primero se guarda en el dispositivo y luego se sube a Supabase; si no hay
// conexión, queda pendiente y se sube sola cuando vuelve la señal.
// La partida inicial no cambia después de cargarse, para no reiniciar el juego
// cada vez que se guarda; los cambios se acumulan en una referencia.
export function usePartida(userId: string) {
  const [partidaInicial, setPartidaInicial] = useState<Partida | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const actual = useRef<Partida>(PARTIDA_NUEVA)
  const clave = `horizonte:partida:${userId}`

  const subir = useCallback(
    async (partida: Partida, fecha: string) => {
      const { error } = await supabase.from('game_saves').upsert({
        profile_id: userId,
        region: partida.region,
        faros_encendidos: partida.faros,
        posicion: partida.posicion,
        narrativa: partida.narrativa,
        updated_at: fecha,
      })
      return !error
    },
    [userId]
  )

  // Sube la copia local si quedó pendiente
  const sincronizar = useCallback(async () => {
    const copia = leerCopia<CopiaPartida>(clave)
    if (!copia?.pendiente) return
    if (await subir(copia.partida, copia.actualizada)) {
      const ultima = leerCopia<CopiaPartida>(clave)
      // Solo se marca como subida si nadie la cambió mientras tanto
      if (ultima && ultima.actualizada === copia.actualizada) {
        escribirCopia(clave, { ...ultima, pendiente: false })
      }
    }
  }, [clave, subir])

  useEffect(() => {
    let activo = true

    const usar = (partida: Partida) => {
      actual.current = partida
      setPartidaInicial(partida)
      setError(false)
    }

    supabase
      .from('game_saves')
      .select('region, faros_encendidos, posicion, narrativa, updated_at')
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data, error: fallo }) => {
        if (!activo) return
        const copia = leerCopia<CopiaPartida>(clave)

        // Sin conexión: se usa la copia del dispositivo, si existe
        if (fallo) {
          if (copia) usar(copia.partida)
          else setError(true)
          return
        }

        // La copia local tiene cambios más nuevos que no se subieron
        const fechaServidor = data?.updated_at ? Date.parse(data.updated_at as string) : 0
        if (copia?.pendiente && Date.parse(copia.actualizada) > fechaServidor) {
          usar(copia.partida)
          void sincronizar()
          return
        }

        const partida: Partida = data
          ? {
              region: data.region as string,
              faros: (data.faros_encendidos as string[]) ?? [],
              posicion: (data.posicion as Posicion | null) ?? null,
              narrativa: (data.narrativa as string | null) ?? null,
            }
          : PARTIDA_NUEVA
        escribirCopia(clave, {
          partida,
          actualizada: (data?.updated_at as string) ?? new Date(0).toISOString(),
          pendiente: false,
        })
        usar(partida)
      })

    return () => {
      activo = false
    }
  }, [userId, clave, sincronizar, intento])

  // Cuando vuelve la conexión, sube lo pendiente
  useEffect(() => {
    window.addEventListener('online', sincronizar)
    return () => window.removeEventListener('online', sincronizar)
  }, [sincronizar])

  const guardar = useCallback(
    async (cambios: Partial<Partida>) => {
      actual.current = { ...actual.current, ...cambios }
      const partida = actual.current
      const fecha = new Date().toISOString()
      escribirCopia(clave, { partida, actualizada: fecha, pendiente: true })
      await sincronizar()
    },
    [clave, sincronizar]
  )

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return {
    partidaInicial,
    cargando: partidaInicial === null && !error,
    error,
    reintentar,
    guardar,
    actual,
  }
}
