import { useEffect, useState } from 'react'
import { avatarSvg, companeroSvg, svgADataUri } from './dibujo'
import { IMAGENES, generarAvatarIlustrado } from './ilustrado'
import type { AvatarIlustrado } from './ilustrado'
import {
  ACCESORIOS, ACCESORIOS_ILUSTRADO, AVATAR_INICIAL, COLORES_CABELLO, COLORES_ROPA, COMPANEROS, CUERPOS,
  ESTILOS, LENTES, MOVILIDAD, PEINADOS, PEINADOS_ILUSTRADO, TONOS_PIEL, avatarAleatorio,
} from './tipos'
import type { Apariencia, Avatar, Companero, Estilo } from './tipos'

function imagenCompanero(id: Companero) {
  return id === 'gota' ? IMAGENES.gota : svgADataUri(companeroSvg(id))
}

// Vista previa del personaje ilustrado (se recolorea en el navegador)
function useVistaIlustrada(a: Apariencia) {
  const [vista, setVista] = useState<AvatarIlustrado | null>(null)
  const clave = JSON.stringify(a)
  useEffect(() => {
    const ap = JSON.parse(clave) as Apariencia
    if (ap.estilo !== 'ilustrado') return
    let activo = true
    generarAvatarIlustrado(ap)
      .then((v) => activo && setVista(v))
      .catch(() => activo && setVista(null))
    return () => {
      activo = false
    }
  }, [clave])
  return vista
}

// Al cambiar de estilo, adapta las opciones que solo existen en uno de los dos
function conEstilo(a: Apariencia, estilo: Estilo): Apariencia {
  if (estilo === 'ilustrado') {
    const lentes = a.lentes || a.accesorio === 'lentes'
    return { ...a, estilo, lentes, accesorio: a.accesorio === 'lentes' ? 'ninguno' : a.accesorio }
  }
  return {
    ...a,
    estilo,
    peinado: a.peinado === 'rizado-largo' ? 'rizado' : a.peinado,
    accesorio: a.lentes && a.accesorio === 'ninguno' ? 'lentes' : a.accesorio,
  }
}

interface Props {
  inicial: Avatar | null
  onGuardar: (avatar: Avatar) => Promise<void>
  onCancelar?: () => void
}

function Muestras({ colores, valor, etiqueta, onElegir }: {
  colores: readonly string[]
  valor: string
  etiqueta: string
  onElegir: (color: string) => void
}) {
  return (
    <div className="muestras">
      {colores.map((color, i) => (
        <button
          key={color}
          type="button"
          className={color === valor ? 'muestra activa' : 'muestra'}
          style={{ background: color }}
          aria-label={`${etiqueta} ${i + 1}`}
          aria-pressed={color === valor}
          onClick={() => onElegir(color)}
        />
      ))}
    </div>
  )
}

