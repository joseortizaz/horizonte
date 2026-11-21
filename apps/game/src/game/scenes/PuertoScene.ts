import * as Phaser from 'phaser'
import { EventBus } from '../EventBus'
import { avatarSvg, companeroSvg, svgADataUri } from '../../avatar/dibujo'
import { conchaSvg, ecoSvg, huellaSvg, mareaSvg, semillaSvg } from '../personajes'
import type { Avatar } from '../../avatar/tipos'
import type { Partida } from '../../partida/tipos'

const VELOCIDAD = 220
const AVISO_POSICION_MS = 5000
const RECUERDOS = ['concha', 'huella', 'semilla']
// En pantallas táctiles los textos de ayuda hablan de tocar, no de teclas
const ES_TACTIL = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// Algo con lo que el jugador puede interactuar: una persona, un objeto o el faro
interface Interactivo {
  id: string
  nudo: string // nudo del guion de Ink que se abre al interactuar
  x: number
  y: number
  radio: number
  visual: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  activo: boolean
  automatico: boolean // se activa solo al acercarse (sin pulsar nada)
}

export class PuertoScene extends Phaser.Scene {
  private jugador!: Phaser.GameObjects.Image
  private companero!: Phaser.GameObjects.Image
  private indicadorMarea!: Phaser.GameObjects.Text
  private avisoInteractuar!: Phaser.GameObjects.Text
  private faro!: Phaser.GameObjects.Rectangle
  private luzFaro!: Phaser.GameObjects.Arc
  private bruma!: Phaser.GameObjects.Rectangle
  private nubes: Phaser.GameObjects.Ellipse[] = []
  private interactivos: Interactivo[] = []
  private cercanoActual: Interactivo | null = null
  private flechas!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private teclaHablar!: Phaser.Input.Keyboard.Key
  private teclaEspacio!: Phaser.Input.Keyboard.Key
  private destino: Phaser.Math.Vector2 | null = null
  private faroEncendido = false
  private recuerdosEncontrados = 0
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
    this.load.image('eco', svgADataUri(ecoSvg()))
    this.load.image('concha', svgADataUri(conchaSvg()))
    this.load.image('huella', svgADataUri(huellaSvg()))
    this.load.image('semilla', svgADataUri(semillaSvg()))
  }

  create() {
    const { width, height } = this.scale
    const partida = this.registry.get('partida') as Partida
    // Lo que ya se resolvió en la historia: recuerdos recogidos, eco vencido, etc.
    const resueltos = (this.registry.get('resueltos') as string[]) ?? []
    this.faroEncendido = partida.faros.includes('raices')
    this.recuerdosEncontrados = RECUERDOS.filter((id) => resueltos.includes(id)).length
    this.interactivos = []
    this.nubes = []

    // Mar e isla
    this.add.rectangle(0, 0, width, height, 0x1b4f72).setOrigin(0)
    this.add.ellipse(width / 2, height / 2, width * 0.75, height * 0.65, 0xc9a66b)

    // Faro
    this.faro = this.add.rectangle(width * 0.72, height * 0.38, 24, 60, 0xf4f1ea)
    this.faro.setStrokeStyle(2, 0x5b4636)
    this.luzFaro = this.add
      .circle(this.faro.x, this.faro.y - 40, 12, this.faroEncendido ? 0xffd54f : 0x555555)
      .setDepth(10)
    this.agregarInteractivo('faro', 'faro', this.faro, 60, false)

    // Marea, la guardiana de la isla
    const marea = this.add.image(width * 0.45, height * 0.72, 'marea').setDepth(9)
    this.agregarInteractivo('marea', 'marea', marea, 70, false)
    this.indicadorMarea = this.add
      .text(marea.x, marea.y - 58, '!', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd54f',
        stroke: '#1c2833',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(!resueltos.includes('marea'))
    this.tweens.add({
      targets: this.indicadorMarea,
      y: this.indicadorMarea.y - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Los tres Recuerdos, brillando entre la Bruma
    this.crearRecuerdo('concha', width * 0.22, height * 0.45, resueltos)
    this.crearRecuerdo('huella', width * 0.5, height * 0.3, resueltos)
    this.crearRecuerdo('semilla', width * 0.65, height * 0.67, resueltos)

    // El Eco, en el camino hacia el faro. Aparece solo al acercarse.
    if (!resueltos.includes('eco')) {
      const eco = this.add.image(width * 0.61, height * 0.42, 'eco').setDepth(9).setAlpha(0.85)
      this.tweens.add({
        targets: eco,
        y: eco.y - 6,
        alpha: 0.6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.agregarInteractivo('eco', 'eco', eco, 75, true)
    }

    // Aviso que aparece sobre lo que está cerca
    this.avisoInteractuar = this.add
      .text(0, 0, ES_TACTIL ? 'Toca aquí para interactuar' : 'Pulsa E o toca para interactuar', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#1c2833cc',
        padding: ES_TACTIL ? { x: 12, y: 8 } : { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })

    // Tocar el aviso también sirve para interactuar (más fácil en el teléfono)
    this.avisoInteractuar.on('pointerdown', () => {
      if (this.enDialogo || !this.cercanoActual) return
      this.ignorarToque = true
      this.destino = null
      this.interactuar(this.cercanoActual)
    })

    // Personaje del jugador y su compañero
    const inicio = partida.posicion ?? { x: width * 0.3, y: height * 0.6 }
    this.jugador = this.add.image(inicio.x, inicio.y, 'avatar').setDepth(10)
    this.ultimaPosicionAvisada.set(inicio.x, inicio.y)
    this.companero = this.add
      .image(this.jugador.x - 34, this.jugador.y - 30, 'companero')
      .setDepth(11)

    // La Bruma: más espesa al principio, se aclara con cada Recuerdo
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
    this.ajustarBruma(0)

    this.add.text(16, 16, 'Isla de las Raíces', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setDepth(20)

    // Controles: teclado (flechas o WASD), E o Espacio para interactuar, y toque o clic
    const teclado = this.input.keyboard!
    this.flechas = teclado.createCursorKeys()
    this.wasd = teclado.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
    this.teclaHablar = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.teclaEspacio = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.ignorarToque || this.enDialogo) {
        this.ignorarToque = false
        return
      }
      this.destino = new Phaser.Math.Vector2(p.worldX, p.worldY)
      this.marcarDestino(p.worldX, p.worldY)
    })

    // Mensajes que llegan desde React (la historia)
    const alAbrirDialogo = () => {
      this.enDialogo = true
      this.destino = null
      this.avisoInteractuar.setVisible(false)
    }
    const alCerrarDialogo = () => {
      this.enDialogo = false
    }
    const alResolver = (id: string) => this.resolver(id)
    const alEncenderFaro = () => this.encenderFaro()

    EventBus.on('dialogo-abierto', alAbrirDialogo)
    EventBus.on('dialogo-cerrado', alCerrarDialogo)
    // Pausa por otras pantallas (por ejemplo, la Bitácora)
    EventBus.on('pausar', alAbrirDialogo)
    EventBus.on('reanudar', alCerrarDialogo)
    EventBus.on('resolver', alResolver)
    EventBus.on('encender-faro', alEncenderFaro)

    // Mientras se escribe en un campo de texto (por ejemplo, las notas de la Bitácora),
    // el juego deja de capturar teclas como el espacio, la E o WASD, para que se puedan escribir.
    const esCampoDeTexto = (elemento: EventTarget | null) =>
      elemento instanceof HTMLInputElement ||
      elemento instanceof HTMLTextAreaElement ||
      elemento instanceof HTMLSelectElement ||
      (elemento instanceof HTMLElement && elemento.isContentEditable)
    const alEnfocar = (e: FocusEvent) => {
      if (esCampoDeTexto(e.target)) teclado.disableGlobalCapture()
    }
    const alDesenfocar = (e: FocusEvent) => {
      if (esCampoDeTexto(e.target)) teclado.enableGlobalCapture()
    }
    document.addEventListener('focusin', alEnfocar)
    document.addEventListener('focusout', alDesenfocar)

    const limpiar = () => {
      document.removeEventListener('focusin', alEnfocar)
      document.removeEventListener('focusout', alDesenfocar)
      EventBus.off('dialogo-abierto', alAbrirDialogo)
      EventBus.off('dialogo-cerrado', alCerrarDialogo)
      EventBus.off('pausar', alAbrirDialogo)
      EventBus.off('reanudar', alCerrarDialogo)
      EventBus.off('resolver', alResolver)
      EventBus.off('encender-faro', alEncenderFaro)
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, limpiar)
    this.events.once(Phaser.Scenes.Events.DESTROY, limpiar)

    // Avisa a React que la escena está lista (por ejemplo, para iniciar el prólogo)
    EventBus.emit('escena-lista')
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

    // ¿Hay algo cerca con qué interactuar?
    const cercano = this.interactivoCercano()
    this.cercanoActual = cercano
    const pidioInteractuar =
      Phaser.Input.Keyboard.JustDown(this.teclaHablar) ||
      Phaser.Input.Keyboard.JustDown(this.teclaEspacio)

    if (cercano?.automatico) {
      cercano.automatico = false
      this.interactuar(cercano)
    } else if (cercano) {
      this.avisoInteractuar
        .setPosition(cercano.x, cercano.y + 52)
        .setVisible(true)
      if (pidioInteractuar) this.interactuar(cercano)
    } else {
      this.avisoInteractuar.setVisible(false)
    }

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
  }

  private agregarInteractivo(
    id: string,
    nudo: string,
    visual: Interactivo['visual'],
    radio: number,
    automatico: boolean
  ) {
    const interactivo: Interactivo = {
      id, nudo, x: visual.x, y: visual.y, radio, visual, activo: true, automatico,
    }
    this.interactivos.push(interactivo)

    // Tocarlo: si está cerca, interactúa; si no, el jugador camina hacia allá.
    // Las imágenes tienen un área de toque más grande que el dibujo, para los dedos.
    if (visual instanceof Phaser.GameObjects.Image) {
      const area = new Phaser.Geom.Circle(visual.width / 2, visual.height / 2, 40)
      visual.setInteractive({ hitArea: area, hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true })
    } else {
      visual.setInteractive({ useHandCursor: true })
    }
    visual.on('pointerdown', () => {
      if (this.enDialogo || !interactivo.activo) return
      if (this.distanciaA(interactivo) < interactivo.radio) {
        this.ignorarToque = true
        this.destino = null
        this.interactuar(interactivo)
      }
    })
  }

  private crearRecuerdo(id: string, x: number, y: number, resueltos: string[]) {
    if (resueltos.includes(id)) return
    const objeto = this.add.image(x, y, id).setDepth(9)
    this.tweens.add({
      targets: objeto,
      scale: 1.15,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.agregarInteractivo(id, `recuerdo_${id}`, objeto, 55, false)
  }

  // Un pequeño anillo donde el jugador tocó, para que sepa hacia dónde camina
  private marcarDestino(x: number, y: number) {
    const anillo = this.add.circle(x, y, 10).setStrokeStyle(2, 0xffffff, 0.9).setDepth(8)
    this.tweens.add({
      targets: anillo,
      scale: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => anillo.destroy(),
    })
  }

  private interactivoCercano() {
    let elegido: Interactivo | null = null
    let menor = Infinity
    for (const i of this.interactivos) {
      if (!i.activo) continue
      const d = this.distanciaA(i)
      if (d < i.radio && d < menor) {
        elegido = i
        menor = d
      }
    }
    return elegido
  }

  private distanciaA(i: Interactivo) {
    return Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, i.x, i.y)
  }

  private interactuar(i: Interactivo) {
    if (i.id === 'marea') this.indicadorMarea.setVisible(false)
    this.avisoInteractuar.setVisible(false)
    EventBus.emit('hablar', i.nudo)
  }

  // La historia avisó que algo quedó resuelto: se recogió un Recuerdo o se venció al Eco
  private resolver(id: string) {
    const interactivo = this.interactivos.find((i) => i.id === id)
    if (interactivo) {
      interactivo.activo = false
      interactivo.visual.disableInteractive()
      this.tweens.killTweensOf(interactivo.visual)
      this.tweens.add({ targets: interactivo.visual, alpha: 0, scale: 1.4, duration: 800 })
    }
    if (RECUERDOS.includes(id)) {
      this.recuerdosEncontrados += 1
      this.ajustarBruma(900)
    }
  }

  // La Bruma se aclara con cada Recuerdo y desaparece con el faro
  private ajustarBruma(duracion: number) {
    const fuerza = this.faroEncendido ? 0 : 1 - this.recuerdosEncontrados * 0.2
    const brumaAlpha = 0.7 * fuerza
    const nubesAlpha = fuerza
    if (duracion === 0) {
      this.bruma.setAlpha(brumaAlpha / 0.7)
      this.nubes.forEach((n) => n.setAlpha(nubesAlpha))
      return
    }
    this.tweens.add({ targets: this.bruma, alpha: brumaAlpha / 0.7, duration: duracion })
    this.tweens.add({ targets: this.nubes, alpha: nubesAlpha, duration: duracion })
  }

  private encenderFaro() {
    if (this.faroEncendido) return
    this.faroEncendido = true
    this.luzFaro.setFillStyle(0xffd54f)
    this.tweens.add({
      targets: this.luzFaro,
      scale: 1.6,
      duration: 500,
      yoyo: true,
      repeat: 2,
    })
    this.ajustarBruma(1500)
    EventBus.emit('faro-encendido', 'raices')
  }
}
