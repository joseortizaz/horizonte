import * as Phaser from 'phaser'
import { EventBus } from '../EventBus'
import { avatarSvg, svgADataUri } from '../../avatar/dibujo'
import { conchaSvg, ecoSvg, huellaSvg, semillaSvg } from '../personajes'
import { IMAGENES } from '../../avatar/ilustrado'
import type { AvatarIlustrado } from '../../avatar/ilustrado'
import { FONDOS, ISLA, ISLA_ANTERIOR, MUNDO } from '../arte/isla'
import type { Avatar } from '../../avatar/tipos'
import type { Partida, Posicion } from '../../partida/tipos'

const VELOCIDAD = 320
const AVISO_POSICION_MS = 5000
const RECUERDOS = ['concha', 'huella', 'semilla']
// Las figuras se dibujan al doble de resolución para que se vean nítidas
const RESOLUCION = 2
const ESCALA_PERSONAJE = 1.15
// Altura en pantalla de los personajes ilustrados (en píxeles del mundo)
const ALTO_JUGADOR = 190
const ALTO_MAREA = 200
// Altura en pantalla de cada compañero (Chispa incluye su halo de luz)
const ALTO_COMPANERO = { gota: 85, chispa: 105, pluma: 90, coral: 62 } as const
// En pantallas táctiles los textos de ayuda hablan de tocar, no de teclas
const ES_TACTIL = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// Lugares de la isla (coordenadas del mundo de 2190 × 1222, sobre la ilustración)
const LUGARES = {
  inicio: { x: 1148, y: 612 },
  faro: { x: 1554, y: 370 },
  marea: { x: 901, y: 655 },
  concha: { x: 748, y: 706 },
  huella: { x: 1173, y: 357 },
  semilla: { x: 1275, y: 791 },
  eco: { x: 1411, y: 459 },
}

// ¿El punto está sobre la isla? (fuera de ella está el mar)
function sobreLaIsla(x: number, y: number) {
  return ((x - ISLA.cx) / ISLA.rx) ** 2 + ((y - ISLA.cy) / ISLA.ry) ** 2 <= 1
}

// Si un punto está en el mar, lo acerca a la orilla
function haciaLaOrilla(x: number, y: number) {
  const valor = ((x - ISLA.cx) / ISLA.rx) ** 2 + ((y - ISLA.cy) / ISLA.ry) ** 2
  if (valor <= 1) return { x, y }
  const f = 0.97 / Math.sqrt(valor)
  return { x: ISLA.cx + (x - ISLA.cx) * f, y: ISLA.cy + (y - ISLA.cy) * f }
}

// Algo con lo que el jugador puede interactuar: una persona, un objeto o el faro
interface Interactivo {
  id: string
  nudo: string // nudo del guion de Ink que se abre al interactuar
  x: number
  y: number
  radio: number
  visual: Phaser.GameObjects.Image | Phaser.GameObjects.Zone
  activo: boolean
  automatico: boolean // se activa solo al acercarse (sin pulsar nada)
}

export class PuertoScene extends Phaser.Scene {
  private jugador!: Phaser.GameObjects.Image
  private companero!: Phaser.GameObjects.Image
  private sombraJugador!: Phaser.GameObjects.Ellipse
  private companeroEnSuelo = false
  private altoJugador = 0
  private indicadorMarea!: Phaser.GameObjects.Text
  private avisoInteractuar!: Phaser.GameObjects.Text
  private fondoEncendido!: Phaser.GameObjects.Image
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
    const avatar = this.registry.get('avatar') as Avatar
    const svg = (clave: string, contenido: string, escala = RESOLUCION) =>
      this.load.svg(clave, svgADataUri(contenido), { scale: escala })

