// Personaje ilustrado: se arma con piezas recortadas de los dibujos (cuerpo, cabeza,
// lentes, gorra o audífonos) y se recolorea en el navegador.
// Cada pieza tiene una imagen de zonas: rojo = piel, verde = cabello, azul = sudadera.
// El color nuevo conserva las luces y sombras del dibujo.
import type { Apariencia, Peinado } from './tipos'
import { PIEZAS } from './piezas'

const RUTA = '/personajes/'

type Rgb = readonly number[]
interface Referencias {
  piel?: Rgb
  cabello?: Rgb
  ropa?: Rgb
}

export interface ColoresIlustrado {
  piel: string
  cabello: string
  ropa: string
}

// Resultado: la imagen y dónde quedan los pies, para colocarla en el juego
export interface AvatarIlustrado {
  url: string
  ancho: number
  alto: number
  piesX: number
  piesY: number
  anchoCuerpo: number
  altoReferencia: number
}

// Qué dibujo de cabeza corresponde a cada peinado
const CABEZAS: Record<Peinado, keyof typeof PIEZAS.cabezas> = {
  corto: 'corto',
  largo: 'lacio',
  rizado: 'rizado',
  'rizado-largo': 'rizada',
  mono: 'mono',
  rapado: 'rapado',
}

const cache = new Map<string, Promise<HTMLImageElement>>()

function cargarImagen(url: string) {
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolver, rechazar) => {
        const img = new Image()
        img.onload = () => resolver(img)
        img.onerror = () => {
          cache.delete(url)
          rechazar(new Error(`No se pudo cargar ${url}`))
        }
        img.src = url
      })
    )
  }
  return cache.get(url)!
}

export function cargarElemento(url: string) {
  return cargarImagen(url)
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const luminancia = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

function lienzo(ancho: number, alto: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(ancho))
  c.height = Math.max(1, Math.ceil(alto))
  return c
}

// Pinta las zonas de una pieza con los colores elegidos
async function piezaColoreada(nombre: string, ref: Referencias, colores: ColoresIlustrado) {
  const [base, zonas] = await Promise.all([
    cargarImagen(`${RUTA}${nombre}.png`),
    cargarImagen(`${RUTA}${nombre}-zonas.png`),
  ])
  const c = lienzo(base.naturalWidth, base.naturalHeight)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(zonas, 0, 0, c.width, c.height)
  const mascara = ctx.getImageData(0, 0, c.width, c.height).data
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.drawImage(base, 0, 0)
  const imagen = ctx.getImageData(0, 0, c.width, c.height)
  const px = imagen.data

  const pintar = (
    [
      { canal: 0, ref: ref.piel, color: colores.piel },
      { canal: 1, ref: ref.cabello, color: colores.cabello },
      { canal: 2, ref: ref.ropa, color: colores.ropa },
    ] as const
  )
    .filter((z) => z.ref)
    .map((z) => ({ canal: z.canal, objetivo: hexARgb(z.color), lumRef: luminancia(z.ref![0], z.ref![1], z.ref![2]) }))

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue
    let r = px[i]
    let g = px[i + 1]
    let b = px[i + 2]
    const lum = luminancia(r, g, b)
    for (const z of pintar) {
      const m = mascara[i + z.canal] / 255
      if (m === 0) continue
      const f = lum / z.lumRef
      r = r * (1 - m) + Math.min(255, z.objetivo[0] * f) * m
      g = g * (1 - m) + Math.min(255, z.objetivo[1] * f) * m
      b = b * (1 - m) + Math.min(255, z.objetivo[2] * f) * m
    }
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
  }
  ctx.putImageData(imagen, 0, 0)
  return c
}

// Arma el personaje completo según la apariencia elegida
export async function generarAvatarIlustrado(a: Apariencia): Promise<AvatarIlustrado> {
  const claveCuerpo = a.movilidad === 'silla' ? 'silla' : a.cuerpo
  const claveCabeza = CABEZAS[a.peinado] ?? 'corto'
  const B = PIEZAS.cuerpos[claveCuerpo]
  const C = PIEZAS.cabezas[claveCabeza]
  const colores = { piel: a.piel, cabello: a.cabello, ropa: a.ropa }

  const extra = a.accesorio === 'gorra' || a.accesorio === 'audifonos' ? a.accesorio : null
  const [cuerpo, cabeza, lentes, accesorio] = await Promise.all([
    piezaColoreada(`cuerpo-${claveCuerpo}`, B.ref, colores),
    piezaColoreada(`cabeza-${claveCabeza}`, C.ref, colores),
    a.lentes ? cargarImagen(`${RUTA}cabeza-${claveCabeza}-lentes.png`) : null,
    extra ? cargarImagen(`${RUTA}${extra}.png`) : null,
  ])

  // La cabeza se escala y se coloca para que sus lentes coincidan con los del cuerpo original
  const s = B.gafas / C.gafas
  const cab = { x: B.ancla[0] - C.ancla[0] * s, y: B.ancla[1] - C.ancla[1] * s, w: C.tamano[0] * s, h: C.tamano[1] * s }
  const acc = extra
    ? {
        x: cab.x + C[extra].x * s,
        y: cab.y + C[extra].y * s,
        w: C[extra].ancho * s,
        h: C[extra].alto * s,
      }
    : null

  const cajas = [{ x: 0, y: 0, w: B.tamano[0], h: B.tamano[1] }, cab, ...(acc ? [acc] : [])]
  const minX = Math.floor(Math.min(...cajas.map((c) => c.x)))
  const minY = Math.floor(Math.min(...cajas.map((c) => c.y)))
  const maxX = Math.ceil(Math.max(...cajas.map((c) => c.x + c.w)))
  const maxY = Math.ceil(Math.max(...cajas.map((c) => c.y + c.h)))

  const c = lienzo(maxX - minX, maxY - minY)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  // La cabeza va detrás del cuerpo, para que la capucha tape el cuello
  ctx.drawImage(cabeza, cab.x - minX, cab.y - minY, cab.w, cab.h)
  if (lentes) ctx.drawImage(lentes, cab.x - minX, cab.y - minY, cab.w, cab.h)
  ctx.drawImage(cuerpo, -minX, -minY)
  if (accesorio && acc) ctx.drawImage(accesorio, acc.x - minX, acc.y - minY, acc.w, acc.h)

  return {
    url: c.toDataURL('image/png'),
    ancho: c.width,
    alto: c.height,
    piesX: B.tamano[0] / 2 - minX,
    piesY: B.tamano[1] - minY,
    anchoCuerpo: B.tamano[0],
    altoReferencia: PIEZAS.altoReferencia,
  }
}

// Imágenes de los otros personajes ilustrados
export const IMAGENES = {
  marea: '/personajes/marea.png',
  gota: '/personajes/companero-gota.png',
  chispa: '/personajes/companero-chispa.png',
  pluma: '/personajes/companero-pluma.png',
  coral: '/personajes/companero-coral.png',
}
