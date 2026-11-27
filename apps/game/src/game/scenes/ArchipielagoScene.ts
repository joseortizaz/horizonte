import * as Phaser from 'phaser'
import { EventBus } from '../EventBus'
import { avatarSvg, svgADataUri } from '../../avatar/dibujo'
import { IMAGENES } from '../../avatar/ilustrado'
import type { AvatarIlustrado } from '../../avatar/ilustrado'
import { COLOR_MAR } from '../arte/isla'
import { faroPequenoSvg, personaSvg } from '../arte/barca'
import { BARCA, CUBIERTA, vestirBarca } from '../arte/barcaIlustrada'
import { velaActual } from '../estado'
import type { Avatar } from '../../avatar/tipos'
import type { Partida, Posicion } from '../../partida/tipos'

// ======================================================
//  Acto II — Archipiélago de los Oficios
//  El jugador navega en su barca entre seis islitas (una por tipo de interés
//  de Holland, colocadas en hexágono como en su modelo) y una roca central
//  con el muelle de Brisa y el faro.
//  Dibujos provisionales: se reemplazarán por la ilustración del archipiélago.
// ======================================================

export const ARCHIPIELAGO = { ancho: 2190, alto: 1222 }
export const MUNDO_ARCHIPIELAGO = 10 // marca de las posiciones guardadas en esta región

const CENTRO = { x: 1095, y: 611 }
const RADIO_ISLITA = 115
const RADIO_CENTRAL = 120
const VELOCIDAD = 300
const AVISO_POSICION_MS = 5000
const RESOLUCION = 2
const ALTO_COMPANERO = { gota: 70, chispa: 85, pluma: 75, coral: 55 } as const
const ES_TACTIL = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export const ISLITAS = [
  { id: 'realista', nombre: 'Astillero', mentor: 'Don Fermín', ropa: '#a04000', angulo: -120, arena: 0xe8c48a },
  { id: 'investigador', nombre: 'Observatorio', mentor: 'Ana Luz', ropa: '#5b2c6f', angulo: -60, arena: 0xdcd6c8 },
  { id: 'artistico', nombre: 'Taller de colores', mentor: 'Kiko', ropa: '#e74c3c', angulo: 0, arena: 0xf5cba7 },
  { id: 'social', nombre: 'Escuela', mentor: 'Doña Altagracia', ropa: '#1e8449', angulo: 60, arena: 0xf2d7a6 },
  { id: 'emprendedor', nombre: 'Mercadito', mentor: 'Yaritza', ropa: '#d68910', angulo: 120, arena: 0xf8d49a },
  { id: 'convencional', nombre: 'Capitanía', mentor: 'Ramón', ropa: '#2e4053', angulo: 180, arena: 0xe5d3b3 },
] as const

function posicionIslita(angulo: number) {
  const a = Phaser.Math.DegToRad(angulo)
  return { x: CENTRO.x + Math.cos(a) * 640, y: CENTRO.y + Math.sin(a) * 340 }
}

// Punto sobre la orilla de una isla, del lado que mira al centro (o en el ángulo dado)
function haciaCentro(x: number, y: number, distancia: number) {
  const a = Math.atan2(CENTRO.y - y, CENTRO.x - x)
  return { x: x + Math.cos(a) * distancia, y: y + Math.sin(a) * distancia }
}

interface Interactivo {
  id: string
  nudo: string
  x: number
  y: number
  radio: number
  visual: Phaser.GameObjects.Image | Phaser.GameObjects.Text
  activo: boolean
  automatico: boolean
}

