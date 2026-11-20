import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EventBus } from '../game/EventBus'

interface Mensaje {
  id: string
  autor: string
  texto: string
  enviado: string
}

// Muestra al joven los mensajes de su orientador, al entrar al juego
export function MensajesAcompanamiento() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])

  useEffect(() => {
    let activo = true
    supabase.rpc('mis_mensajes').then(({ data }) => {
      if (activo && data && data.length > 0) {
        setMensajes(data as Mensaje[])
        EventBus.emit('pausar')
      }
    })
    return () => {
      activo = false
    }
  }, [])

  const actual = mensajes[0]
  if (!actual) return null

  const cerrar = () => {
    void supabase.rpc('marcar_mensaje_leido', { p_id: actual.id })
    const restantes = mensajes.slice(1)
    setMensajes(restantes)
    if (restantes.length === 0) EventBus.emit('reanudar')
  }

  return (
    <div className="apoyo-fondo" role="dialog" aria-labelledby="mensaje-titulo">
      <div className="apoyo mensaje-orientador">
        <p className="bitacora-antetitulo">Mensaje de tu orientador</p>
        <h2 id="mensaje-titulo">{actual.autor}</h2>
        <p className="mensaje-texto">{actual.texto}</p>
        <button className="creador-guardar" onClick={cerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}
