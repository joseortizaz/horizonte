// Personaje ilustrado: un dibujo base que se recolorea en el navegador.
// La imagen de zonas indica qué píxeles son piel (rojo), cabello (verde) y sudadera (azul).
// Cada zona se pinta con el color elegido conservando las luces y sombras del dibujo.

const BASE = '/personajes/joven.png'
const ZONAS = '/personajes/joven-zonas.png'

// Color promedio original de cada zona en el dibujo (para conservar el sombreado)
const REFERENCIA = {
  piel: [208, 127, 87],
  cabello: [70, 34, 20],
  ropa: [36, 117, 186],
} as const

export interface ColoresIlustrado {
  piel: string
  cabello: string
  ropa: string
}

const cache = new Map<string, Promise<HTMLImageElement>>()

function cargarImagen(url: string) {
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolver, rechazar) => {
        const img = new Image()
        img.onload = () => resolver(img)
        img.onerror = rechazar
        img.src = url
      })
    )
  }
  return cache.get(url)!
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const luminancia = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

// Devuelve el personaje recoloreado como dirección de imagen (data URL PNG)
export async function generarAvatarIlustrado(colores: ColoresIlustrado): Promise<string> {
  const [base, zonas] = await Promise.all([cargarImagen(BASE), cargarImagen(ZONAS)])
  const ancho = base.naturalWidth
  const alto = base.naturalHeight

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  ctx.drawImage(zonas, 0, 0, ancho, alto)
  const mascara = ctx.getImageData(0, 0, ancho, alto).data
  ctx.clearRect(0, 0, ancho, alto)
  ctx.drawImage(base, 0, 0)
  const imagen = ctx.getImageData(0, 0, ancho, alto)
  const px = imagen.data

  const zonasPintar = [
    { canal: 0, ref: REFERENCIA.piel, objetivo: hexARgb(colores.piel) },
    { canal: 1, ref: REFERENCIA.cabello, objetivo: hexARgb(colores.cabello) },
    { canal: 2, ref: REFERENCIA.ropa, objetivo: hexARgb(colores.ropa) },
  ].map((z) => ({ ...z, lumRef: luminancia(z.ref[0], z.ref[1], z.ref[2]) }))

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue
    let r = px[i]
    let g = px[i + 1]
    let b = px[i + 2]
    const lum = luminancia(r, g, b)
    for (const z of zonasPintar) {
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
  return lienzo.toDataURL('image/png')
}

// Imágenes de los personajes ilustrados
export const IMAGENES = {
  marea: '/personajes/marea.png',
  gota: '/personajes/companero-gota.png',
}

// Carga una imagen (por ejemplo, el personaje recoloreado) y espera a que esté lista
export function cargarElemento(url: string) {
  return cargarImagen(url)
}
