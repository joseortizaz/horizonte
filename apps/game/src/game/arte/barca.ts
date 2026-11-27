// Dibujos provisionales del Acto II (se reemplazarán por ilustraciones).

// La barca del jugador, vista desde arriba en diagonal. La vela puede llevar
// el diseño de 6 × 6 cuadritos que el joven crea en el taller de colores.
export function barcaSvg(vela: string[] | null) {
  const celdas = (vela && vela.length === 36 ? vela : Array(36).fill('#fdf6e3'))
    .map((color, i) => {
      const fila = Math.floor(i / 6)
      const col = i % 6
      return `<rect x="${62 + col * 13}" y="${20 + fila * 13}" width="13.4" height="13.4" fill="${color}"/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <ellipse cx="100" cy="176" rx="78" ry="12" fill="#0b3d5c" opacity="0.35"/>
  <rect x="96" y="12" width="6" height="140" rx="2" fill="#6e4b2a"/>
  <g stroke="#3b2a1a" stroke-width="3">${celdas}<rect x="62" y="20" width="78" height="78" fill="none"/></g>
  <path d="M20 132 L180 132 L158 168 Q100 180 42 168 Z" fill="#a0522d" stroke="#3b2a1a" stroke-width="4" stroke-linejoin="round"/>
  <path d="M28 140 L172 140" stroke="#c97b47" stroke-width="5"/>
  <path d="M38 152 L162 152" stroke="#7a3e1c" stroke-width="3" opacity="0.6"/>
</svg>`
}

// Figura sencilla de una persona (marcador para los mentores hasta tener su ilustración)
export function personaSvg(ropa: string, piel = '#c68a5e', pelo = '#3b2414') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="140" viewBox="0 0 80 140">
  <ellipse cx="40" cy="134" rx="24" ry="5" fill="#000" opacity="0.2"/>
  <rect x="22" y="96" width="14" height="36" rx="6" fill="#2c3e50"/>
  <rect x="44" y="96" width="14" height="36" rx="6" fill="#2c3e50"/>
  <path d="M16 56 Q40 44 64 56 L60 104 L20 104 Z" fill="${ropa}" stroke="#1c2833" stroke-width="3"/>
  <circle cx="40" cy="32" r="20" fill="${piel}" stroke="#1c2833" stroke-width="3"/>
  <path d="M20 30 Q22 10 40 11 Q58 10 60 30 Q50 20 40 21 Q30 20 20 30 Z" fill="${pelo}"/>
  <circle cx="33" cy="34" r="2.5" fill="#1c2833"/><circle cx="47" cy="34" r="2.5" fill="#1c2833"/>
  <path d="M33 42 Q40 47 47 42" fill="none" stroke="#1c2833" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
}

// Faro pequeño para la roca central del archipiélago
export function faroPequenoSvg(encendido: boolean) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="190" viewBox="0 0 90 190">
  ${encendido ? '<circle cx="45" cy="36" r="34" fill="#ffd54f" opacity="0.45"/>' : ''}
  <path d="M25 180 L33 60 L57 60 L65 180 Z" fill="#fdfefe" stroke="#1c2833" stroke-width="3"/>
  <path d="M28 130 L62 130 L64 150 L26 150 Z" fill="#c0392b"/>
  <path d="M30 90 L60 90 L61 106 L29 106 Z" fill="#c0392b"/>
  <rect x="30" y="28" width="30" height="32" rx="3" fill="${encendido ? '#fff3b0' : '#5d6d7e'}" stroke="#1c2833" stroke-width="3"/>
  <path d="M24 30 L45 10 L66 30 Z" fill="#c0392b" stroke="#1c2833" stroke-width="3"/>
  <rect x="22" y="58" width="46" height="6" fill="#1c2833"/>
</svg>`
}
