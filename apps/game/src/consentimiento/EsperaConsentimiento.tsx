import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EstadoConsentimiento } from './useConsentimiento'

interface Props {
  userId: string
  nombre: string
  estado: EstadoConsentimiento
  onRevisar: () => void
}

const REVISAR_CADA_MS = 15000

// Pantalla para jóvenes de 15 a 17 años mientras su tutor no autoriza
export function EsperaConsentimiento({ userId, nombre, estado, onRevisar }: Props) {
  const [enlace, setEnlace] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')

  const enlaceDe = (token: string) => `${window.location.origin}/autorizacion?t=${token}`

  // Si ya hay una solicitud pendiente, recupera su enlace
  useEffect(() => {
    if (estado !== 'pendiente') return
    supabase
      .from('guardian_consents')
      .select('token')
      .eq('profile_id', userId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEnlace(enlaceDe(data.token as string))
      })
  }, [estado, userId])

  // Revisa sola cada cierto tiempo si el tutor ya respondió
  useEffect(() => {
    if (!enlace) return
    const intervalo = window.setInterval(onRevisar, REVISAR_CADA_MS)
    return () => window.clearInterval(intervalo)
  }, [enlace, onRevisar])

  const generar = useCallback(async () => {
    setGenerando(true)
    setError('')
    const { data, error } = await supabase
      .from('guardian_consents')
      .insert({ profile_id: userId })
      .select('token')
      .single()
    setGenerando(false)
    if (error || !data) {
      setError('No pudimos crear el enlace. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    setEnlace(enlaceDe(data.token as string))
  }, [userId])

  const mensaje = enlace
    ? `Hola, estoy usando Proyéctate, un juego para diseñar mi proyecto de vida. Como soy menor de edad, necesito tu autorización. Aquí puedes ver de qué se trata y autorizarme: ${enlace}`
    : ''

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Autorización para Proyéctate', text: mensaje })
        return
      } catch {
        // Si se cancela, no pasa nada
      }
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2500)
    } catch {
      setError('No se pudo copiar. Mantén presionado el enlace para copiarlo.')
    }
  }

  return (
    <div className="auth">
      <div className="auth-card consentimiento">
        <h1>¡Hola, {nombre}!</h1>

        {estado === 'rechazado' && !enlace && (
          <p className="auth-error">
            Tu madre, padre o tutor no autorizó el uso de Proyéctate. Si crees que fue un error,
            conversa con esa persona y genera un enlace nuevo.
          </p>
        )}

        <p>
          Como tienes menos de 18 años, antes de empezar tu aventura necesitamos que tu madre, padre o
          tutor autorice que uses Proyéctate.
        </p>

        {!enlace ? (
          <button className="creador-guardar" onClick={() => void generar()} disabled={generando}>
            {generando ? 'Creando enlace…' : 'Crear enlace de autorización'}
          </button>
        ) : (
          <>
            <ol className="consentimiento-pasos">
              <li>Envía este enlace a tu madre, padre o tutor.</li>
              <li>Esa persona lo abre, lee de qué se trata y te autoriza.</li>
              <li>Cuando lo haga, podrás empezar a jugar aquí mismo.</li>
            </ol>

            <p className="consentimiento-enlace">{enlace}</p>

            <div className="consentimiento-botones">
              <a
                className="creador-guardar consentimiento-whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar por WhatsApp
              </a>
              {'share' in navigator && (
                <button className="opcion" onClick={() => void compartir()}>
                  Compartir
                </button>
              )}
              <button className="opcion" onClick={() => void copiar()}>
                {copiado ? '¡Copiado!' : 'Copiar mensaje'}
              </button>
            </div>

            <button className="opcion" onClick={onRevisar}>
              Ya me autorizaron, revisar
            </button>
          </>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-cambiar" onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </div>
    </div>
  )
}
