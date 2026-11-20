import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  seccion: string
  inicial: string
  onRiesgo: (nivel: 'moderado' | 'alto') => void
}

// Espacio para que el joven escriba con sus propias palabras en cada página
export function NotaPagina({ seccion, inicial, onRiesgo }: Props) {
  const [texto, setTexto] = useState(inicial)
  const [guardado, setGuardado] = useState(inicial)
  const [estado, setEstado] = useState<'' | 'guardando' | 'guardado' | 'error'>('')

  async function guardar() {
    setEstado('guardando')
    const { data, error } = await supabase.rpc('guardar_nota', { p_seccion: seccion, p_texto: texto })
    if (error) {
      setEstado('error')
      return
    }
    setGuardado(texto)
    setEstado('guardado')
    window.setTimeout(() => setEstado(''), 2500)
    if (data === 'moderado' || data === 'alto') onRiesgo(data)
  }

  const cambio = texto !== guardado

  return (
    <div className="nota-pagina">
      <label>
        <span>Mis notas</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Si quieres, escribe aquí con tus propias palabras…"
        />
      </label>
      <div className="nota-acciones">
        {estado === 'guardado' && <span className="nota-estado">Guardado</span>}
        {estado === 'error' && <span className="nota-estado error">No se pudo guardar. Revisa tu conexión.</span>}
        {cambio && (
          <button className="opcion" onClick={() => void guardar()} disabled={estado === 'guardando'}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar nota'}
          </button>
        )}
      </div>
    </div>
  )
}
