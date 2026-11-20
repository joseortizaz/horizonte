import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PaginaAutorizacion } from './consentimiento/PaginaAutorizacion'
import { PanelApp } from './panel/PanelApp'

// La página de autorización para tutores es pública y no usa el juego
const esAutorizacion = window.location.pathname.startsWith('/autorizacion')
// El panel de orientadores vive en /orientador
const esPanel = window.location.pathname.startsWith('/orientador')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esAutorizacion ? <PaginaAutorizacion /> : esPanel ? <PanelApp /> : <App />}
  </StrictMode>,
)

// En la versión publicada, registra el service worker (juego sin conexión e instalable)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.warn('No se pudo registrar el service worker.')
    })
  })
}
