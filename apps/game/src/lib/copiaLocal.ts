// Copias de seguridad en el dispositivo (localStorage), por si falla la conexión.
// Si el navegador no permite guardar (modo privado, poco espacio), se ignora.

export function leerCopia<T>(clave: string): T | null {
  try {
    const texto = localStorage.getItem(clave)
    return texto ? (JSON.parse(texto) as T) : null
  } catch {
    return null
  }
}

export function escribirCopia(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin espacio o sin permiso: el juego sigue funcionando con Supabase
  }
}
