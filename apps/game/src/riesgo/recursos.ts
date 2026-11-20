// Recursos de ayuda en República Dominicana.
// Verificados en noviembre de 2026; revisar periódicamente que sigan vigentes.

export interface Recurso {
  nombre: string
  descripcion: string
  accion: string
  enlace: string
}

export const EMERGENCIAS: Recurso = {
  nombre: '911',
  descripcion: 'Emergencias. Si estás en peligro ahora mismo.',
  accion: 'Llamar al 911',
  enlace: 'tel:911',
}

export const RECURSOS: Recurso[] = [
  {
    nombre: 'Línea 811 de Salud Mental',
    descripcion: 'Del Ministerio de Salud Pública. Gratuita y confidencial, con psicólogos.',
    accion: 'Llamar al 811',
    enlace: 'tel:811',
  },
  {
    nombre: 'Línea Familiar',
    descripcion: 'Apoyo emocional para adolescentes y familias. Teléfono 809-636-3507.',
    accion: 'Escribir por WhatsApp',
    enlace: 'https://wa.me/18492584479',
  },
]
