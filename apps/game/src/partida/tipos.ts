export interface Posicion {
  x: number
  y: number
  mundo?: number // 3 = isla actual (2190 × 1222); 2 = isla anterior; sin valor = primer mundo
}

export interface Partida {
  region: string
  faros: string[]
  posicion: Posicion | null
  narrativa: string | null
}

export const PARTIDA_NUEVA: Partida = {
  region: 'raices',
  faros: [],
  posicion: null,
  narrativa: null,
}
