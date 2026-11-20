import * as Phaser from 'phaser'
import { EventBus } from '../EventBus'
import { avatarSvg, companeroSvg, svgADataUri } from '../../avatar/dibujo'
import { mareaSvg } from '../personajes'
import type { Avatar } from '../../avatar/tipos'
import type { Partida } from '../../partida/tipos'

const VELOCIDAD = 220
const AVISO_POSICION_MS = 5000
const DISTANCIA_PARA_HABLAR = 70

export class PuertoScene extends Phaser.Scene {
  private jugador!: Phaser.GameObjects.Image
  private companero!: Phaser.GameObjects.Image
  private marea!: Phaser.GameObjects.Image
  private indicadorMarea!: Phaser.GameObjects.Text
  private avisoHablar!: Phaser.GameObjects.Text
  private faro!: Phaser.GameObjects.Rectangle
  private luzFaro!: Phaser.GameObjects.Arc
  private bruma!: Phaser.GameObjects.Rectangle
  private nubes: Phaser.GameObjects.Ellipse[] = []
  private flechas!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private teclaHablar!: Phaser.Input.Keyboard.Key
  private teclaEspacio!: Phaser.Input.Keyboard.Key
  private destino: Phaser.Math.Vector2 | null = null
  private faroEncendido = false
  private enDialogo = false
  private ignorarToque = false
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
    this.load.image('marea', svgADataUri(mareaSvg()))
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

    // Marea, la guardiana de la isla
    this.marea = this.add.image(width * 0.45, height * 0.72, 'marea').setDepth(9)
    this.marea.setInteractive({ useHandCursor: true })
    this.indicadorMarea = this.add
      .text(this.marea.x, this.marea.y - 58, '!', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd54f',
        stroke: '#1c2833',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20)
    this.tweens.add({
      targets: this.indicadorMarea,
      y: this.indicadorMarea.y - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.avisoHablar = this.add
      .text(this.marea.x, this.marea.y + 50, 'Pulsa E o toca para hablar', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#1c2833cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)

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

    // Controles: teclado (flechas o WASD), E o Espacio para hablar, y toque o clic
    const teclado = this.input.keyboard!
    this.flechas = teclado.createCursorKeys()
    this.wasd = teclado.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
    this.teclaHablar = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.teclaEspacio = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Tocar a Marea: si está cerca, conversa; si no, camina hacia ella
    this.marea.on('pointerdown', () => {
      if (this.enDialogo) return
      if (this.cercaDeMarea()) {
        this.ignorarToque = true
        this.destino = null
        this.hablarConMarea()
      }
    })

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.ignorarToque || this.enDialogo) {
        this.ignorarToque = false
        return
      }
      this.destino = new Phaser.Math.Vector2(p.worldX, p.worldY)
    })

    // Mientras hay un diálogo abierto, el jugador no se mueve
    const alAbrirDialogo = () => {
      this.enDialogo = true
      this.destino = null
      this.avisoHablar.setVisible(false)
    }
    const alCerrarDialogo = () => {
      this.enDialogo = false
    }
    EventBus.on('dialogo-abierto', alAbrirDialogo)
    EventBus.on('dialogo-cerrado', alCerrarDialogo)

    const limpiar = () => {
      EventBus.off('dialogo-abierto', alAbrirDialogo)
      EventBus.off('dialogo-cerrado', alCerrarDialogo)
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, limpiar)
    this.events.once(Phaser.Scenes.Events.DESTROY, limpiar)
  }

  update(time: number, delta: number) {
    // Durante un diálogo: consumir las teclas para que no reabran la conversación
    if (this.enDialogo) {
      Phaser.Input.Keyboard.JustDown(this.teclaHablar)
      Phaser.Input.Keyboard.JustDown(this.teclaEspacio)
      return
    }

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

    // Cerca de Marea: mostrar el aviso y permitir conversar con E o Espacio
    const cerca = this.cercaDeMarea()
    this.avisoHablar.setVisible(cerca)
    const pidioHablar =
      Phaser.Input.Keyboard.JustDown(this.teclaHablar) ||
      Phaser.Input.Keyboard.JustDown(this.teclaEspacio)
    if (cerca && pidioHablar) this.hablarConMarea()

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
      const distanciaFaro = Phaser.Math.Distance.Between(
        this.jugador.x, this.jugador.y, this.faro.x, this.faro.y
      )
      if (distanciaFaro < 50) this.encenderFaro()
    }
  }

  private cercaDeMarea() {
    return (
      Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, this.marea.x, this.marea.y) <
      DISTANCIA_PARA_HABLAR
    )
  }

  private hablarConMarea() {
    this.indicadorMarea.setVisible(false)
    EventBus.emit('hablar', 'marea')
  }

  private encenderFaro() {
    this.faroEncendido = true
    this.luzFaro.setFillStyle(0xffd54f)
    this.tweens.add({ targets: [this.bruma, ...this.nubes], alpha: 0, duration: 1500 })
    EventBus.emit('faro-encendido', 'raices')
  }
}
