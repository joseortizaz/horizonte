import { useState } from 'react'
import { avatarSvg, companeroSvg, svgADataUri } from './dibujo'
import {
  ACCESORIOS, AVATAR_INICIAL, COLORES_CABELLO, COLORES_ROPA, COMPANEROS, MOVILIDAD, PEINADOS,
  TONOS_PIEL, avatarAleatorio,
} from './tipos'
import type { Apariencia, Avatar } from './tipos'

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
        <p className="creador-sub">Así te verán en Horizonte. Puedes cambiarlo cuando quieras.</p>

        <div className="creador-cuerpo">
          <div className="creador-vista">
            <div className="creador-escenario">
              <img src={svgADataUri(avatarSvg(a))} width={160} height={200} alt="Vista previa de tu personaje" />
              <img
                className="creador-companero"
                src={svgADataUri(companeroSvg(avatar.companero))}
                width={64}
                height={64}
                alt=""
              />
            </div>
            <button type="button" className="opcion" onClick={() => setAvatar(avatarAleatorio(a.movilidad))}>
              Sorpréndeme
            </button>
          </div>

          <div className="creador-opciones">
            <h3>Tono de piel</h3>
            <Muestras colores={TONOS_PIEL} valor={a.piel} etiqueta="Tono de piel" onElegir={(c) => cambiar('piel', c)} />

            <h3>Peinado</h3>
            <Opciones opciones={PEINADOS} valor={a.peinado} onElegir={(id) => cambiar('peinado', id)} />

            <h3>Color de cabello</h3>
            <Muestras colores={COLORES_CABELLO} valor={a.cabello} etiqueta="Color de cabello" onElegir={(c) => cambiar('cabello', c)} />

            <h3>Color de ropa</h3>
            <Muestras colores={COLORES_ROPA} valor={a.ropa} etiqueta="Color de ropa" onElegir={(c) => cambiar('ropa', c)} />

            <h3>Accesorio</h3>
            <Opciones opciones={ACCESORIOS} valor={a.accesorio} onElegir={(id) => cambiar('accesorio', id)} />

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
              <img src={svgADataUri(companeroSvg(c.id))} width={56} height={56} alt="" />
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
