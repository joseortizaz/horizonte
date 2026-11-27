import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { AREAS } from './tipos'
import type { Area } from './tipos'

interface Props {
  onGuardada: (nivel: string) => void
  onCancelar: () => void
  inicial?: { area: Area; deseo: string } // ruta sugerida (por ejemplo, desde el Archipiélago de los Oficios)
}

// Trazar una ruta con el método WOOP: deseo, resultado, obstáculo y plan
export function NuevaRuta({ onGuardada, onCancelar, inicial }: Props) {
  const [paso, setPaso] = useState(0)
  const [area, setArea] = useState<Area>(inicial?.area ?? 'estudios')
  const [deseo, setDeseo] = useState(inicial?.deseo ?? '')
  const [resultado, setResultado] = useState('')
  const [obstaculo, setObstaculo] = useState('')
  const [plan, setPlan] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const pasos = [
    {
      titulo: '¿Hacia dónde quieres navegar?',
      ayuda: 'Elige un área de tu vida y escribe algo concreto que quieras lograr en los próximos meses.',
      valido: deseo.trim().length > 2,
    },
    {
      titulo: 'Imagina que ya llegaste',
      ayuda: 'Cierra los ojos un momento. ¿Cómo sería tu vida al lograrlo? ¿Qué sentirías?',
      valido: resultado.trim().length > 2,
    },
    {
      titulo: '¿Qué podría frenarte?',
      ayuda: 'Piensa en algo tuyo: un hábito, un pensamiento o una emoción que podría ponerse en el camino.',
      valido: obstaculo.trim().length > 2,
    },
    {
      titulo: 'Tu plan para la tormenta',
      ayuda: 'Cuando aparezca ese obstáculo, ¿qué vas a hacer? Completa la frase.',
      valido: plan.trim().length > 2,
    },
  ]

  const actual = pasos[paso]

  async function guardar() {
    setGuardando(true)
    setError('')
    const { data, error } = await supabase.rpc('guardar_meta', {
      p_id: null,
      p_area: area,
      p_deseo: deseo,
      p_resultado: resultado,
      p_obstaculo: obstaculo,
      p_plan: `Si ${obstaculo.trim()}, entonces ${plan.trim()}`,
      p_fecha: fecha || null,
    })
    setGuardando(false)
    if (error) {
      setError(error.message.includes('3 rutas') ? 'Ya tienes 3 rutas activas.' : 'No pudimos guardar tu ruta. Revisa tu conexión.')
      return
    }
    onGuardada((data as { nivel: string }).nivel)
  }

  return (
    <section className="nueva-ruta">
      <p className="bitacora-antetitulo">
        Nueva ruta · paso {paso + 1} de {pasos.length}
      </p>
      <h2>{actual.titulo}</h2>
      <p className="bitacora-nota">{actual.ayuda}</p>

      {paso === 0 && (
        <>
          <div className="opciones">
            {AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={a.id === area ? 'opcion activa' : 'opcion'}
                onClick={() => setArea(a.id)}
              >
                {a.nombre}
              </button>
            ))}
          </div>
          <input
            value={deseo}
            onChange={(e) => setDeseo(e.target.value)}
            maxLength={200}
            placeholder="Ej.: Aprobar matemática con buena nota"
          />
          <label className="nueva-ruta-fecha">
            ¿Para cuándo? (opcional)
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </>
      )}

      {paso === 1 && (
        <textarea
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ej.: Me sentiría tranquilo y orgulloso, y mi familia también."
        />
      )}

      {paso === 2 && (
        <textarea
          value={obstaculo}
          onChange={(e) => setObstaculo(e.target.value)}
          maxLength={400}
          rows={2}
          placeholder="Ej.: me distraigo con el celular cuando tengo que estudiar"
        />
      )}

      {paso === 3 && (
        <div className="nueva-ruta-plan">
          <p>
            <strong>Si</strong> {obstaculo.trim() || '…'}, <strong>entonces</strong>
          </p>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            maxLength={400}
            rows={2}
            placeholder="Ej.: dejo el celular en otro cuarto durante 30 minutos"
          />
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

      <div className="creador-acciones">
        <button className="opcion" onClick={paso === 0 ? onCancelar : () => setPaso(paso - 1)}>
          {paso === 0 ? 'Cancelar' : 'Atrás'}
        </button>
        {paso < pasos.length - 1 ? (
          <button className="creador-guardar" disabled={!actual.valido} onClick={() => setPaso(paso + 1)}>
            Siguiente
          </button>
        ) : (
          <button className="creador-guardar" disabled={!actual.valido || guardando} onClick={() => void guardar()}>
            {guardando ? 'Guardando…' : 'Trazar ruta'}
          </button>
        )}
      </div>
    </section>
  )
}
