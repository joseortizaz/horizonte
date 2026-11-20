import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMERGENCIAS, RECURSOS } from '../riesgo/recursos'

interface Accion {
  tipo: string
  detalle: string
  autor: string
  fecha: string
}

interface Alerta {
  id: string
  joven: string
  joven_correo: string | null
  menor_de_edad: boolean
  grupo: string | null
  nivel: 'moderado' | 'alto'
  categoria: string | null
  origen: string
  texto: string | null
  estado: 'nueva' | 'atendida'
  creada: string
  tutor_nombre: string | null
  tutor_relacion: string | null
  tutor_telefono: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  acciones: Accion[]
  atendida_por: string | null
  atendida_en: string | null
  nota_seguimiento: string | null
}

const CATEGORIAS: Record<string, string> = {
  suicidio: 'Ideación suicida',
  autolesion: 'Autolesión',
  abuso: 'Posible abuso o maltrato',
  desesperanza: 'Desesperanza o malestar',
}

const TIPOS_ACCION: Record<string, string> = {
  contacto_joven: 'Contacto con el joven',
  contacto_tutor: 'Contacto con el tutor',
  contacto_confianza: 'Contacto con la persona de confianza',
  mensaje_app: 'Mensaje en la app',
  referimiento: 'Referimiento a un profesional',
  ruta_proteccion: 'Activación de la ruta de protección',
  otro: 'Otra acción',
}

// Mismos textos que el servidor (texto_mensaje): el orientador elige uno
const PLANTILLAS = [
  { id: 1, texto: 'Me gustaría conversar contigo. ¿Podemos vernos mañana en el centro?' },
  { id: 2, texto: 'Quería saber cómo estás. Cuando puedas, búscame para conversar un rato.' },
  { id: 3, texto: 'Estoy aquí si necesitas hablar. Puedes buscarme cuando quieras.' },
]

function fecha(valor: string) {
  return new Date(valor).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })
}

// Número para enlaces tel: y WhatsApp (República Dominicana: código 1)
function numeroInternacional(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  return digitos.length === 10 ? `1${digitos}` : digitos
}