function Opciones<T extends string>({ opciones, valor, onElegir }: {
  opciones: readonly { id: T; nombre: string }[]
  valor: T
  onElegir: (id: T) => void
}) {
  return (
    <div className="opciones">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          className={o.id === valor ? 'opcion activa' : 'opcion'}
          aria-pressed={o.id === valor}
          onClick={() => onElegir(o.id)}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

export function AvatarCreator({ inicial, onGuardar, onCancelar }: Props) {
  const [avatar, setAvatar] = useState<Avatar>(inicial ?? AVATAR_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const a = avatar.apariencia
  const ilustrado = a.estilo === 'ilustrado'
  const vistaIlustrada = useVistaIlustrada(a)

  function cambiar<K extends keyof Apariencia>(campo: K, valor: Apariencia[K]) {
    setAvatar((actual) => ({ ...actual, apariencia: { ...actual.apariencia, [campo]: valor } }))
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      await onGuardar(avatar)
    } catch {
      setError('No pudimos guardar tu personaje. Revisa tu conexión e inténtalo de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="creador">
      <div className="creador-card">
        <h1>Crea tu Navegante</h1>
        <p className="creador-sub">Así te verán en Proyéctate. Puedes cambiarlo cuando quieras.</p>

        <div className="creador-cuerpo">
          <div className="creador-vista">
            <div className="creador-escenario">
              {ilustrado ? (
                vistaIlustrada && (
                  <img
                    src={vistaIlustrada.url}
                    style={{ height: (vistaIlustrada.alto / vistaIlustrada.altoReferencia) * 210, width: 'auto' }}
                    alt="Vista previa de tu personaje"
                  />
                )
              ) : (
                <img src={svgADataUri(avatarSvg(a))} width={160} height={200} alt="Vista previa de tu personaje" />
              )}
              <img
                className="creador-companero"
                src={imagenCompanero(avatar.companero)}
                width={64}
                height={64}
                alt=""
              />
            </div>
            <button type="button" className="opcion" onClick={() => setAvatar(avatarAleatorio(a.estilo, a.movilidad))}>
              Sorpréndeme
            </button>
          </div>

          <div className="creador-opciones">
            <h3>Estilo de dibujo</h3>
            <Opciones
              opciones={ESTILOS}
              valor={a.estilo}
              onElegir={(id) => setAvatar((actual) => ({ ...actual, apariencia: conEstilo(actual.apariencia, id) }))}
            />

            {ilustrado && a.movilidad !== 'silla' && (
              <>
                <h3>Cuerpo</h3>
                <Opciones opciones={CUERPOS} valor={a.cuerpo} onElegir={(id) => cambiar('cuerpo', id)} />
              </>
            )}

            <h3>Tono de piel</h3>
            <Muestras colores={TONOS_PIEL} valor={a.piel} etiqueta="Tono de piel" onElegir={(c) => cambiar('piel', c)} />

            <h3>Peinado</h3>
            {ilustrado ? (
              <Opciones opciones={PEINADOS_ILUSTRADO} valor={a.peinado} onElegir={(id) => cambiar('peinado', id)} />
            ) : (
              <Opciones opciones={PEINADOS} valor={a.peinado} onElegir={(id) => cambiar('peinado', id)} />
            )}

            <h3>Color de cabello</h3>
            <Muestras colores={COLORES_CABELLO} valor={a.cabello} etiqueta="Color de cabello" onElegir={(c) => cambiar('cabello', c)} />

            <h3>{ilustrado ? 'Color de la sudadera' : 'Color de ropa'}</h3>
            <Muestras colores={COLORES_ROPA} valor={a.ropa} etiqueta="Color de ropa" onElegir={(c) => cambiar('ropa', c)} />

            {ilustrado ? (
              <>
                <h3>Lentes</h3>
                <Opciones
                  opciones={LENTES}
                  valor={a.lentes ? 'si' : 'no'}
                  onElegir={(id) => cambiar('lentes', id === 'si')}
                />

                <h3>Accesorio</h3>
                <Opciones
                  opciones={ACCESORIOS_ILUSTRADO}
                  valor={a.accesorio === 'lentes' ? 'ninguno' : a.accesorio}
                  onElegir={(id) => cambiar('accesorio', id)}
                />
              </>
            ) : (
              <>
                <h3>Accesorio</h3>
                <Opciones opciones={ACCESORIOS} valor={a.accesorio} onElegir={(id) => cambiar('accesorio', id)} />
              </>
            )}

            <h3>Movilidad</h3>
            <Opciones opciones={MOVILIDAD} valor={a.movilidad} onElegir={(id) => cambiar('movilidad', id)} />
          </div>
        </div>

        <h2>Elige tu compañero de viaje</h2>
        <div className="companeros">
          {COMPANEROS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === avatar.companero ? 'companero activo' : 'companero'}
              aria-pressed={c.id === avatar.companero}
              onClick={() => setAvatar((actual) => ({ ...actual, companero: c.id }))}
            >
              <img src={imagenCompanero(c.id)} width={56} height={56} style={{ objectFit: 'contain' }} alt="" />
              <strong>{c.nombre}</strong>
              <span>{c.descripcion}</span>
            </button>
          ))}
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="creador-acciones">
          {onCancelar && (
            <button type="button" className="opcion" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button type="button" className="creador-guardar" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Comenzar la aventura'}
          </button>
        </div>
      </div>
    </div>
  )
}
