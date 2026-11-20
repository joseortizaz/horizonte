// Dibujos de los personajes no jugables (NPC) de la isla

export function mareaSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
<ellipse cx="32" cy="77" rx="16" ry="3" fill="#000000" opacity="0.2"/>
<rect x="49" y="30" width="3" height="46" rx="1.5" fill="#6e4b2a"/>
<circle cx="50.5" cy="30" r="3.5" fill="#6e4b2a"/>
<path d="M16 76 L20 40 Q32 32 44 40 L48 76Z" fill="#5d6d7e"/>
<path d="M17 46 Q32 36 47 46 L45 58 Q32 50 19 58Z" fill="#16a085"/>
<circle cx="47" cy="50" r="3.5" fill="#8a5530"/>
<rect x="28" y="30" width="8" height="6" fill="#8a5530"/>
<circle cx="32" cy="8" r="6" fill="#ecf0f1"/>
<circle cx="32" cy="22" r="12" fill="#8a5530"/>
<path d="M20 21 Q20 9 32 9 Q44 9 44 21 Q38 14 32 15 Q26 14 20 21Z" fill="#ecf0f1"/>
<path d="M25 23 Q27 21.5 29 23 M35 23 Q37 21.5 39 23" fill="none" stroke="#1c2833" stroke-width="1.5" stroke-linecap="round"/>
<path d="M28 28 Q32 31 36 28" fill="none" stroke="#1c2833" stroke-width="1.5" stroke-linecap="round"/>
</svg>`
}

// Los tres Recuerdos de la Isla de las Raíces

export function conchaSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
<circle cx="20" cy="20" r="18" fill="#ffd54f" opacity="0.3"/>
<path d="M20 9 L31 27 Q20 33 9 27Z" fill="#f5b7b1" stroke="#c0392b" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M20 11 V30 M20 11 L14 28 M20 11 L26 28" stroke="#c0392b" stroke-width="1.2" fill="none"/>
</svg>`
}

export function huellaSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
<circle cx="20" cy="20" r="18" fill="#ffd54f" opacity="0.3"/>
<ellipse cx="20" cy="24" rx="6" ry="9" fill="#7f8c8d"/>
<circle cx="14.5" cy="12.5" r="2" fill="#7f8c8d"/>
<circle cx="18" cy="10.5" r="2.2" fill="#7f8c8d"/>
<circle cx="22" cy="10.5" r="2" fill="#7f8c8d"/>
<circle cx="25.5" cy="12.5" r="1.8" fill="#7f8c8d"/>
</svg>`
}

export function semillaSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
<circle cx="20" cy="20" r="18" fill="#ffd54f" opacity="0.3"/>
<path d="M20 12 Q26 13 25 15" stroke="#27ae60" stroke-width="2" fill="none"/>
<ellipse cx="20" cy="23" rx="7" ry="9" fill="#f1c40f" stroke="#b7950b" stroke-width="1.5"/>
<path d="M20 15 V31" stroke="#b7950b" stroke-width="1"/>
</svg>`
}

// El Eco: una figura de niebla
export function ecoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
<path d="M14 78 Q16 70 12 62 Q18 56 16 44 Q18 30 32 28 Q46 30 48 44 Q46 56 52 62 Q48 70 50 78 Q44 72 40 78 Q36 72 32 78 Q28 72 24 78 Q20 72 14 78Z" fill="#7f8c8d" opacity="0.85"/>
<circle cx="32" cy="22" r="12" fill="#95a5a6"/>
<ellipse cx="27" cy="22" rx="2.5" ry="1.5" fill="#2c3e50"/>
<ellipse cx="37" cy="22" rx="2.5" ry="1.5" fill="#2c3e50"/>
<path d="M27 29 Q32 27 37 29" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
</svg>`
}
