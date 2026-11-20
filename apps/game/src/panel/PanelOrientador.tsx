import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { AlertasPanel } from './AlertasPanel'

interface Grupo {
  id: string
  nombre: string
  centro: string
  codigo: string
  registrados: number
  autorizacion_pendiente: number
  activos_7_dias: number
  acto1_completado: number
}

interface Joven {
  nombre: string
  menor_de_edad: boolean
  autorizacion: string
  etapa: string
  recuerdos: number
  insignias: number
  ultima_actividad: string | null
}

const ETAPAS = ['Sin empezar', 'Explorando la isla', 'Faro encendido', 'Acto I completado']

function haceCuanto(fecha: string | null) {
  if (!fecha) return 'Nunca'
  const dias = Math.floor((Date.now() - Date.parse(fecha)) / 86400000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

export function PanelOrientador({ nombre }: { nombre: string }) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const [jovenes, setJovenes] = useState<Joven[] | null>(null)
  const [creando, setCreando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCentro, setNuevoCentro] = useState('')
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState('')

  const cargarGrupos = useCallback(async () => {
    const { data, error } = await supabase.rpc('mis_grupos')
    if (error) {
      setError('No pudimos cargar tus grupos. Revisa tu conexión.')
      return
    }
    const lista = (data ?? []) as Grupo[]
    setGrupos(lista)
    setElegido((actual) => actual ?? lista[0]?.id ?? null)
  }, [])

  const cargarJovenes = useCallback(async (grupoId: string) => {
    setJovenes(null)
    const { data, error } = await supabase.rpc('panel_grupo', { p_grupo: grupoId })
    if (error) {
      setError('No pudimos cargar el grupo.')
      return
    }
    setJovenes((data ?? []) as Joven[])
  }, [])

  useEffect(() => {
    void cargarGrupos()
  }, [cargarGrupos])

  useEffect(() => {
    if (elegido) void cargarJovenes(elegido)
  }, [elegido, cargarJovenes])

  async function crearGrupo(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!nuevoNombre.trim() || !nuevoCentro.trim()) {
      setError('Escribe el nombre del grupo y del centro.')
      return
    }
    const { error } = await supabase.rpc('crear_grupo', {
      p_nombre: nuevoNombre.trim(),
      p_centro: nuevoCentro.trim(),
    })
    if (error) {
      setError('No pudimos crear el grupo.')
      return
    }
    setNuevoNombre('')
    setCreando(false)
    setElegido(null)
    await cargarGrupos()
  }

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(codigo)
      window.setTimeout(() => setCopiado(''), 2000)
    } catch {
      // Si no se puede copiar, el código sigue visible en pantalla
    }
  }

  const grupo = grupos?.find((g) => g.id === elegido) ?? null
  const porEtapa = ETAPAS.map((etapa) => ({
    etapa,
    cantidad: jovenes?.filter((j) => j.etapa === etapa).length ?? 0,
  }))
  const total = jovenes?.length ?? 0

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <div>
          <p className="bitacora-antetitulo">Horizonte</p>
          <h1>Panel de orientadores</h1>
        </div>
        <div className="panel-usuario">
          <span>{nombre}</span>
          <a className="opcion panel-enlace" href="/">
            Ir al juego
          </a>
          <button className="opcion" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <AlertasPanel />

      <section className="panel-grupos">
        <div className="panel-titulo-seccion">
          <h2>Mis grupos</h2>
          <button className="opcion" onClick={() => setCreando((c) => !c)}>
            {creando ? 'Cancelar' : '+ Crear grupo'}
          </button>
        </div>

        {creando && (
          <form className="panel-form" onSubmit={(e) => void crearGrupo(e)}>
            <label>
              Nombre del grupo
              <input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej.: 4.º B, Grupo focal noviembre"
                maxLength={80}
              />
            </label>
            <label>
              Centro educativo
              <input
                value={nuevoCentro}
                onChange={(e) => setNuevoCentro(e.target.value)}
                placeholder="Ej.: Liceo Juan Pablo Duarte"
                maxLength={120}
              />
            </label>
            <button type="submit" className="creador-guardar">
              Crear grupo
            </button>
          </form>
        )}

        {grupos === null && <p>Cargando…</p>}
        {grupos?.length === 0 && !creando && (
          <p className="bitacora-nota">
            Todavía no tienes grupos. Crea uno y comparte su código con los jóvenes: lo escriben al
            registrarse en Horizonte.
          </p>
        )}

        <div className="panel-tarjetas">
          {grupos?.map((g) => (
            <button
              key={g.id}
              className={g.id === elegido ? 'panel-tarjeta activa' : 'panel-tarjeta'}
              onClick={() => setElegido(g.id)}
            >
              <strong>{g.nombre}</strong>
              <span>{g.centro}</span>
              <span className="panel-codigo-mini">Código: {g.codigo}</span>
              <span>{g.registrados} registrados</span>
            </button>
          ))}
        </div>
      </section>

      {grupo && (
        <section className="panel-detalle">
          <div className="panel-titulo-seccion">
            <h2>
              {grupo.nombre} <small>· {grupo.centro}</small>
            </h2>
            <button className="opcion" onClick={() => void cargarGrupos().then(() => cargarJovenes(grupo.id))}>
              Actualizar
            </button>
          </div>

          <div className="panel-codigo">
            <div>
              <span>Código para los jóvenes</span>
              <strong>{grupo.codigo}</strong>
            </div>
            <button className="opcion" onClick={() => void copiarCodigo(grupo.codigo)}>
              {copiado === grupo.codigo ? '¡Copiado!' : 'Copiar código'}
            </button>
          </div>

          <div className="bitacora-progreso panel-resumen">
            <div>
              <strong>{grupo.registrados}</strong>
              <span>registrados</span>
            </div>
            <div>
              <strong>{grupo.autorizacion_pendiente}</strong>
              <span>sin autorización del tutor</span>
            </div>
            <div>
              <strong>{grupo.activos_7_dias}</strong>
              <span>activos esta semana</span>
            </div>
            <div>
              <strong>{grupo.acto1_completado}</strong>
              <span>completaron el Acto I</span>
            </div>
          </div>

          {total > 0 && (
            <div className="panel-etapas" aria-label="Avance del grupo por etapa">
              {porEtapa.map(({ etapa, cantidad }, i) => (
                <div key={etapa} className="panel-etapa">
                  <div className="panel-etapa-nombre">
                    <span>{etapa}</span>
                    <span>{cantidad}</span>
                  </div>
                  <div className="panel-barra">
                    <div
                      className={`panel-barra-relleno etapa-${i}`}
                      style={{ width: `${(cantidad / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {jovenes === null && <p>Cargando…</p>}
          {jovenes?.length === 0 && (
            <p className="bitacora-nota">
              Nadie se ha unido todavía. Comparte el código <strong>{grupo.codigo}</strong>: los jóvenes lo
              escriben en el campo "Código de tu centro" al crear su cuenta.
            </p>
          )}

          {jovenes && jovenes.length > 0 && (
            <div className="panel-tabla-contenedor">
              <table className="panel-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Autorización</th>
                    <th>Etapa</th>
                    <th>Recuerdos</th>
                    <th>Insignias</th>
                    <th>Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {jovenes.map((j, i) => (
                    <tr key={`${j.nombre}-${i}`}>
                      <td>{j.nombre}</td>
                      <td>
                        <span className={`panel-estado ${j.autorizacion.replace(/\s/g, '-').toLowerCase()}`}>
                          {j.autorizacion}
                        </span>
                      </td>
                      <td>{j.etapa}</td>
                      <td>{j.recuerdos} / 3</td>
                      <td>{j.insignias}</td>
                      <td>{haceCuanto(j.ultima_actividad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="bitacora-pie">
            Por privacidad, este panel muestra solo el avance. Las respuestas de los jóvenes y su Bitácora
            son personales: cada joven decide si las comparte. La única excepción son las alertas de
            bienestar, que aparecen arriba.
          </p>
        </section>
      )}
    </div>
  )
}
