// Edge Function: recordatorio semanal del Diario de Navegación.
// La llama la base de datos los sábados (tarea programada con pg_cron).
// Envía un correo a cada joven con rutas activas sin revisar esta semana.
// El correo NO muestra el contenido de sus rutas.
//
// Usa los mismos secretos que avisar-alerta:
//   RESEND_API_KEY, AVISOS_SECRETO, AVISOS_REMITENTE
// Opcional: APP_URL (por defecto https://proyectate.app)

import { createClient } from 'npm:@supabase/supabase-js@2'

interface Pendiente {
  profile_id: string
  correo: string
  nombre: string
  rutas: number
}

const escapar = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function correo(p: Pendiente, app: string) {
  const saludo = p.nombre ? `Hola, ${escapar(p.nombre.split(' ')[0])}:` : 'Hola:'
  const rutas = p.rutas === 1 ? 'una de tus rutas' : `${p.rutas} de tus rutas`
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #1c2833; line-height: 1.5;">
      <h2 style="color: #1b4f72; margin-bottom: 4px;">Tu brújula te espera</h2>
      <p>${saludo}</p>
      <p>Esta semana todavía no has revisado ${rutas} en tu <strong>Diario de Navegación</strong>.
         Te toma un par de minutos: entra, marca cómo te fue y, si quieres, escribe una nota.</p>
      <p>No importa si esta semana no avanzaste. Lo que cuenta es volver a mirar tu brújula.</p>
      <p><a href="${app}" style="display: inline-block; padding: 12px 20px; background: #1b4f72; color: #ffffff; border-radius: 8px; text-decoration: none;">Abrir Proyéctate</a></p>
      <p style="font-size: 13px; color: #5d6d7e;">Recibes este correo porque tienes rutas activas en Proyéctate.
         Puedes desactivar estos recordatorios desde tu Diario de Navegación.</p>
    </div>`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })
  if (req.headers.get('x-aviso-secreto') !== Deno.env.get('AVISOS_SECRETO')) {
    return new Response('No autorizado', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await supabase.rpc('recordatorios_pendientes')
  if (error) {
    console.error('Error al buscar pendientes:', error.message)
    return new Response('Error', { status: 500 })
  }

  const pendientes = (data ?? []) as Pendiente[]
  const app = Deno.env.get('APP_URL') ?? 'https://proyectate.app'
  let enviados = 0

  // Resend acepta hasta 100 correos por envío en lote
  for (let i = 0; i < pendientes.length; i += 100) {
    const lote = pendientes.slice(i, i + 100)
    const respuesta = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        lote.map((p) => ({
          from: Deno.env.get('AVISOS_REMITENTE'),
          to: [p.correo],
          subject: 'Tu Diario de Navegación te espera',
          html: correo(p, app),
        }))
      ),
    })
    if (!respuesta.ok) {
      console.error('Error de Resend:', await respuesta.text())
      continue // los de este lote se intentarán en la próxima ejecución
    }
    await supabase.rpc('marcar_recordatorios', { p_ids: lote.map((p) => p.profile_id) })
    enviados += lote.length
    if (i + 100 < pendientes.length) await new Promise((r) => setTimeout(r, 600))
  }

  console.log(`Recordatorios enviados: ${enviados} de ${pendientes.length}`)
  return new Response(JSON.stringify({ enviados, pendientes: pendientes.length }), { status: 200 })
})