    this.load.image('fondo-apagado', FONDOS.apagado)
    this.load.image('fondo-encendido', FONDOS.encendido)
    // El personaje ilustrado ya viene recoloreado desde React; si no, se usa el dibujo simple
    if (!this.registry.get('avatarImagen')) svg('avatar', avatarSvg(avatar.apariencia))
    this.load.image('companero', IMAGENES[avatar.companero])
    this.load.image('marea', IMAGENES.marea)
    svg('eco', ecoSvg())
    svg('concha', conchaSvg())
    svg('huella', huellaSvg())
    svg('semilla', semillaSvg())
  }

  create() {
    const partida = this.registry.get('partida') as Partida
    const avatar = this.registry.get('avatar') as Avatar
    const avatarImagen = this.registry.get('avatarImagen') as HTMLImageElement | null
    if (avatarImagen) {
      if (this.textures.exists('avatar')) this.textures.remove('avatar')
      this.textures.addImage('avatar', avatarImagen)
    }
    // Lo que ya se resolvió en la historia: recuerdos recogidos, eco vencido, etc.
    const resueltos = (this.registry.get('resueltos') as string[]) ?? []
    this.faroEncendido = partida.faros.includes('raices')
    this.recuerdosEncontrados = RECUERDOS.filter((id) => resueltos.includes(id)).length
    this.interactivos = []
    this.nubes = []

    // La cámara mira siempre al centro de la isla, aunque la pantalla sea más ancha
    // (sin salirse de la ilustración mientras la pantalla quepa dentro de ella)
    this.cameras.main.setBounds(0, 0, MUNDO.ancho, MUNDO.alto)
    const centrar = () => this.cameras.main.centerOn(ISLA.cx, ISLA.cy)
    centrar()
    this.scale.on('resize', centrar)

    // Fondo ilustrado: con el faro apagado y, encima, la versión encendida (invisible al principio)
    this.add.image(0, 0, 'fondo-apagado').setOrigin(0).setScale(FONDOS.escala)
    this.fondoEncendido = this.add
      .image(0, 0, 'fondo-encendido')
      .setOrigin(0)
      .setScale(FONDOS.escala)
      .setAlpha(this.faroEncendido ? 1 : 0)

    // El faro: una zona invisible sobre su dibujo, para poder tocarlo
    const zonaFaro = this.add.zone(LUGARES.faro.x, LUGARES.faro.y - 120, 150, 280)
    this.agregarInteractivo('faro', 'faro', zonaFaro, 130, false, LUGARES.faro.x, LUGARES.faro.y)

    // Marea, la guardiana de la isla
    this.sombra(LUGARES.marea.x, LUGARES.marea.y + ALTO_MAREA / 2 - 8, 110)
    const marea = this.figura(LUGARES.marea.x, LUGARES.marea.y, 'marea', ALTO_MAREA).setDepth(9)
    this.agregarInteractivo('marea', 'marea', marea, 110, false)
    this.indicadorMarea = this.add
      .text(marea.x, marea.y - 115, '!', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffd54f',
        stroke: '#1c2833',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(!resueltos.includes('marea'))
    this.tweens.add({
      targets: this.indicadorMarea,
      y: this.indicadorMarea.y - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Los tres Recuerdos, brillando entre la Bruma
    this.crearRecuerdo('concha', resueltos)
    this.crearRecuerdo('huella', resueltos)
    this.crearRecuerdo('semilla', resueltos)

    // El Eco, en el camino hacia el faro. Aparece solo al acercarse.
    if (!resueltos.includes('eco')) {
      const eco = this.figura(LUGARES.eco.x, LUGARES.eco.y, 'eco').setDepth(9).setAlpha(0.85)
      this.tweens.add({
        targets: eco,
        y: eco.y - 8,
        alpha: 0.6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.agregarInteractivo('eco', 'eco', eco, 110, true)
    }

    // Aviso que aparece sobre lo que está cerca
    this.avisoInteractuar = this.add
      .text(0, 0, ES_TACTIL ? 'Toca aquí para interactuar' : 'Pulsa E o toca para interactuar', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#1c2833cc',
        padding: ES_TACTIL ? { x: 16, y: 10 } : { x: 12, y: 6 },
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
    const inicio = this.posicionInicial(partida.posicion)
    const forma = this.registry.get('avatarForma') as AvatarIlustrado | null
    if (avatarImagen && forma) {
      // Personaje ilustrado: todos se escalan igual, para que la silla, el pelo o la gorra no cambien la talla.
      // El punto (x, y) del jugador queda a media altura del cuerpo, como con el dibujo simple.
      const escala = ALTO_JUGADOR / forma.altoReferencia
      this.jugador = this.add
        .image(inicio.x, inicio.y, 'avatar')
        .setScale(escala)
        .setOrigin(forma.piesX / forma.ancho, (forma.piesY - forma.altoReferencia / 2) / forma.alto)
        .setDepth(10)
      this.altoJugador = ALTO_JUGADOR
      this.sombraJugador = this.sombra(inicio.x, inicio.y + ALTO_JUGADOR / 2 - 6, forma.anchoCuerpo * escala * 0.85)
    } else {
      this.jugador = this.figura(inicio.x, inicio.y, 'avatar').setDepth(10)
      this.altoJugador = this.jugador.displayHeight
      this.sombraJugador = this.sombra(inicio.x, inicio.y + this.altoJugador / 2 - 6, this.jugador.displayWidth * 0.9)
    }
    this.ultimaPosicionAvisada.set(inicio.x, inicio.y)
    this.companero = this.figura(
      inicio.x - 70,
      inicio.y - 70,
      'companero',
      ALTO_COMPANERO[avatar.companero] ?? 85
    ).setDepth(11)
    this.companeroEnSuelo = avatar.companero === 'coral'

    // La Bruma: más espesa al principio, se aclara con cada Recuerdo.
    // Es más grande que el mundo para cubrir también el mar de los lados.
    this.bruma = this.add.rectangle(-1200, -900, MUNDO.ancho + 2400, MUNDO.alto + 1800, 0xdfe6ec, 0.7)
      .setOrigin(0)
      .setDepth(5)

    for (let i = 0; i < 12; i++) {
      const nube = this.add.ellipse(
        Phaser.Math.Between(-100, MUNDO.ancho + 100),
        Phaser.Math.Between(0, MUNDO.alto),
        Phaser.Math.Between(280, 480),
        Phaser.Math.Between(120, 200),
        0xffffff,
        0.35
      ).setDepth(6)

      this.tweens.add({
        targets: nube,
        x: nube.x + Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(5000, 9000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.nubes.push(nube)
    }
    this.ajustarBruma(0)

    this.add
      .text(24, 20, 'Isla de las Raíces', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0e2a3d',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20)

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
      const punto = haciaLaOrilla(p.worldX, p.worldY)
      this.destino = new Phaser.Math.Vector2(punto.x, punto.y)
      this.marcarDestino(punto.x, punto.y)
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
      this.scale.off('resize', centrar)
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
      this.mover(paso.x, paso.y)
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
        if (!this.mover(Math.cos(angulo) * avance, Math.sin(angulo) * avance)) this.destino = null
      }
    }

    // El compañero sigue al jugador flotando suavemente
    const suavidad = Math.min(1, dt * 4)
    const flotar = Math.sin(time / 300) * 6
    // Coral camina por el suelo, a los pies del jugador; los demás vuelan a su lado
    const enSuelo = this.companeroEnSuelo
    const objetivoX = this.jugador.x - (enSuelo ? 95 : 70)
    const objetivoY = enSuelo
      ? this.jugador.y + this.altoJugador / 2 - this.companero.displayHeight / 2
      : this.jugador.y - 70 + flotar
    this.companero.x += (objetivoX - this.companero.x) * suavidad
    this.companero.y += (objetivoY - this.companero.y) * suavidad
    this.sombraJugador.setPosition(this.jugador.x, this.jugador.y + this.altoJugador / 2 - 6)

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
      this.avisoInteractuar.setPosition(cercano.x, cercano.y + 110).setVisible(true)
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
        const posicion: Posicion = { x: Math.round(this.jugador.x), y: Math.round(this.jugador.y), mundo: 3 }
        EventBus.emit('posicion', posicion)
      }
    }
  }

  // Mueve al jugador sin dejarlo entrar al mar; si choca con la orilla, se desliza por ella
  private mover(dx: number, dy: number) {
    const { x, y } = this.jugador
    if (sobreLaIsla(x + dx, y + dy)) {
      this.jugador.setPosition(x + dx, y + dy)
      return true
    }
    if (sobreLaIsla(x + dx, y)) {
      this.jugador.x = x + dx
      return true
    }
    if (sobreLaIsla(x, y + dy)) {
      this.jugador.y = y + dy
      return true
    }
    return false
  }

  // Posición guardada; las partidas de mundos anteriores se convierten a la isla actual
  private posicionInicial(guardada: Posicion | null) {
    if (!guardada) return LUGARES.inicio
    let p = { x: guardada.x, y: guardada.y }
    if (guardada.mundo !== 3) {
      // mundo 1 (800 × 600) → mundo 2 → isla actual, conservando el lugar relativo en la isla
      const m2 = guardada.mundo === 2 ? p : { x: p.x * 2, y: p.y * 1.5 }
      const A = ISLA_ANTERIOR
      p = {
        x: ISLA.cx + ((m2.x - A.cx) / A.rx) * ISLA.rx,
        y: ISLA.cy + ((m2.y - A.cy) / A.ry) * ISLA.ry,
      }
    }
    return sobreLaIsla(p.x, p.y) ? p : LUGARES.inicio
  }

  // Coloca una figura. Con `alto`, se escala para medir esa altura (personajes ilustrados).
  private figura(x: number, y: number, textura: string, alto?: number) {
    const imagen = this.add.image(x, y, textura)
    return imagen.setScale(alto ? alto / imagen.height : ESCALA_PERSONAJE)
  }

  // Sombra ovalada a los pies de un personaje, para que se vea apoyado en el suelo
  private sombra(x: number, y: number, ancho: number) {
    return this.add.ellipse(x, y, ancho, ancho * 0.28, 0x0b2a1f, 0.28).setDepth(8)
  }

  private agregarInteractivo(
    id: string,
    nudo: string,
    visual: Interactivo['visual'],
    radio: number,
    automatico: boolean,
    x = visual.x,
    y = visual.y
  ) {
    const interactivo: Interactivo = { id, nudo, x, y, radio, visual, activo: true, automatico }
    this.interactivos.push(interactivo)

    // Tocarlo: si está cerca, interactúa; si no, el jugador camina hacia allá.
    // El área de toque es más grande que el dibujo, para los dedos.
    if (visual instanceof Phaser.GameObjects.Image) {
      const area = new Phaser.Geom.Circle(visual.width / 2, visual.height / 2, Math.max(visual.width, visual.height) * 0.55)
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

  private crearRecuerdo(id: 'concha' | 'huella' | 'semilla', resueltos: string[]) {
    if (resueltos.includes(id)) return
    const lugar = LUGARES[id]
    const objeto = this.add.image(lugar.x, lugar.y, id).setScale(1.15).setDepth(9)
    this.tweens.add({
      targets: objeto,
      scale: 1.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.agregarInteractivo(id, `recuerdo_${id}`, objeto, 85, false)
  }

  // Un pequeño anillo donde el jugador tocó, para que sepa hacia dónde camina
  private marcarDestino(x: number, y: number) {
    const anillo = this.add.circle(x, y, 14).setStrokeStyle(3, 0xffffff, 0.9).setDepth(8)
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
      this.tweens.add({
        targets: interactivo.visual,
        alpha: 0,
        scale: interactivo.visual.scale * 1.4,
        duration: 800,
      })
    }
    if (RECUERDOS.includes(id)) {
      this.recuerdosEncontrados += 1
      this.ajustarBruma(900)
    }
  }

  // La Bruma se aclara con cada Recuerdo y desaparece con el faro
  private ajustarBruma(duracion: number) {
    const fuerza = this.faroEncendido ? 0 : 1 - this.recuerdosEncontrados * 0.2
    if (duracion === 0) {
      this.bruma.setAlpha(fuerza)
      this.nubes.forEach((n) => n.setAlpha(fuerza))
      return
    }
    this.tweens.add({ targets: this.bruma, alpha: fuerza, duration: duracion })
    this.tweens.add({ targets: this.nubes, alpha: fuerza, duration: duracion })
  }

  private encenderFaro() {
    if (this.faroEncendido) return
    this.faroEncendido = true
    this.tweens.add({ targets: this.fondoEncendido, alpha: 1, duration: 1500, ease: 'Sine.easeInOut' })
    this.ajustarBruma(1500)
    EventBus.emit('faro-encendido', 'raices')
  }
}
