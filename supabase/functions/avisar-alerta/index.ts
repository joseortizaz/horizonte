// Edge Function: envía un correo a los orientadores y administradores
// cuando se crea una alerta de riesgo alto.
// El correo NO incluye el nombre del joven ni lo que escribió.
//
// Secretos necesarios (supabase secrets set ...):
//   RESEND_API_KEY     clave de Resend
//   AVISOS_SECRETO     la misma clave guardada en el Vault como 'avisos_secreto'
//   AVISOS_REMITENTE   p. ej. "Proyéctate <avisos@proyectate.app>"
//   PANEL_URL          p. ej. https://proyectate.app/orientador

import { createClient } from 'npm:@supabase/supabase-js@2'

const CATEGORIAS: Record<string, string> = {
  suicidio: 'Ideación suicida',
  autolesion: 'Autolesión',
  abuso: 'Posible abuso o maltrato',
  desesperanza: 'Desesperanza o malestar',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })

  // Solo la base de datos (que conoce el secreto) puede pedir avisos
  if (req.headers.get('x-aviso-secreto') !== Deno.env.get('AVISOS_SECRETO')) {
    return new Response('No autorizado', { status: 401 })
  }

  const { alerta_id } = await req.json().catch(() => ({}))
  if (!alerta_id) return new Response('Falta alerta_id', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [{ data: resumen }, { data: destinatarios }] = await Promise.all([
    supabase.rpc('resumen_alerta', { p_alerta: alerta_id }).single(),
    supabase.rpc('destinatarios_alerta', { p_alerta: alerta_id }),
  ])

  if (!resumen || !destinatarios || destinatarios.length === 0) {
    return new Response('Sin destinatarios', { status: 200 })
  }

  const r = resumen as { nivel: string; categoria: string | null; grupo: string | null }
  const categoria = CATEGORIAS[r.categoria ?? ''] ?? 'Señal de riesgo'
  const grupo = r.grupo ?? 'un joven sin grupo asignado'
  const panel = Deno.env.get('PANEL_URL') ?? ''

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #1c2833;">
      <h2 style="color: #922b21;">Nueva alerta de riesgo alto</h2>
      <p><strong>Tipo:</strong> ${categoria}<br/><strong>Grupo:</strong> ${grupo}</p>
      <p>Según el protocolo, esta alerta debe revisarse <strong>hoy mismo</strong>.</p>
      <p><a href="${panel}" style="display: inline-block; padding: 12px 20px; background: #1b4f72; color: #ffffff; border-radius: 8px; text-decoration: none;">Abrir el panel de orientadores</a></p>
      <p style="font-size: 13px; color: #5d6d7e;">Por privacidad, este correo no incluye el nombre del joven ni lo que escribió. Encontrarás los detalles en el panel.</p>
      <p style="font-size: 13px; color: #5d6d7e;">Si hay peligro inmediato, llama al 911.</p>
    </div>`

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('AVISOS_REMITENTE'),
      to: (destinatarios as { correo: string }[]).map((d) => d.correo),
      subject: `Proyéctate: alerta de riesgo alto (${categoria})`,
      html,
    }),
  })

  if (!respuesta.ok) {
    console.error('Error de Resend:', await respuesta.text())
    return new Response('No se pudo enviar el correo', { status: 502 })
  }

  return new Response('Aviso enviado', { status: 200 })
})