export class ArchipielagoScene extends Phaser.Scene {
  private barca!: Phaser.GameObjects.Image
  private avatarEnBarca!: Phaser.GameObjects.Image
  private companero!: Phaser.GameObjects.Image
  private faro!: Phaser.GameObjects.Image
  private eco: Phaser.GameObjects.Image | null = null
  private indicadorBrisa!: Phaser.GameObjects.Text
  private avisoInteractuar!: Phaser.GameObjects.Text
  private marcasTaller = new Map<string, Phaser.GameObjects.Text>()
  private brillos: Phaser.GameObjects.Ellipse[] = []
  private interactivos: Interactivo[] = []
  private cercanoActual: Interactivo | null = null
  private flechas!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private teclaHablar!: Phaser.Input.Keyboard.Key
  private teclaEspacio!: Phaser.Input.Keyboard.Key
  private destino: Phaser.Math.Vector2 | null = null
  private enDialogo = false
  private ignorarToque = false
  private faroEncendido = false
  private talleres = new Set<string>()
  private resueltos: string[] = []
  private ultimaPosicionAvisada = new Phaser.Math.Vector2()
  private ultimoAviso = 0
  private escalaAvatar = 1

  constructor() {
    super('ArchipielagoScene')
  }

  preload() {
    const avatar = this.registry.get('avatar') as Avatar
    const svg = (clave: string, contenido: string) =>
      this.load.svg(clave, svgADataUri(contenido), { scale: RESOLUCION })
    if (!this.registry.get('avatarImagen') && !this.textures.exists('avatar')) svg('avatar', avatarSvg(avatar.apariencia))
    if (!this.textures.exists('companero')) this.load.image('companero', IMAGENES[avatar.companero])
    if (!this.textures.exists('eco')) this.load.image('eco', IMAGENES.eco)
    if (!this.textures.exists('barca')) this.load.image('barca', BARCA)
    svg('faro-apagado', faroPequenoSvg(false))
    svg('faro-encendido', faroPequenoSvg(true))
    svg('brisa', personaSvg('#2874a6', '#d9a066', '#7b4a24'))
    for (const i of ISLITAS) svg(`mentor-${i.id}`, personaSvg(i.ropa))
  }

