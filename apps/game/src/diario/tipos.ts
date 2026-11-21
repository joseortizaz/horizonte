// Diario de Navegación: rutas (metas) y revisiones semanales

export const AREAS = [
  { id: 'estudios', nombre: 'Estudios' },
  { id: 'vocacion', nombre: 'Vocación y trabajo' },
  { id: 'relaciones', nombre: 'Familia y relaciones' },
  { id: 'salud', nombre: 'Salud y bienestar' },
  { id: 'finanzas', nombre: 'Dinero' },
  { id: 'proposito', nombre: 'Valores y propósito' },
  { id: 'otra', nombre: 'Otra' },
] as const

export type Area = (typeof AREAS)[number]['id']

export const AVANCES = [
  { valor: 0, nombre: 'No avancé', simbolo: '○' },
  { valor: 1, nombre: 'Avancé un poco', simbolo: '◔' },
  { valor: 2, nombre: 'Avancé bastante', simbolo: '◑' },
  { valor: 3, nombre: '¡Lo logré!', simbolo: '●' },
] as const

export interface Revision {
  avance: number
  nota: string
}

export interface Meta {
  id: string
  area: Area
  deseo: string
  resultado: string
  obstaculo: string
  plan: string
  fecha_objetivo: string | null
  estado: 'activa' | 'lograda' | 'pausada'
  creada: string
  revision_semana: Revision | null
  historial: { semana: string; avance: number }[]
}

export interface DatosDiario {
  semana_actual: string
  semanas_navegadas: number
  metas: Meta[]
}

export const nombreArea = (id: string) => AREAS.find((a) => a.id === id)?.nombre ?? id
