import { supabase } from '../lib/supabase'
import type { Taller } from './TallerOficio'

// Los seis tipos de interés (modelo de Holland), en el orden de su hexágono.
// Lenguaje cotidiano para jóvenes; los campos de trabajo son solo ejemplos para explorar.
export const TIPOS: { id: Taller; nombre: string; lema: string; isla: string; oficios: string[] }[] = [
  {
    id: 'realista',
    nombre: 'Hacer',
    lema: 'Trabajar con las manos, herramientas, el cuerpo o la naturaleza',
    isla: 'Astillero',
    oficios: ['Electricidad', 'Mecánica', 'Cocina y gastronomía', 'Agronomía', 'Refrigeración', 'Ingeniería civil', 'Deporte'],
  },
  {
    id: 'investigador',
    nombre: 'Investigar',
    lema: 'Hacer preguntas, observar y resolver problemas',
    isla: 'Observatorio',
    oficios: ['Medicina', 'Programación', 'Biología', 'Análisis de datos', 'Farmacia', 'Economía'],
  },
  {
    id: 'artistico',
    nombre: 'Crear',
    lema: 'Expresar ideas con colores, sonidos, palabras o imágenes',
    isla: 'Taller de colores',
    oficios: ['Diseño gráfico', 'Música', 'Arquitectura', 'Escritura', 'Fotografía', 'Animación digital'],
  },
  {
    id: 'social',
    nombre: 'Ayudar',
    lema: 'Enseñar, cuidar, escuchar y acompañar a otras personas',
    isla: 'Escuela',
    oficios: ['Educación', 'Enfermería', 'Psicología', 'Trabajo social', 'Terapia física', 'Orientación escolar'],
  },
  {
    id: 'emprendedor',
    nombre: 'Emprender',
    lema: 'Liderar, convencer, organizar y tomar decisiones con riesgo',
    isla: 'Mercadito',
    oficios: ['Emprendimiento', 'Administración de empresas', 'Derecho', 'Ventas y mercadeo', 'Publicidad', 'Organización de eventos'],
  },
  {
    id: 'convencional',
    nombre: 'Organizar',
    lema: 'Trabajar con datos, orden y precisión',
    isla: 'Capitanía',
    oficios: ['Contabilidad', 'Administración', 'Secretariado ejecutivo', 'Bibliotecología', 'Auditoría', 'Logística'],
  },
]

export interface ResultadoTaller {
  taller: Taller
  disfrute: number
  habilidad: number
  desempeno: number | null
}

export async function cargarTalleres(): Promise<ResultadoTaller[] | null> {
  const { data, error } = await supabase.from('oficios_talleres').select('taller, disfrute, habilidad, desempeno')
  if (error) return null
  return (data ?? []) as ResultadoTaller[]
}

// Los intereses que más destacan: primero lo que más disfrutó; a igualdad, lo que mejor le salió
export function principales(filas: ResultadoTaller[], cuantos = 2) {
  return [...filas].sort((a, b) => b.disfrute - a.disfrute || b.habilidad - a.habilidad).slice(0, cuantos)
}
