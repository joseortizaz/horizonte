// Isla de las Raíces.
// El fondo es la ilustración de public/fondos (2400 × 1790), mostrada a 1600 × 1193.
// Alrededor, el mar se extiende con el color de fondo del juego para ocupar toda
// la pantalla, sin franjas a los lados.
// Más abajo quedan funciones para dibujar una versión en SVG (respaldo).

export const MUNDO = { ancho: 1600, alto: 1193 }

// Fondos ilustrados: faro apagado y faro encendido
export const FONDOS = {
  apagado: '/fondos/isla-raices-apagado.jpg',
  encendido: '/fondos/isla-raices-encendido.jpg',
  escala: 1600 / 2400,
}

// Color del mar en los bordes de la ilustración (debe coincidir con el fondo de Phaser)
export const COLOR_MAR = '#0568a5'

// Zona caminable: una elipse algo más pequeña que la arena de la ilustración
export const ISLA = { cx: 815, cy: 590, rx: 615, ry: 318 }

// Números pseudoaleatorios con semilla: la isla se dibuja igual cada vez
function generador(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

// Contorno irregular de la isla, suavizado con curvas
function contorno(escala: number, cx = 820, cy = 470, rx = 640, ry = 318) {
  const puntos: [number, number][] = []
  const n = 48
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const r = 1 + 0.05 * Math.sin(3 * t + 1) + 0.035 * Math.sin(5 * t + 2.2) + 0.02 * Math.sin(8 * t + 0.4)
    puntos.push([cx + Math.cos(t) * rx * r * escala, cy + Math.sin(t) * ry * r * escala])
  }
  // Catmull-Rom a curvas Bézier
  let d = `M${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = puntos[(i - 1 + n) % n]
    const p1 = puntos[i]
    const p2 = puntos[(i + 1) % n]
    const p3 = puntos[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

function roca(x: number, y: number, s: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="0" cy="26" rx="58" ry="12" fill="#000" opacity="0.15"/>
<path d="M-55 24 L-48 -8 L-22 -30 L14 -34 L44 -16 L56 10 L50 26 Z" fill="#7d858d"/>
<path d="M-48 -8 L-22 -30 L14 -34 L44 -16 L20 -12 L-10 -14 Z" fill="#a9b0b7"/>
<path d="M44 -16 L56 10 L50 26 L30 22 L20 -12 Z" fill="#646b72"/>
</g>`
}

function rocaEnAgua(x: number, y: number, s: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="0" cy="14" rx="62" ry="18" fill="#ffffff" opacity="0.55"/>
<ellipse cx="0" cy="14" rx="48" ry="12" fill="#2bb6c9"/>
<path d="M-40 14 L-32 -12 L-6 -26 L22 -22 L40 -4 L42 14 Z" fill="#7d858d"/>
<path d="M-32 -12 L-6 -26 L22 -22 L40 -4 L10 -6 Z" fill="#a9b0b7"/>
</g>`
}

function matorral(x: number, y: number, s: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="0" cy="18" rx="54" ry="10" fill="#000" opacity="0.12"/>
<circle cx="-28" cy="2" r="22" fill="#3f8f2f"/>
<circle cx="4" cy="-8" r="28" fill="#4fa83a"/>
<circle cx="32" cy="4" r="20" fill="#3f8f2f"/>
<circle cx="-4" cy="-16" r="14" fill="#6cc24f"/>
<circle cx="22" cy="-6" r="10" fill="#6cc24f"/>
</g>`
}

