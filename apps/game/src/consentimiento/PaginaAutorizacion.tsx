import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { CONTACTO_PROYECTO, QUE_DATOS, QUE_ES, SEGURIDAD, SUS_DERECHOS, USO_TELEFONO } from './legal'

type Etapa = 'cargando' | 'invalido' | 'respondido' | 'formulario' | 'enviado'

const RELACIONES = ['Madre', 'Padre', 'Tutor o tutora legal', 'Otro familiar a cargo']

// Página pública que abre el tutor desde el enlace (no necesita cuenta)
export function PaginaAutorizacion() {
  const token = new URLSearchParams(window.location.search).get('t') ?? ''
  const [etapa, setEtapa] = useState<Etapa>('cargando')
  const [nombreJoven, setNombreJoven] = useState('')
  const [resultado, setResultado] = useState<'aceptado' | 'rechazado' | null>(null)
  const [nombre, setNombre] = useState('')
  const [relacion, setRelacion] = useState(RELACIONES[0])
  const [telefono, setTelefono] = useState('')
  const [declara, setDeclara] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setEtapa('invalido')
      return
    }
    supabase.rpc('ver_consentimiento', { p_token: token }).then(({ data, error }) => {
      const fila = Array.isArray(data) ? data[0] : null
      if (error || !fila) {
        setEtapa('invalido')
        return
      }
      setNombreJoven(fila.nombre as string)
      if (fila.estado !== 'pendiente') {
        setResultado(fila.estado as 'aceptado' | 'rechazado')
        setEtapa('respondido')
      } else {
        setEtapa('formulario')
      }
    })
  }, [token])

  async function responder(acepta: boolean, e?: FormEvent) {
    e?.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe tu nombre completo.')
    if (acepta && telefono.replace(/\D/g, '').length < 10) {
      return setError('Escribe un teléfono de contacto válido (10 dígitos).')
    }
    if (acepta && !declara) return setError('Marca la casilla de declaración para poder autorizar.')

    setEnviando(true)
    const { data, error } = await supabase.rpc('responder_consentimiento', {
      p_token: token,
      p_nombre: nombre.trim(),
      p_relacion: relacion,
      p_telefono: telefono,
      p_acepta: acepta,
    })
    setEnviando(false)
    if (error) {
      setError('No pudimos registrar tu respuesta. Es posible que el enlace ya se haya usado.')
      return
    }
    setResultado(data as 'aceptado' | 'rechazado')
    setEtapa('enviado')
  }

  return (
    <div className="auth autorizacion">
      <div className="auth-card autorizacion-card">
        <h1>Horizonte</h1>
        <p className="auth-sub">Autorización para madres, padres y tutores</p>

        {etapa === 'cargando' && <p>Cargando…</p>}

        {etapa === 'invalido' && (
          <p className="auth-error">
            Este enlace no es válido. Pídele al joven que genere uno nuevo desde el juego.
          </p>
        )}

        {(etapa === 'respondido' || etapa === 'enviado') && (
          <p className={resultado === 'aceptado' ? 'auth-aviso' : 'auth-nota'}>
            {resultado === 'aceptado'
              ? `¡Gracias! ${nombreJoven} ya puede usar Horizonte.`
              : `Registramos que no autorizas el uso de Horizonte para ${nombreJoven}. Gracias por responder.`}
          </p>
        )}

        {etapa === 'formulario' && (
          <form onSubmit={(e) => void responder(true, e)}>
            <p>
              <strong>{nombreJoven}</strong> quiere usar Horizonte y, por ser menor de edad, necesita tu
              autorización.
            </p>

            <h2>¿Qué es Horizonte?</h2>
            <ul>
              {QUE_ES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h2>¿Qué datos se guardan?</h2>
            <ul>
              {QUE_DATOS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h2>Su seguridad</h2>
            <ul>
              {SEGURIDAD.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h2>Tus derechos</h2>
            <ul>
              {SUS_DERECHOS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {CONTACTO_PROYECTO && <p>Para preguntas o para retirar la autorización: {CONTACTO_PROYECTO}</p>}

            <label>
              Tu nombre completo
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} />
            </label>
            <label>
              Tu relación con {nombreJoven}
              <select value={relacion} onChange={(e) => setRelacion(e.target.value)}>
                {RELACIONES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Teléfono de contacto
              <input
                type="tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="809-000-0000"
                maxLength={20}
              />
              <small className="autorizacion-ayuda">{USO_TELEFONO}</small>
            </label>
            <label className="autorizacion-declara">
              <input type="checkbox" checked={declara} onChange={(e) => setDeclara(e.target.checked)} />
              <span>
                Declaro que soy madre, padre o tutor legal de {nombreJoven} y autorizo que use Horizonte
                en las condiciones descritas.
              </span>
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Autorizo'}
            </button>
            <button
              type="button"
              className="auth-cambiar"
              disabled={enviando}
              onClick={() => void responder(false)}
            >
              No autorizo
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
