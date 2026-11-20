import * as Phaser from 'phaser'
import { EventBus } from '../EventBus'
import { avatarSvg, companeroSvg, svgADataUri } from '../../avatar/dibujo'
import type { Avatar } from '../../avatar/tipos'
import type { Partida } from '../../partida/tipos'

const VELOCIDAD = 220
const AVISO_POSICION_MS = 5000

export class PuertoScene extends Phaser.Scene {
  private jugador!: Phaser.GameObjects.Image
  private companero!: Phaser.GameObjects.Image
  private faro!: Phaser.GameObjects.Rectangle
  private luzFaro!: Phaser.GameObjects.Arc
  private bruma!: Phaser.GameObjects.Rectangle
  private nubes: Phaser.GameObjects.Ellipse[] = []
  private flechas!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private destino: Phaser.Math.Vector2 | null = null
  private faroEncendido = false
  private ultimaPosicionAvisada = new Phaser.Math.Vector2()
  private ultimoAviso = 0

  constructor() {
    super('PuertoScene')
  }

  preload() {
    // El personaje creado por el usuario se convierte en imágenes del juego
    const avatar = this.registry.get('avatar') as Avatar
    this.load.image('avatar', svgADataUri(avatarSvg(avatar.apariencia)))
    this.load.image('companero', svgADataUri(companeroSvg(avatar.companero)))
  }

  create() {
    const { width, height } = this.scale
    const partida = this.registry.get('partida') as Partida

    // Mar e isla
    this.add.rectangle(0, 0, width, height, 0x1b4f72).setOrigin(0)
    this.add.ellipse(width / 2, height / 2, width * 0.75, height * 0.65, 0xc9a66b)

    // Faro (apagado al inicio)
    this.faro = this.add.rectangle(width * 0.72, height * 0.38, 24, 60, 0xf4f1ea)
    this.faro.setStrokeStyle(2, 0x5b4636)
    this.luzFaro = this.add.circle(this.faro.x, this.faro.y - 40, 12, 0x555555)
    this.luzFaro.setDepth(10)

    // Personaje del jugador y su compañero
    const inicio = partida.posicion ?? { x: width * 0.3, y: height * 0.6 }
    this.jugador = this.add.image(inicio.x, inicio.y, 'avatar').setDepth(10)
    this.ultimaPosicionAvisada.set(inicio.x, inicio.y)
    this.companero = this.add
      .image(this.jugador.x - 34, this.jugador.y - 30, 'companero')
      .setDepth(11)

    // La Bruma: una capa densa y nubes que se mueven lentamente
    this.bruma = this.add.rectangle(0, 0, width, height, 0xdfe6ec, 0.7)
      .setOrigin(0)
      .setDepth(5)

    for (let i = 0; i < 8; i++) {
      const nube = this.add.ellipse(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(180, 320),
        Phaser.Math.Between(80, 140),
        0xffffff,
        0.35
      ).setDepth(6)

      this.tweens.add({
        targets: nube,
        x: nube.x + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.nubes.push(nube)
    }

    // Si el faro ya estaba encendido en la partida guardada, la isla aparece despejada
    if (partida.faros.includes('raices')) {
      this.faroEncendido = true
      this.luzFaro.setFillStyle(0xffd54f)
      this.bruma.setAlpha(0)
      this.nubes.forEach((nube) => nube.setAlpha(0))
    }

    this.add.text(16, 16, 'Isla de las Raíces', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setDepth(20)

    // Controles: teclado (flechas o WASD) y toque o clic
    const teclado = this.input.keyboard!
    this.flechas = teclado.createCursorKeys()
    this.wasd = teclado.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.destino = new Phaser.Math.Vector2(p.worldX, p.worldY)
    })
  }

  update(time: number, delta: number) {
    const dt = delta / 1000
    let dx = 0
    let dy = 0

    if (this.flechas.left.isDown || this.wasd.A.isDown) dx -= 1
    if (this.flechas.right.isDown || this.wasd.D.isDown) dx += 1
    if (this.flechas.up.isDown || this.wasd.W.isDown) dy -= 1
    if (this.flechas.down.isDown || this.wasd.S.isDown) dy += 1

    if (dx !== 0 || dy !== 0) {
      // Movimiento con teclado
      this.destino = null
      const paso = new Phaser.Math.Vector2(dx, dy).normalize().scale(VELOCIDAD * dt)
      this.jugador.x += paso.x
      this.jugador.y += paso.y
    } else if (this.destino) {
      // Movimiento hacia donde se tocó la pantalla
      const distancia = Phaser.Math.Distance.Between(
        this.jugador.x, this.jugador.y, this.destino.x, this.destino.y
      )
      if (distancia < 4) {
        this.destino = null
      } else {
        const angulo = Phaser.Math.Angle.Between(
          this.jugador.x, this.jugador.y, this.destino.x, this.destino.y
        )
        const avance = Math.min(VELOCIDAD * dt, distancia)
        this.jugador.x += Math.cos(angulo) * avance
        this.jugador.y += Math.sin(angulo) * avance
      }
    }

    // Mantener al jugador dentro de la pantalla
    this.jugador.x = Phaser.Math.Clamp(this.jugador.x, 32, this.scale.width - 32)
    this.jugador.y = Phaser.Math.Clamp(this.jugador.y, 40, this.scale.height - 40)

    // El compañero sigue al jugador flotando suavemente
    const suavidad = Math.min(1, dt * 4)
    const flotar = Math.sin(time / 300) * 4
    this.companero.x += (this.jugador.x - 34 - this.companero.x) * suavidad
    this.companero.y += (this.jugador.y - 30 + flotar - this.companero.y) * suavidad

    // Avisa a React la posición cada pocos segundos, solo si el jugador se movió
    if (time - this.ultimoAviso > AVISO_POSICION_MS) {
      this.ultimoAviso = time
      const movido = Phaser.Math.Distance.Between(
        this.jugador.x, this.jugador.y, this.ultimaPosicionAvisada.x, this.ultimaPosicionAvisada.y
      )
      if (movido > 2) {
        this.ultimaPosicionAvisada.set(this.jugador.x, this.jugador.y)
        EventBus.emit('posicion', { x: Math.round(this.jugador.x), y: Math.round(this.jugador.y) })
      }
    }

    // ¿Llegó al faro?
    if (!this.faroEncendido) {
      const cerca = Phaser.Math.Distance.Between(
        this.jugador.x, this.jugador.y, this.faro.x, this.faro.y
      )
      if (cerca < 50) this.encenderFaro()
    }
  }

  private encenderFaro() {
    this.faroEncendido = true
    this.luzFaro.setFillStyle(0xffd54f)
    this.tweens.add({ targets: [this.bruma, ...this.nubes], alpha: 0, duration: 1500 })
    EventBus.emit('faro-encendido', 'raices')
  }
}