function hierba(x: number, y: number, s: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#4fa83a">
<path d="M0 0 Q-10 -18 -16 -22 Q-6 -14 -2 0 Z"/>
<path d="M2 0 Q2 -24 4 -30 Q6 -18 6 0 Z"/>
<path d="M6 0 Q14 -16 22 -20 Q14 -10 10 0 Z"/>
</g>`
}

function palmera(x: number, y: number) {
  const hojas = [
    [-120, -10], [-95, -60], [-40, -95], [30, -95], [95, -55], [120, -5], [70, 20], [-70, 20],
  ]
    .map(
      ([hx, hy]) =>
        `<path d="M0 0 Q${hx * 0.5} ${hy * 0.6 - 30} ${hx} ${hy} Q${hx * 0.55} ${hy * 0.35 - 6} 0 6 Z" fill="#3e9a35" stroke="#2e7a27" stroke-width="2"/>`
    )
    .join('')
  return `<g transform="translate(${x} ${y})">
<ellipse cx="40" cy="230" rx="70" ry="14" fill="#000" opacity="0.15"/>
<path d="M30 230 Q20 140 -10 10 L10 6 Q44 140 52 230 Z" fill="#9c6b3c"/>
${[200, 170, 140, 110, 80, 50, 24].map((yy) => `<path d="M${16 + (230 - yy) * -0.12} ${yy} l26 -4" stroke="#7a5230" stroke-width="3"/>`).join('')}
<g transform="translate(0 4)">${hojas}</g>
<circle cx="-6" cy="12" r="9" fill="#7a5230"/><circle cx="8" cy="14" r="9" fill="#6b4626"/>
</g>`
}

export function fondoIslaSvg() {
  const al = generador(7)
  const { ancho, alto } = MUNDO

  // Olas del mar
  let olas = ''
  for (let i = 0; i < 140; i++) {
    const x = al() * ancho
    const y = al() * alto
    const dx = ((x - 820) / 700) ** 2 + ((y - 470) / 380) ** 2
    if (dx < 1.15) continue
    const w = 18 + al() * 26
    olas += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(w / 4).toFixed(1)} -6 ${(w / 2).toFixed(1)} 0 t${(w / 2).toFixed(1)} 0" fill="none" stroke="#3d8bd6" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`
  }

  // Piedritas sobre la arena
  let piedritas = ''
  for (let i = 0; i < 90; i++) {
    const t = al() * Math.PI * 2
    const r = Math.sqrt(al()) * 0.9
    const x = ISLA.cx + Math.cos(t) * ISLA.rx * r
    const y = ISLA.cy + Math.sin(t) * ISLA.ry * r
    const gris = al() > 0.6
    piedritas += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(3 + al() * 5).toFixed(1)}" ry="${(2 + al() * 3).toFixed(1)}" fill="${gris ? '#b8b2a7' : '#dcb57a'}" opacity="${gris ? 0.9 : 0.8}"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
<defs>
  <radialGradient id="arena" cx="50%" cy="45%" r="60%">
    <stop offset="0" stop-color="#f8dca2"/>
    <stop offset="0.75" stop-color="#f1cd8a"/>
    <stop offset="1" stop-color="#e5b670"/>
  </radialGradient>
