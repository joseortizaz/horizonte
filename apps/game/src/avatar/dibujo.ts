import type { Apariencia, Companero } from './tipos'

// Dibuja el personaje y el compañero como SVG.
// El mismo dibujo se usa en el creador (React) y dentro del juego (Phaser).

const TINTA = '#1c2833'

function cabelloDetras(a: Apariencia) {
  if (a.peinado === 'largo') return `<rect x="18" y="18" width="28" height="24" rx="6" fill="${a.cabello}"/>`
  if (a.peinado === 'mono') return `<circle cx="32" cy="8" r="6" fill="${a.cabello}"/>`
  return ''
}

function cabelloDelante(a: Apariencia) {
  const c = a.cabello
  switch (a.peinado) {
    case 'corto':
    case 'largo':
    case 'mono':
      return `<path d="M19 23 Q18 9 32 9 Q46 9 45 23 Q41 15 32 16 Q23 15 19 23Z" fill="${c}"/>`
    case 'rizado':
      return `<g fill="${c}"><circle cx="21" cy="18" r="6"/><circle cx="26" cy="12" r="6"/><circle cx="32" cy="10" r="6"/><circle cx="38" cy="12" r="6"/><circle cx="43" cy="18" r="6"/></g>`
    case 'rapado':
      return `<path d="M20 19 Q22 11 32 11 Q42 11 44 19 Q32 14 20 19Z" fill="${c}" opacity="0.8"/>`
  }
}

function accesorio(a: Apariencia) {
  switch (a.accesorio) {
    case 'lentes':
      return `<g fill="none" stroke="${TINTA}" stroke-width="1.5"><circle cx="27" cy="24.5" r="4"/><circle cx="37" cy="24.5" r="4"/><path d="M31 24.5h2"/></g>`
    case 'gorra':
      return `<path d="M18 19 Q18 7 32 7 Q46 7 46 19Z" fill="${a.ropa}"/><rect x="30" y="16" width="22" height="4" rx="2" fill="${a.ropa}"/>`
    case 'audifonos':
      return `<path d="M17 24 Q17 5 32 5 Q47 5 47 24" fill="none" stroke="${TINTA}" stroke-width="3"/><rect x="14" y="20" width="6" height="10" rx="3" fill="${TINTA}"/><rect x="44" y="20" width="6" height="10" rx="3" fill="${TINTA}"/>`
    case 'ninguno':
      return ''
  }
}

function piernas(a: Apariencia) {
  if (a.movilidad === 'silla') {
    return `<circle cx="32" cy="62" r="14" fill="none" stroke="#5d6d7e" stroke-width="3"/><circle cx="32" cy="62" r="2" fill="#5d6d7e"/><rect x="22" y="56" width="20" height="7" rx="3" fill="#2c3e50"/><rect x="36" y="60" width="7" height="12" rx="3" fill="#2c3e50"/>`
  }
  return `<rect x="24" y="56" width="7" height="18" rx="3" fill="#2c3e50"/><rect x="33" y="56" width="7" height="18" rx="3" fill="#2c3e50"/>`
}

export function avatarSvg(a: Apariencia) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
<ellipse cx="32" cy="77" rx="16" ry="3" fill="#000000" opacity="0.2"/>
${piernas(a)}
<rect x="12" y="38" width="7" height="18" rx="3" fill="${a.ropa}"/>
<rect x="45" y="38" width="7" height="18" rx="3" fill="${a.ropa}"/>
<circle cx="15.5" cy="57" r="3.5" fill="${a.piel}"/>
<circle cx="48.5" cy="57" r="3.5" fill="${a.piel}"/>
<rect x="18" y="36" width="28" height="24" rx="8" fill="${a.ropa}"/>
${cabelloDetras(a)}
<rect x="28" y="32" width="8" height="6" fill="${a.piel}"/>
<circle cx="32" cy="23" r="13" fill="${a.piel}"/>
${cabelloDelante(a)}
<circle cx="27" cy="24.5" r="1.6" fill="${TINTA}"/>
<circle cx="37" cy="24.5" r="1.6" fill="${TINTA}"/>
<path d="M28 29.5 Q32 32.5 36 29.5" fill="none" stroke="${TINTA}" stroke-width="1.5" stroke-linecap="round"/>
${accesorio(a)}
</svg>`
}

export function companeroSvg(tipo: Companero) {
  let cuerpo = ''
  switch (tipo) {
    case 'chispa':
      cuerpo = `<circle cx="20" cy="20" r="15" fill="#ffd54f" opacity="0.25"/><ellipse cx="13" cy="14" rx="6" ry="4" fill="#ffffff" opacity="0.85"/><ellipse cx="27" cy="14" rx="6" ry="4" fill="#ffffff" opacity="0.85"/><circle cx="20" cy="21" r="8" fill="#ffd54f"/><circle cx="17.5" cy="20" r="1.3" fill="${TINTA}"/><circle cx="22.5" cy="20" r="1.3" fill="${TINTA}"/>`
      break
    case 'pluma':
      cuerpo = `<circle cx="20" cy="22" r="12" fill="#48c9b0"/><ellipse cx="14" cy="24" rx="5" ry="7" fill="#1abc9c"/><path d="M31 21 L37 23 L31 25Z" fill="#f39c12"/><circle cx="25" cy="19" r="1.6" fill="${TINTA}"/><path d="M16 11 Q20 4 22 11" fill="none" stroke="#1abc9c" stroke-width="2"/>`
      break
    case 'coral':
      cuerpo = `<ellipse cx="11" cy="31" rx="3" ry="2" fill="#82e0aa"/><ellipse cx="28" cy="31" rx="3" ry="2" fill="#82e0aa"/><ellipse cx="19" cy="24" rx="13" ry="9" fill="#27ae60"/><path d="M12 24h14M19 17v14" stroke="#1e8449" stroke-width="1.5"/><circle cx="33" cy="21" r="5" fill="#82e0aa"/><circle cx="34.5" cy="20" r="1.2" fill="${TINTA}"/>`
      break
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${cuerpo}</svg>`
}

// Convierte el SVG en una dirección de imagen que entienden <img> y Phaser
export function svgADataUri(svg: string) {
  // Convierte a UTF-8 antes de codificar, para admitir tildes y eñes
  const bytes = new TextEncoder().encode(svg)
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(binario)}`
}
