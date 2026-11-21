import { EMERGENCIAS, RECURSOS } from './recursos'

interface Props {
  nivel: 'moderado' | 'alto'
  onCerrar: () => void
}

// Se muestra cuando una nota del joven tiene señales de riesgo
export function PantallaApoyo({ nivel, onCerrar }: Props) {
  const alto = nivel === 'alto'

  return (
    <div className="apoyo-fondo" role="alertdialog" aria-labelledby="apoyo-titulo">
      <div className="apoyo">
        <h2 id="apoyo-titulo">{alto ? 'Gracias por contarlo' : 'Gracias por escribir lo que sientes'}</h2>

        {alto ? (
          <p>
            Lo que escribiste nos importa, y tú nos importas. No tienes que pasar por esto a solas.
          </p>
        ) : (
          <p>
            A veces las cosas se sienten muy pesadas. Hablarlo con alguien de confianza puede ayudar mucho.
          </p>
        )}

        <div className="apoyo-emergencia">
          <span>{alto ? 'Si sientes que estás en peligro ahora mismo:' : 'Si en algún momento sientes que estás en peligro:'}</span>
          <a href={EMERGENCIAS.enlace} className="apoyo-boton urgente">
            {EMERGENCIAS.accion}
          </a>
        </div>

        <p className="apoyo-subtitulo">Puedes hablar con alguien hoy:</p>
        <ul className="apoyo-recursos">
          {RECURSOS.map((r) => (
            <li key={r.nombre}>
              <div>
                <strong>{r.nombre}</strong>
                <span>{r.descripcion}</span>
              </div>
              <a href={r.enlace} target="_blank" rel="noreferrer" className="apoyo-boton">
                {r.accion}
              </a>
            </li>
          ))}
        </ul>

        <p>
          También te ayudará hablar con una persona adulta de confianza: alguien de tu familia, un profesor
          o tu orientador.
        </p>

        <p className="apoyo-nota">
          {alto
            ? 'Como te contamos, una persona adulta del equipo de Proyéctate leerá lo que escribiste para poder acompañarte.'
            : 'Una persona adulta del equipo de Proyéctate sabrá que escribiste algo difícil, para poder acompañarte si lo necesitas.'}
        </p>

        <button className="creador-guardar" onClick={onCerrar}>
          Volver a mi Bitácora
        </button>
      </div>
    </div>
  )
}
