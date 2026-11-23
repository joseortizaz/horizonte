// Opciones del creador de personaje

export const TONOS_PIEL = ['#f9d7b9', '#eebd94', '#d49a6a', '#b07447', '#8a5530', '#5e3a1e']

export const COLORES_CABELLO = [
  '#1c1c1c', '#4a2c17', '#8b5a2b', '#c68642', '#e8c07d', '#a33b2b', '#6c3483', '#2e86c1',
]

export const COLORES_ROPA = [
  '#e67e22', '#2e86c1', '#27ae60', '#8e44ad', '#c0392b', '#f1c40f', '#34495e', '#ec407a',
]

export const PEINADOS = [
  { id: 'corto', nombre: 'Corto' },
  { id: 'largo', nombre: 'Largo' },
  { id: 'rizado', nombre: 'Rizado' },
  { id: 'mono', nombre: 'Moño' },
  { id: 'rapado', nombre: 'Rapado' },
] as const

export const ACCESORIOS = [
  { id: 'ninguno', nombre: 'Ninguno' },
  { id: 'lentes', nombre: 'Lentes' },
  { id: 'gorra', nombre: 'Gorra' },
  { id: 'audifonos', nombre: 'Audífonos' },
] as const

export const MOVILIDAD = [
  { id: 'a-pie', nombre: 'A pie' },
  { id: 'silla', nombre: 'Silla de ruedas' },
] as const

export const ESTILOS = [
  { id: 'ilustrado', nombre: 'Ilustrado' },
  { id: 'clasico', nombre: 'Dibujo simple (más opciones)' },
] as const

export const COMPANEROS = [
  { id: 'gota', nombre: 'Gota', descripcion: 'Un espíritu del mar, juguetón y leal, que nunca te deja solo.' },
  { id: 'chispa', nombre: 'Chispa', descripcion: 'Una lucecita curiosa que ilumina lo que nadie ve.' },
  { id: 'pluma', nombre: 'Pluma', descripcion: 'Un ave que mira desde lo alto y nunca se rinde.' },
  { id: 'coral', nombre: 'Coral', descripcion: 'Una tortuga tranquila que conoce todos los caminos del mar.' },
] as const

export type Estilo = (typeof ESTILOS)[number]['id']
export type Peinado = (typeof PEINADOS)[number]['id']
export type Accesorio = (typeof ACCESORIOS)[number]['id']
export type Movilidad = (typeof MOVILIDAD)[number]['id']
export type Companero = (typeof COMPANEROS)[number]['id']

export interface Apariencia {
  estilo: Estilo
  piel: string
  peinado: Peinado
  cabello: string
  ropa: string
  accesorio: Accesorio
  movilidad: Movilidad
}

export interface Avatar {
  apariencia: Apariencia
  companero: Companero
}

export const AVATAR_INICIAL: Avatar = {
  apariencia: {
    estilo: 'ilustrado',
    piel: TONOS_PIEL[2],
    peinado: 'corto',
    cabello: COLORES_CABELLO[1],
    ropa: COLORES_ROPA[1],
    accesorio: 'ninguno',
    movilidad: 'a-pie',
  },
  companero: 'gota',
}

function alAzar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

export function avatarAleatorio(estilo: Estilo, movilidad: Movilidad): Avatar {
  return {
    apariencia: {
      estilo,
      piel: alAzar(TONOS_PIEL),
      peinado: alAzar(PEINADOS).id,
      cabello: alAzar(COLORES_CABELLO),
      ropa: alAzar(COLORES_ROPA),
      accesorio: alAzar(ACCESORIOS).id,
      movilidad,
    },
    companero: alAzar(COMPANEROS).id,
  }
}
