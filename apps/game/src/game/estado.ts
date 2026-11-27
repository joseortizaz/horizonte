import { EventBus } from './EventBus'

// Estado compartido entre React y las escenas que no forma parte de la partida guardada.
// La vela de la barca: 36 colores (cuadrícula de 6 × 6) diseñados en el taller de Kiko.
let vela: string[] | null = null

export function velaActual() {
  return vela
}

export function cambiarVela(nueva: string[] | null) {
  vela = nueva
  EventBus.emit('vela-cambiada', nueva)
}
