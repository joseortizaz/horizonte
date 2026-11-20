import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

// Para quien no escribió el código de su centro al registrarse
export function UnirseAGrupo() {
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function unirse(e: FormEvent) {
    e.preventDefault()
    setMensaje('')
    setError('')
    if (!codigo.trim()) return
    const { data, error } = await supabase.rpc('unirme_a_grupo', { p_codigo: codigo.trim() })
    if (error) {
      setError('Ese código no existe. Revísalo con tu orientador.')
      return
    }
    setMensaje(`¡Listo! Ahora formas parte de ${data as string}.`)
    setCodigo('')
  }

  return (
    <section className="bitacora-grupo">
      <h2>¿Tu centro te dio un código?</h2>
      <p className="bitacora-nota">
        Al unirte, tu orientador podrá ver tu avance en el juego (no tus respuestas ni esta Bitácora).
      </p>
      <form onSubmit={(e) => void unirse(e)}>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Código"
          aria-label="Código del centro"
        />
        <button type="submit" className="opcion">
          Unirme
        </button>
      </form>
      {mensaje && <p className="auth-aviso">{mensaje}</p>}
      {error && <p className="auth-error">{error}</p>}
    </section>
  )
}
