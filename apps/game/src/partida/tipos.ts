export interface Posicion {
  x: number
  y: number
}

export interface Partida {
  region: string
  faros: string[]
  posicion: Posicion | null
}

export const PARTIDA_NUEVA: Partida = {
  region: 'raices',
  faros: [],
  posicion: null,
}
