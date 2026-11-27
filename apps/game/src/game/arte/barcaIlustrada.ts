import type * as Phaser from 'phaser'

// La barca ilustrada. Su vela muestra el diseño de 6 × 6 cuadros que el joven
// crea en el taller de Kiko, siguiendo la curva y las sombras de la tela.
// barca-vela.png es un mapa de la vela: rojo = columna (0 a 1), verde = fila (0 a 1),
// azul = luz de la tela (170 = normal), alfa = dónde hay vela.
export const BARCA = '/personajes/barca.png'
const MAPA_VELA = '/personajes/barca-vela.png'

// Punto de la cubierta donde se para el personaje, relativo al centro de la imagen (392 × 380)
export const CUBIERTA = { x: -24, y: 62 }

const imagenes = new Map<string, Promise<HTMLImageElement>>()
function cargar(url: string) {
  if (!imagenes.has(url)) {
    imagenes.set(
      url,
      new Promise((ok, error) => {
        const img = new Image()
        img.onload = () => ok(img)
        img.onerror = error
        img.src = url
      })
    )
  }
  return imagenes.get(url)!
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Devuelve la barca con la vela pintada (data URL PNG). Sin diseño, la vela queda como en el dibujo.
export async function generarBarca(vela: string[] | null): Promise<string> {
  const [barca, mapa] = await Promise.all([cargar(BARCA), cargar(MAPA_VELA)])
  if (!vela || vela.length !== 36) return BARCA
  const c = document.createElement('canvas')
  c.width = barca.naturalWidth
  c.height = barca.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(mapa, 0, 0, c.width, c.height)
  const uv = ctx.getImageData(0, 0, c.width, c.height).data
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.drawImage(barca, 0, 0)
  const imagen = ctx.getImageData(0, 0, c.width, c.height)
  const px = imagen.data
  const colores = vela.map(hexARgb)

  for (let i = 0; i < px.length; i += 4) {
    const a = uv[i + 3] / 255
    if (a === 0) continue
    const col = Math.min(5, Math.floor((uv[i] / 255) * 6))
    const fila = Math.min(5, Math.floor((uv[i + 1] / 255) * 6))
    const luz = uv[i + 2] / 170
    const [r, g, b] = colores[fila * 6 + col]
    px[i] = px[i] * (1 - a) + Math.min(255, r * luz) * a
    px[i + 1] = px[i + 1] * (1 - a) + Math.min(255, g * luz) * a
    px[i + 2] = px[i + 2] * (1 - a) + Math.min(255, b * luz) * a
  }
  ctx.putImageData(imagen, 0, 0)
  return c.toDataURL('image/png')
}

// Pone en una imagen de Phaser la barca con la vela indicada
export async function vestirBarca(escena: Phaser.Scene, sprite: Phaser.GameObjects.Image, vela: string[] | null) {
  if (!vela) return
  const url = await generarBarca(vela)
  const img = await cargar(url)
  if (!escena.sys.isActive() || !sprite.active) return
  const clave = `barca-${vela.join('').replace(/#/g, '').slice(0, 60)}`
  if (!escena.textures.exists(clave)) escena.textures.addImage(clave, img)
  sprite.setTexture(clave)
}
