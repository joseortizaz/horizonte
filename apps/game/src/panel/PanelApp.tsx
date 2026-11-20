import { useEffect, useState } from 'react'
import { useSession } from '../auth/useSession'
import { AuthScreen } from '../auth/AuthScreen'
import { supabase } from '../lib/supabase'
import { PanelOrientador } from './PanelOrientador'

// Entrada al panel de orientadores (/orientador)
export function PanelApp() {
  const { session, cargando } = useSession()
  const [esOrientador, setEsOrientador] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) return
    supabase.rpc('es_orientador').then(({ data }) => setEsOrientador(data === true))
  }, [session])

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!session) return <AuthScreen />
  if (esOrientador === null) return <div className="cargando">Cargando…</div>

  if (!esOrientador) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Panel de orientadores</h1>
          <p>
            Tu cuenta todavía no tiene acceso al panel. Pide al equipo de Horizonte que la habilite como
            cuenta de orientador.
          </p>
          <a className="creador-guardar panel-enlace" href="/">
            Ir al juego
          </a>
          <button className="auth-cambiar" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </div>
    )
  }

  return <PanelOrientador nombre={(session.user.user_metadata.display_name as string) ?? ''} />
}
