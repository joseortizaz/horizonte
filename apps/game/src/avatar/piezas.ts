// Medidas de las piezas del personaje ilustrado (generadas al recortar los dibujos).
// ancla = centro inferior de los lentes; gafas = ancho de los cristales; ref = color original de cada zona.
export const PIEZAS = {
  altoReferencia: 453.9,
  cuerpos: {
    a: {
      tamano: [164, 352],
      ancla: [96.6, -21.6],
      gafas: 79.6,
      ref: { piel: [193, 113, 74], ropa: [36, 119, 185] },
    },
    b: {
      tamano: [163, 324],
      ancla: [72.0, -23.6],
      gafas: 81.6,
      ref: { piel: [199, 117, 77], ropa: [35, 118, 186] },
    },
    silla: {
      tamano: [290, 315],
      ancla: [152.4, -21.6],
      gafas: 79.2,
      ref: { piel: [200, 117, 77], ropa: [37, 118, 184] },
    },
  },
  cabezas: {
    lacio: {
      tamano: [167, 236],
      ancla: [108.6, 100.4],
      gafas: 79.6,
      ref: { piel: [204, 122, 78], cabello: [70, 36, 21] },
      gorra: { x: 39.3, y: -9.9, ancho: 119.4, alto: 69.5 },
      audifonos: { x: 34.2, y: 6.7, ancho: 148.9, alto: 116.2 },
    },
    rizado: {
      tamano: [150, 216],
      ancla: [62.8, 124.4],
      gafas: 81.6,
      ref: { piel: [211, 129, 84], cabello: [65, 34, 19] },
      gorra: { x: -8.2, y: -7.5, ancho: 122.4, alto: 71.3 },
      audifonos: { x: -13.5, y: 28.3, ancho: 152.6, alto: 119.1 },
    },
    corto: {
      tamano: [128, 193],
      ancla: [52.0, 103.2],
      gafas: 79.2,
      ref: { piel: [210, 126, 82], cabello: [67, 34, 19] },
      gorra: { x: -16.9, y: -7.2, ancho: 118.8, alto: 69.2 },
      audifonos: { x: -22.1, y: 10.0, ancho: 148.1, alto: 115.6 },
    },
    rizada: {
      tamano: [176, 220],
      ancla: [106.4, 102.0],
      gafas: 75.2,
      ref: { piel: [200, 119, 76], cabello: [57, 30, 19] },
      gorra: { x: 41.0, y: -6.7, ancho: 112.8, alto: 65.7 },
      audifonos: { x: 36.1, y: 13.5, ancho: 140.6, alto: 109.8 },
    },
    mono: {
      tamano: [138, 219],
      ancla: [89.6, 129.6],
      gafas: 74.4,
      ref: { piel: [202, 123, 81], cabello: [62, 33, 20] },
      gorra: { x: 24.9, y: -6.5, ancho: 111.6, alto: 65.0 },
      audifonos: { x: 20.0, y: 42.0, ancho: 139.1, alto: 108.6 },
    },
    rapado: {
      tamano: [129, 188],
      ancla: [52.6, 93.6],
      gafas: 81.2,
      ref: { piel: [206, 125, 81], cabello: [86, 47, 31] },
      gorra: { x: -18.0, y: -19.1, ancho: 121.8, alto: 70.9 },
      audifonos: { x: -23.3, y: -2.0, ancho: 151.8, alto: 118.6 },
    },
  },
  gorra: [146, 85],
  audifonos: [187, 146],
} as const
