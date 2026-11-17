import * as Phaser from 'phaser'

// Canal de comunicación entre Phaser (el juego) y React (la interfaz)
export const EventBus = new Phaser.Events.EventEmitter()