  create() {
    const partida = this.registry.get('partida') as Partida
    const avatar = this.registry.get('avatar') as Avatar
    const avatarImagen = this.registry.get('avatarImagen') as HTMLImageElement | null
    if (avatarImagen && !this.textures.exists('avatar')) this.textures.addImage('avatar', avatarImagen)
    this.resueltos = (this.registry.get('resueltos') as string[]) ?? []
    this.faroEncendido = partida.faros.includes('oficios')
    this.talleres = new Set(ISLITAS.map((i) => i.id).filter((id) => this.resueltos.includes(`taller:${id}`)))
    this.interactivos = []
    this.brillos = []
    this.marcasTaller.clear()
    this.eco = null

    const camara = this.cameras.main
    camara.setBounds(0, 0, ARCHIPIELAGO.ancho, ARCHIPIELAGO.alto)
    const centrar = () => camara.centerOn(CENTRO.x, CENTRO.y)
    centrar()
    this.scale.on('resize', centrar)

    this.dibujarMar()

    // --- Islitas ---
    for (const isla of ISLITAS) {
      const p = posicionIslita(isla.angulo)
      this.dibujarIslita(p.x, p.y, RADIO_ISLITA, isla.arena, isla.nombre)
      const lugarMentor = haciaCentro(p.x, p.y, RADIO_ISLITA - 30)
      const mentor = this.add.image(lugarMentor.x, lugarMentor.y - 30, `mentor-${isla.id}`).setScale(0.5).setDepth(6)
      this.add
        .text(lugarMentor.x, lugarMentor.y + 16, isla.mentor, this.estiloEtiqueta(15))
        .setOrigin(0.5, 0)
        .setDepth(6)
      const muelle = haciaCentro(p.x, p.y, RADIO_ISLITA + 55)
      this.agregarInteractivo(isla.id, `mentor_${isla.id}`, mentor, 120, false, muelle.x, muelle.y)
      const marca = this.add
        .text(p.x + 50, p.y - 70, '★', { fontSize: '38px', color: '#ffd54f', stroke: '#7d6608', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(7)
        .setVisible(this.talleres.has(isla.id))
      this.marcasTaller.set(isla.id, marca)
    }

    // --- Roca central: Brisa (muelle sur), faro (norte) y el letrero de regreso (oeste) ---
    this.dibujarIslita(CENTRO.x, CENTRO.y, RADIO_CENTRAL, 0xd5c4a1, '')
    this.add.rectangle(CENTRO.x, CENTRO.y + RADIO_CENTRAL + 10, 34, 70, 0x8b5a2b).setStrokeStyle(3, 0x3b2a1a).setDepth(3)

    const brisa = this.add.image(CENTRO.x + 60, CENTRO.y + RADIO_CENTRAL - 55, 'brisa').setScale(0.5).setDepth(6)
    this.add.text(brisa.x, brisa.y + 42, 'Brisa', this.estiloEtiqueta(15)).setOrigin(0.5, 0).setDepth(6)
    this.agregarInteractivo('brisa', 'brisa', brisa, 140, false, CENTRO.x, CENTRO.y + RADIO_CENTRAL + 70)
    this.indicadorBrisa = this.add
      .text(brisa.x, brisa.y - 60, '!', { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffd54f', stroke: '#1c2833', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(this.brisaEspera())
    this.tweens.add({ targets: this.indicadorBrisa, y: this.indicadorBrisa.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.faro = this.add
      .image(CENTRO.x - 20, CENTRO.y - 45, this.faroEncendido ? 'faro-encendido' : 'faro-apagado')
      .setScale(0.6)
      .setDepth(5)
    this.agregarInteractivo('faro', 'faro_oficios', this.faro, 140, false, CENTRO.x, CENTRO.y - RADIO_CENTRAL - 60)

    const letrero = this.add
      .text(CENTRO.x - RADIO_CENTRAL + 10, CENTRO.y + 10, '◀ Raíces', this.estiloEtiqueta(17))
      .setOrigin(0.5)
      .setDepth(6)
    this.agregarInteractivo('muelle', 'muelle_oficios', letrero, 120, false, CENTRO.x - RADIO_CENTRAL - 60, CENTRO.y + 10)

    if (this.faroEncendido) this.iluminarIslitas(0)
    this.actualizarEco()

    // --- Barca del jugador, su personaje y el compañero ---
    const inicio = this.posicionInicial(partida.posicion)
    this.barca = this.add.image(inicio.x, inicio.y, 'barca').setScale(0.45).setDepth(9)
    void vestirBarca(this, this.barca, velaActual())
    const forma = this.registry.get('avatarForma') as AvatarIlustrado | null
    this.avatarEnBarca = this.add.image(inicio.x, inicio.y, 'avatar').setDepth(10)
    if (avatarImagen && forma) {
      this.escalaAvatar = 80 / forma.altoReferencia
      this.avatarEnBarca.setOrigin(forma.piesX / forma.ancho, forma.piesY / forma.alto)
    } else {
      this.escalaAvatar = 80 / this.avatarEnBarca.height
      this.avatarEnBarca.setOrigin(0.5, 1)
    }
    this.avatarEnBarca.setScale(this.escalaAvatar)
    const alto = ALTO_COMPANERO[avatar.companero] ?? 70
    this.companero = this.add.image(inicio.x - 70, inicio.y - 70, 'companero').setDepth(11)
    this.companero.setScale(alto / this.companero.height)
    this.ultimaPosicionAvisada.set(inicio.x, inicio.y)

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
    this.avisoInteractuar.on('pointerdown', () => {
      if (this.enDialogo || !this.cercanoActual) return
      this.ignorarToque = true
      this.destino = null
      this.interactuar(this.cercanoActual)
    })

    this.add
      .text(24, 20, 'Archipiélago de los Oficios', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0e2a3d',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20)

    // --- Controles ---
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

    // --- Mensajes desde React ---
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
    const alCambiarVela = (vela: string[] | null) => this.cambiarVela(vela)
    const alCambiarEscena = (datos: { escena: string; partida: Partida; resueltos: string[] }) => {
      if (datos.escena === this.scene.key) return
      this.registry.set('partida', datos.partida)
      this.registry.set('resueltos', datos.resueltos)
      this.registry.set('llegaEnBarca', true)
      this.scene.start(datos.escena)
    }

    EventBus.on('dialogo-abierto', alAbrirDialogo)
    EventBus.on('dialogo-cerrado', alCerrarDialogo)
    EventBus.on('pausar', alAbrirDialogo)
    EventBus.on('reanudar', alCerrarDialogo)
    EventBus.on('resolver', alResolver)
    EventBus.on('encender-faro', alEncenderFaro)
    EventBus.on('vela-cambiada', alCambiarVela)
    EventBus.on('cambiar-escena', alCambiarEscena)

    const esCampoDeTexto = (e: EventTarget | null) =>
      e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ||
      (e instanceof HTMLElement && e.isContentEditable)
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
      EventBus.off('vela-cambiada', alCambiarVela)
      EventBus.off('cambiar-escena', alCambiarEscena)
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, limpiar)
    this.events.once(Phaser.Scenes.Events.DESTROY, limpiar)

    EventBus.emit('escena-lista', 'oficios')
  }

  update(time: number, delta: number) {
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
      this.destino = null
      const paso = new Phaser.Math.Vector2(dx, dy).normalize().scale(VELOCIDAD * dt)
      this.mover(paso.x, paso.y)
    } else if (this.destino) {
      const distancia = Phaser.Math.Distance.Between(this.barca.x, this.barca.y, this.destino.x, this.destino.y)
      if (distancia < 4) {
        this.destino = null
      } else {
        const angulo = Phaser.Math.Angle.Between(this.barca.x, this.barca.y, this.destino.x, this.destino.y)
        const avance = Math.min(VELOCIDAD * dt, distancia)
        if (!this.mover(Math.cos(angulo) * avance, Math.sin(angulo) * avance)) this.destino = null
      }
    }

    // La barca se mece; el personaje va encima y el compañero vuela al lado
    const meneo = Math.sin(time / 500) * 3
    this.barca.setAngle(Math.sin(time / 700) * 2)
    // El personaje va de pie en la cubierta (la barca se voltea según hacia dónde navega)
    const lado = this.barca.flipX ? -1 : 1
    this.avatarEnBarca.setPosition(this.barca.x + CUBIERTA.x * 0.45 * lado, this.barca.y + CUBIERTA.y * 0.45 + meneo)
    this.avatarEnBarca.setDepth(this.barca.depth + 0.5)
    const suavidad = Math.min(1, dt * 4)
    this.companero.x += (this.barca.x - 80 - this.companero.x) * suavidad
    this.companero.y += (this.barca.y - 90 + Math.sin(time / 300) * 6 - this.companero.y) * suavidad

    const cercano = this.interactivoCercano()
    this.cercanoActual = cercano
    const pidio = Phaser.Input.Keyboard.JustDown(this.teclaHablar) || Phaser.Input.Keyboard.JustDown(this.teclaEspacio)
    if (cercano?.automatico) {
      cercano.automatico = false
      this.interactuar(cercano)
    } else if (cercano) {
      this.avisoInteractuar.setPosition(this.barca.x, this.barca.y + 80).setVisible(true)
      if (pidio) this.interactuar(cercano)
    } else {
      this.avisoInteractuar.setVisible(false)
    }

    if (time - this.ultimoAviso > AVISO_POSICION_MS) {
      this.ultimoAviso = time
      if (Phaser.Math.Distance.Between(this.barca.x, this.barca.y, this.ultimaPosicionAvisada.x, this.ultimaPosicionAvisada.y) > 2) {
        this.ultimaPosicionAvisada.set(this.barca.x, this.barca.y)
        const posicion: Posicion = { x: Math.round(this.barca.x), y: Math.round(this.barca.y), mundo: MUNDO_ARCHIPIELAGO }
        EventBus.emit('posicion', posicion)
      }
    }
  }

  // ¿Se puede navegar aquí? (agua, lejos de las orillas y dentro del mapa)
  private enAgua(x: number, y: number) {
    if (x < 70 || y < 70 || x > ARCHIPIELAGO.ancho - 70 || y > ARCHIPIELAGO.alto - 70) return false
    if (Phaser.Math.Distance.Between(x, y, CENTRO.x, CENTRO.y) < RADIO_CENTRAL + 45) return false
    return ISLITAS.every((i) => {
      const p = posicionIslita(i.angulo)
      return Phaser.Math.Distance.Between(x, y, p.x, p.y) > RADIO_ISLITA + 45
    })
  }

  private mover(dx: number, dy: number) {
    const { x, y } = this.barca
    if (dx !== 0) this.barca.setFlipX(dx < 0)
    if (this.enAgua(x + dx, y + dy)) {
      this.barca.setPosition(x + dx, y + dy)
      return true
    }
    if (this.enAgua(x + dx, y)) {
      this.barca.x = x + dx
      return true
    }
    if (this.enAgua(x, y + dy)) {
      this.barca.y = y + dy
      return true
    }
    return false
  }

  private posicionInicial(guardada: Posicion | null) {
    const muelle = { x: CENTRO.x, y: CENTRO.y + RADIO_CENTRAL + 110 }
    if (!guardada || guardada.mundo !== MUNDO_ARCHIPIELAGO) return muelle
    return this.enAgua(guardada.x, guardada.y) ? { x: guardada.x, y: guardada.y } : muelle
  }

  private dibujarMar() {
    this.add.rectangle(0, 0, ARCHIPIELAGO.ancho, ARCHIPIELAGO.alto, Phaser.Display.Color.HexStringToColor(COLOR_MAR).color).setOrigin(0)
    const olas = this.add.graphics().setDepth(1)
    olas.lineStyle(3, 0xffffff, 0.18)
    const azar = new Phaser.Math.RandomDataGenerator(['oficios'])
    for (let i = 0; i < 70; i++) {
      const x = azar.between(40, ARCHIPIELAGO.ancho - 40)
      const y = azar.between(40, ARCHIPIELAGO.alto - 40)
      olas.beginPath()
      olas.arc(x, y, 16, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340))
      olas.strokePath()
    }
  }

  private dibujarIslita(x: number, y: number, r: number, arena: number, nombre: string) {
    const g = this.add.graphics().setDepth(2)
    g.fillStyle(0x7fd3f0, 0.45).fillCircle(x, y, r + 32)
    g.fillStyle(arena, 1).fillCircle(x, y, r)
    g.fillStyle(0x58a55c, 1).fillEllipse(x - r * 0.15, y - r * 0.25, r * 1.1, r * 0.8)
    g.fillStyle(0x3d7d41, 1).fillCircle(x - r * 0.45, y - r * 0.35, r * 0.22)
    if (nombre) {
      g.fillStyle(0xfdf2e9, 1).fillRect(x - 28, y - 46, 56, 40)
      g.fillStyle(0xa93226, 1).fillTriangle(x - 36, y - 46, x + 36, y - 46, x, y - 76)
      g.lineStyle(3, 0x1c2833, 1).strokeRect(x - 28, y - 46, 56, 40)
      this.add.text(x, y - r - 40, nombre, this.estiloEtiqueta(20)).setOrigin(0.5).setDepth(6)
    }
  }

  private estiloEtiqueta(tamano: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'sans-serif',
      fontSize: `${tamano}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#0e2a3d',
      strokeThickness: 4,
    }
  }

  private agregarInteractivo(id: string, nudo: string, visual: Interactivo['visual'], radio: number, automatico: boolean, x: number, y: number) {
    const interactivo: Interactivo = { id, nudo, x, y, radio, visual, activo: true, automatico }
    this.interactivos.push(interactivo)
    visual.setInteractive({ useHandCursor: true })
    visual.on('pointerdown', () => {
      if (this.enDialogo || !interactivo.activo) return
      this.ignorarToque = true
      if (this.distanciaA(interactivo) < interactivo.radio) {
        this.destino = null
        this.interactuar(interactivo)
      } else {
        // Tocar algo lejano: navegar hasta su muelle
        this.destino = new Phaser.Math.Vector2(x, y)
        this.marcarDestino(x, y)
      }
    })
  }

  private distanciaA(i: Interactivo) {
    return Phaser.Math.Distance.Between(this.barca.x, this.barca.y, i.x, i.y)
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

  private interactuar(i: Interactivo) {
    if (i.id === 'brisa') this.indicadorBrisa.setVisible(false)
    this.avisoInteractuar.setVisible(false)
    EventBus.emit('hablar', i.nudo)
  }

  private marcarDestino(x: number, y: number) {
    const anillo = this.add.circle(x, y, 14).setStrokeStyle(3, 0xffffff, 0.9).setDepth(8)
    this.tweens.add({ targets: anillo, scale: 2, alpha: 0, duration: 500, onComplete: () => anillo.destroy() })
  }

  private brisaEspera() {
    return !this.resueltos.includes('brisa') || (this.faroEncendido && !this.resueltos.includes('brisa-despedida'))
  }

  // El Eco aparece cerca del faro cuando ya se visitaron cuatro islitas
  private actualizarEco() {
    if (this.eco || this.resueltos.includes('eco-oficios') || this.faroEncendido || this.talleres.size < 4) return
    // A la derecha del faro, en el canal hacia el taller de colores
    const x = CENTRO.x + 270
    const y = CENTRO.y - 20
    this.eco = this.add.image(x, y, 'eco').setDepth(9).setAlpha(0)
    this.eco.setScale(170 / this.eco.height)
    this.tweens.add({ targets: this.eco, alpha: 0.85, duration: 1200 })
    this.tweens.add({ targets: this.eco, y: y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.agregarInteractivo('eco', 'eco_oficios', this.eco, 170, true, x, y + 60)
  }

  private resolver(id: string) {
    this.resueltos.push(id)
    if (id.startsWith('taller:')) {
      const taller = id.slice(7)
      this.talleres.add(taller)
      const marca = this.marcasTaller.get(taller)
      if (marca && !marca.visible) {
        marca.setVisible(true).setScale(0)
        this.tweens.add({ targets: marca, scale: 1, duration: 600, ease: 'Back.easeOut' })
      }
      this.actualizarEco()
    } else if (id === 'eco') {
      const i = this.interactivos.find((x) => x.id === 'eco')
      if (i && this.eco) {
        i.activo = false
        this.eco.disableInteractive()
        this.tweens.killTweensOf(this.eco)
        this.tweens.add({ targets: this.eco, alpha: 0, scale: this.eco.scale * 1.4, duration: 800 })
      }
    }
  }

  private iluminarIslitas(duracion: number) {
    for (const isla of ISLITAS) {
      const p = posicionIslita(isla.angulo)
      const brillo = this.add.ellipse(p.x, p.y, (RADIO_ISLITA + 50) * 2, (RADIO_ISLITA + 50) * 2, 0xfff3b0, 0).setDepth(1.5)
      this.tweens.add({ targets: brillo, fillAlpha: 0.35, duration: Math.max(1, duracion), delay: duracion ? ISLITAS.indexOf(isla) * 200 : 0 })
      this.brillos.push(brillo)
    }
  }

  private encenderFaro() {
    if (this.faroEncendido) return
    this.faroEncendido = true
    this.faro.setTexture('faro-encendido')
    this.iluminarIslitas(800)
    this.indicadorBrisa.setVisible(true)
    EventBus.emit('faro-encendido', 'oficios')
  }

  private cambiarVela(vela: string[] | null) {
    if (this.barca) void vestirBarca(this, this.barca, vela)
  }
}
