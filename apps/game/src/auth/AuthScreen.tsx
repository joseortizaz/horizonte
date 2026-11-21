import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Modo = 'entrar' | 'registro'

const EDAD_MINIMA = 15

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nacimiento = new Date(`${fecha}T00:00:00`)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

function traducirError(mensaje: string) {
  if (mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (mensaje.includes('Email not confirmed')) return 'Primero confirma tu cuenta desde el correo que te enviamos.'
  if (mensaje.includes('already registered')) return 'Ya existe una cuenta con ese correo.'
  if (mensaje.includes('Password should be')) return 'La contraseña debe tener al menos 8 caracteres.'
  if (mensaje.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
  return 'No pudimos completar la acción. Inténtalo de nuevo.'
}

export function AuthScreen() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [nombre, setNombre] = useState('')
  const [nacimiento, setNacimiento] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  // Código del centro educativo (opcional). También puede venir en el enlace: ?codigo=ABC123
  const [codigo, setCodigo] = useState(
    () => new URLSearchParams(window.location.search).get('codigo')?.toUpperCase() ?? ''
  )
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoTelefono, setContactoTelefono] = useState('')
  const edad = nacimiento ? calcularEdad(nacimiento) : null
  const esAdulto = edad !== null && edad >= 18
  const esMenor = edad !== null && edad >= EDAD_MINIMA && edad < 18

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setAviso('')

    if (modo === 'registro') {
      if (!nombre.trim()) return setError('Escribe cómo quieres que te llamemos.')
      if (!nacimiento) return setError('Indica tu fecha de nacimiento.')
      if (edad !== null && edad < EDAD_MINIMA) {
        return setError(`Proyéctate es para personas de ${EDAD_MINIMA} años en adelante.`)
      }
      if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
      if (codigo.trim()) {
        const { data: grupo } = await supabase.rpc('validar_codigo_grupo', { p_codigo: codigo.trim() })
        if (!grupo) return setError('Ese código de centro no existe. Revísalo o déjalo en blanco.')
      }
    }

    setEnviando(true)

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
      if (error) setError(traducirError(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: clave,
        options: {
          data: {
            display_name: nombre.trim(),
            birth_date: nacimiento,
            codigo_grupo: codigo.trim().toUpperCase(),
            contacto_nombre: esAdulto ? contactoNombre.trim() : '',
            contacto_telefono: esAdulto ? contactoTelefono.trim() : '',
          },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) {
        setError(traducirError(error.message))
      } else if (!data.session) {
        setAviso('¡Listo! Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve para entrar.')
        setModo('entrar')
      }
    }

    setEnviando(false)
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={enviar}>
        <h1>Proyéctate</h1>
        <p className="auth-sub">
          {modo === 'entrar' ? 'Continúa tu travesía' : 'Comienza tu travesía'}
        </p>

        {modo === 'registro' && (
          <>
            <label>
              ¿Cómo quieres que te llamemos?
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
            </label>
            <label>
              Código de tu centro (opcional)
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="Si tu orientador te dio uno"
                autoCapitalize="characters"
              />
            </label>
            {esAdulto && (
              <fieldset className="auth-contacto">
                <legend>Una persona de confianza (opcional)</legend>
                <p className="auth-nota">
                  Solo la contactaríamos si tuviéramos una preocupación seria por tu seguridad.
                </p>
                <label>
                  Nombre y relación contigo
                  <input
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    placeholder="Ej.: Laura, mi hermana"
                    maxLength={120}
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    type="tel"
                    inputMode="tel"
                    value={contactoTelefono}
                    onChange={(e) => setContactoTelefono(e.target.value)}
                    placeholder="809-000-0000"
                    maxLength={20}
                  />
                </label>
              </fieldset>
            )}
            {esMenor && (
              <p className="auth-nota">
                Como tienes menos de 18 años, más adelante te pediremos la autorización de tu madre,
                padre o tutor.
              </p>
            )}
          </>
        )}

        <label>
          Correo electrónico
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </label>

        {error && <p className="auth-error">{error}</p>}
        {aviso && <p className="auth-aviso">{aviso}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}
        </button>

        <button
          type="button"
          className="auth-cambiar"
          onClick={() => {
            setModo(modo === 'entrar' ? 'registro' : 'entrar')
            setError('')
            setAviso('')
          }}
        >
          {modo === 'entrar' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}