function FichaAlerta({ alerta, onCambio }: { alerta: Alerta; onCambio: () => Promise<void> }) {
  const [tipo, setTipo] = useState('contacto_joven')
  const [detalle, setDetalle] = useState('')
  const [plantilla, setPlantilla] = useState(1)
  const [notaCierre, setNotaCierre] = useState('')
  const [mostrarTutor, setMostrarTutor] = useState(alerta.categoria !== 'abuso')
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const a = alerta
  const abierta = a.estado === 'nueva'

  async function ejecutar(promesa: PromiseLike<{ error: unknown }>, exito: string) {
    setError('')
    setAviso('')
    const { error } = await promesa
    if (error) {
      setError('No se pudo completar la acción.')
      return false
    }
    setAviso(exito)
    await onCambio()
    return true
  }

  const registrar = async () => {
    if (!detalle.trim()) return setError('Describe brevemente la acción realizada.')
    const ok = await ejecutar(
      supabase.rpc('registrar_accion', { p_alerta: a.id, p_tipo: tipo, p_detalle: detalle.trim() }),
      'Acción registrada.'
    )
    if (ok) setDetalle('')
  }

  const enviarMensaje = () =>
    ejecutar(
      supabase.rpc('enviar_mensaje_acompanamiento', { p_alerta: a.id, p_plantilla: plantilla }),
      `Mensaje enviado. ${a.joven} lo verá al abrir Horizonte.`
    )

  const cerrar = async () => {
    if (!notaCierre.trim()) return setError('Escribe una nota de cierre antes de marcar la alerta como atendida.')
    await ejecutar(supabase.rpc('atender_alerta', { p_id: a.id, p_nota: notaCierre.trim() }), 'Alerta cerrada.')
  }

  // Al pulsar llamar o WhatsApp, se prepara el registro de la acción
  const prepararRegistro = (t: string, d: string) => {
    setTipo(t)
    setDetalle(d)
  }

  const mensajeTutor = a.tutor_nombre
    ? `Hola, ${a.tutor_nombre}. Le escribo del programa Horizonte. Me gustaría conversar con usted sobre ${a.joven}. ¿Cuándo podríamos hablar?`
    : ''

  return (
    <article className={`alerta ${a.nivel} ${a.estado}`}>
      <header>
        <span className={`alerta-nivel ${a.nivel}`}>{a.nivel === 'alto' ? 'Riesgo alto' : 'Riesgo moderado'}</span>
        {a.categoria && <span className="alerta-categoria">{CATEGORIAS[a.categoria] ?? a.categoria}</span>}
        <strong>{a.joven}</strong>
        {a.grupo && <span className="alerta-grupo">{a.grupo}</span>}
        <span className="alerta-fecha">{fecha(a.creada)}</span>
      </header>

      {a.texto ? (
        <blockquote>{a.texto}</blockquote>
      ) : (
        <p className="bitacora-nota">
          Por privacidad, el texto de las alertas de riesgo moderado no se muestra. Conviene un acercamiento
          cuidadoso para saber cómo está.
        </p>
      )}

      {a.categoria === 'abuso' && abierta && (
        <div className="alerta-abuso">
          <strong>Posible abuso o maltrato.</strong> La persona agresora podría ser alguien de la familia.
          No contactes al tutor sin antes valorar la situación. Prioriza la seguridad del joven y activa la
          ruta de protección que corresponda (CONANI o Fiscalía de Niños, Niñas y Adolescentes, según el
          protocolo de tu centro).
        </div>
      )}

      {/* Ficha de contacto */}
      <div className="alerta-contacto">
        <div>
          <span className="alerta-etiqueta">Joven</span>
          <strong>{a.joven}</strong>
          {a.joven_correo && (
            <a href={`mailto:${a.joven_correo}`} onClick={() => prepararRegistro('contacto_joven', 'Correo al joven')}>
              {a.joven_correo}
            </a>
          )}
        </div>

        {a.menor_de_edad && (
          <div>
            <span className="alerta-etiqueta">Tutor</span>
            {!a.tutor_nombre ? (
              <span className="bitacora-nota">Sin datos (autorización en papel o anterior al teléfono).</span>
            ) : !mostrarTutor ? (
              <button className="auth-cambiar" onClick={() => setMostrarTutor(true)}>
                Entiendo el riesgo, mostrar el contacto del tutor
              </button>
            ) : (
              <>
                <strong>
                  {a.tutor_nombre} <small>({a.tutor_relacion})</small>
                </strong>
                {a.tutor_telefono && (
                  <span className="alerta-botones">
                    <a
                      className="apoyo-boton"
                      href={`tel:+${numeroInternacional(a.tutor_telefono)}`}
                      onClick={() => prepararRegistro('contacto_tutor', `Llamada a ${a.tutor_nombre}`)}
                    >
                      Llamar
                    </a>
                    <a
                      className="apoyo-boton whatsapp"
                      href={`https://wa.me/${numeroInternacional(a.tutor_telefono)}?text=${encodeURIComponent(mensajeTutor)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => prepararRegistro('contacto_tutor', `WhatsApp a ${a.tutor_nombre}`)}
                    >
                      WhatsApp
                    </a>
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {!a.menor_de_edad && (
          <div>
            <span className="alerta-etiqueta">Persona de confianza</span>
            {a.contacto_nombre ? (
              <>
                <strong>{a.contacto_nombre}</strong>
                {a.contacto_telefono && (
                  <span className="alerta-botones">
                    <a
                      className="apoyo-boton"
                      href={`tel:+${numeroInternacional(a.contacto_telefono)}`}
                      onClick={() => prepararRegistro('contacto_confianza', `Llamada a ${a.contacto_nombre}`)}
                    >
                      Llamar
                    </a>
                  </span>
                )}
              </>
            ) : (
              <span className="bitacora-nota">No indicó una persona de confianza.</span>
            )}
          </div>
        )}
      </div>

      {/* Historial de acciones */}
      {a.acciones.length > 0 && (
        <ol className="alerta-acciones">
          {a.acciones.map((acc, i) => (
            <li key={i}>
              <strong>{TIPOS_ACCION[acc.tipo] ?? acc.tipo}</strong> · {acc.autor} · {fecha(acc.fecha)}
              {acc.detalle && <div>{acc.detalle}</div>}
            </li>
          ))}
        </ol>
      )}

      {abierta ? (
        <div className="alerta-gestion">
          <div className="alerta-bloque">
            <span className="alerta-etiqueta">Enviar un mensaje a {a.joven} en la app</span>
            <div className="alerta-fila">
              <select value={plantilla} onChange={(e) => setPlantilla(Number(e.target.value))}>
                {PLANTILLAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.texto}
                  </option>
                ))}
              </select>
              <button className="opcion" onClick={() => void enviarMensaje()}>
                Enviar
              </button>
            </div>
          </div>

          <div className="alerta-bloque">
            <span className="alerta-etiqueta">Registrar una acción</span>
            <div className="alerta-fila">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPOS_ACCION)
                  .filter(([clave]) => clave !== 'mensaje_app')
                  .map(([clave, nombre]) => (
                    <option key={clave} value={clave}>
                      {nombre}
                    </option>
                  ))}
              </select>
              <input
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Qué se hizo y con qué resultado"
                maxLength={1000}
              />
              <button className="opcion" onClick={() => void registrar()}>
                Registrar
              </button>
            </div>
          </div>

          <div className="alerta-bloque">
            <span className="alerta-etiqueta">Cerrar la alerta</span>
            <div className="alerta-fila">
              <input
                value={notaCierre}
                onChange={(e) => setNotaCierre(e.target.value)}
                placeholder="Resumen del seguimiento y situación actual"
                maxLength={1000}
              />
              <button className="creador-guardar" onClick={() => void cerrar()}>
                Marcar como atendida
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="alerta-seguimiento">
          Cerrada por {a.atendida_por ?? 'alguien del equipo'}
          {a.atendida_en ? ` el ${fecha(a.atendida_en)}` : ''}: {a.nota_seguimiento}
        </p>
      )}

      {aviso && <p className="auth-aviso">{aviso}</p>}
      {error && <p className="auth-error">{error}</p>}
    </article>
  )
}

// Alertas de bienestar: señales de riesgo en lo que escriben los jóvenes
export function AlertasPanel() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null)
  const [verAtendidas, setVerAtendidas] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mis_alertas')
    if (error) {
      setError('No pudimos cargar las alertas.')
      return
    }
    setError('')
    setAlertas((data ?? []) as Alerta[])
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (alertas === null) return error ? <p className="auth-error">{error}</p> : null

  const nuevas = alertas.filter((a) => a.estado === 'nueva')
  const atendidas = alertas.filter((a) => a.estado === 'atendida')
  const visibles = verAtendidas ? alertas : nuevas

  return (
    <section className={nuevas.length > 0 ? 'alertas hay-nuevas' : 'alertas'}>
      <div className="panel-titulo-seccion">
        <h2>
          Alertas de bienestar{' '}
          {nuevas.length > 0 && <span className="alertas-contador">{nuevas.length} nueva(s)</span>}
        </h2>
        <button className="opcion" onClick={() => void cargar()}>
          Actualizar
        </button>
      </div>

      {nuevas.length === 0 && !verAtendidas && <p className="bitacora-nota">No hay alertas nuevas.</p>}
      {error && <p className="auth-error">{error}</p>}

      {nuevas.some((a) => a.nivel === 'alto') && (
        <div className="alertas-guia">
          <strong>Ante una alerta de riesgo alto:</strong> contacta al joven el mismo día y valora el riesgo.
          Si hay peligro inmediato, llama al {EMERGENCIAS.nombre}. Para referir:{' '}
          {RECURSOS.map((r) => r.nombre).join(' y ')}. Registra cada paso en la alerta.
        </div>
      )}

      <div className="alertas-lista">
        {visibles.map((a) => (
          <FichaAlerta key={a.id} alerta={a} onCambio={cargar} />
        ))}
      </div>

      {atendidas.length > 0 && (
        <button className="auth-cambiar" onClick={() => setVerAtendidas((v) => !v)}>
          {verAtendidas ? 'Ocultar alertas cerradas' : `Ver alertas cerradas (${atendidas.length})`}
        </button>
      )}
    </section>
  )
}