</defs>
<rect width="${ancho}" height="${alto}" fill="${COLOR_MAR}"/>
${olas}
<path d="${contorno(1.16)}" fill="#1e86c6" opacity="0.9"/>
<path d="${contorno(1.1)}" fill="#29aec7"/>
<path d="${contorno(1.055)}" fill="#5fd0d8"/>
<path d="${contorno(1.03)}" fill="none" stroke="#ffffff" stroke-width="9" opacity="0.9"/>
<path d="${contorno(1.0)}" fill="url(#arena)"/>
<path d="${contorno(0.985)}" fill="none" stroke="#f9e2b3" stroke-width="5" opacity="0.8"/>
${piedritas}
${rocaEnAgua(170, 760, 1.1)}${rocaEnAgua(1440, 640, 0.8)}${rocaEnAgua(1470, 180, 0.55)}${rocaEnAgua(1330, 800, 0.5)}
<!-- Pasto alrededor del faro -->
<path d="M1080 330 Q1060 250 1140 220 Q1250 190 1320 250 Q1360 320 1300 360 Q1180 390 1080 330 Z" fill="#5db342"/>
<path d="M1100 330 Q1090 270 1150 245 Q1240 220 1300 270 Q1320 320 1280 345 Q1180 370 1100 330 Z" fill="#6cc24f"/>
${roca(1110, 330, 0.55)}${roca(1290, 345, 0.6)}${roca(1225, 375, 0.45)}
<!-- Rocas y palmera al noroeste -->
<path d="M330 400 Q300 330 380 300 Q470 280 540 330 Q560 400 480 420 Q390 440 330 400 Z" fill="#5db342"/>
${palmera(500, 120)}
${roca(410, 340, 1.0)}${roca(470, 390, 0.85)}${roca(360, 395, 0.7)}
${matorral(330, 420, 0.8)}${matorral(545, 395, 0.7)}
<!-- Roca grande con pasto al sureste -->
<path d="M1020 650 Q1010 590 1090 575 Q1190 560 1240 610 Q1250 670 1170 690 Q1080 705 1020 650 Z" fill="#5db342"/>
${roca(1130, 610, 1.15)}${matorral(1225, 630, 0.6)}
<g fill="#ffffff"><circle cx="1060" cy="660" r="5"/><circle cx="1078" cy="668" r="4"/><circle cx="1095" cy="662" r="5"/></g>
<g fill="#f7dc6f"><circle cx="1060" cy="660" r="2"/><circle cx="1078" cy="668" r="1.6"/><circle cx="1095" cy="662" r="2"/></g>
<!-- Detalles -->
${roca(340, 560, 0.45)}${roca(935, 700, 0.4)}${roca(1010, 240, 0.25)}
${hierba(560, 690, 1.2)}${hierba(1330, 470, 1.1)}${hierba(700, 250, 0.9)}${hierba(250, 520, 1)}${hierba(980, 520, 0.8)}
</svg>`
}

// El faro: torre blanca con franjas rojas. Encendido, la linterna brilla.
export function faroSvg(encendido: boolean) {
  const luz = encendido ? '#fff3b0' : '#5d6d7e'
  const brillo = encendido ? '<circle cx="60" cy="58" r="16" fill="#ffd54f"/>' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="250" viewBox="0 0 120 250">
<ellipse cx="60" cy="238" rx="50" ry="10" fill="#000" opacity="0.2"/>
<path d="M34 236 L42 96 L78 96 L86 236 Z" fill="#f4f1ea"/>
<path d="M60 96 L78 96 L86 236 L60 236 Z" fill="#dcd6c9"/>
<path d="M38 176 L82 176 L84 206 L36 206 Z" fill="#c0392b"/>
<path d="M40 126 L80 126 L81 150 L39 150 Z" fill="#c0392b"/>
<rect x="54" y="160" width="12" height="14" rx="6" fill="#2c3e50"/>
<rect x="55" y="212" width="10" height="14" rx="5" fill="#2c3e50"/>
<rect x="34" y="86" width="52" height="12" rx="3" fill="#7b241c"/>
<rect x="40" y="44" width="40" height="44" rx="4" fill="${luz}" stroke="#7b241c" stroke-width="4"/>
${brillo}
<path d="M60 44 L60 88 M40 66 L80 66" stroke="#7b241c" stroke-width="3"/>
<path d="M34 46 Q60 12 86 46 Z" fill="#c0392b"/>
<rect x="57" y="6" width="6" height="20" rx="3" fill="#7b241c"/>
<circle cx="60" cy="8" r="5" fill="#7b241c"/>
</svg>`
}

// Haces de luz del faro (se muestran al encenderlo)
export function hacesLuzSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220">
<defs>
  <linearGradient id="haz-der" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff6c2" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#fff6c2" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="haz-izq" x1="1" y1="0" x2="0" y2="0">
    <stop offset="0" stop-color="#fff6c2" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#fff6c2" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="halo">
    <stop offset="0" stop-color="#ffe680" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#ffe680" stop-opacity="0"/>
  </radialGradient>
</defs>
<path d="M320 110 L640 30 L640 190 Z" fill="url(#haz-der)"/>
<path d="M320 110 L0 40 L0 180 Z" fill="url(#haz-izq)"/>
<circle cx="320" cy="110" r="70" fill="url(#halo)"/>
</svg>`
}
