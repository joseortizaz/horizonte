// Traduce las decisiones guardadas en la historia (variables de Ink)
// a textos sencillos para la Bitácora. Lenguaje cálido, sin diagnósticos.

export type LeerVariable = (nombre: string) => unknown

export interface Seccion {
  id: string
  titulo: string
  descubierta: boolean
  pista: string // qué hacer en el juego para descubrirla
  parrafos: string[]
  etiquetas?: string[]
  nota?: string
}

const MOTIVO_LLEGADA: Record<string, string> = {
  respuestas: 'Llegaste buscando respuestas. Esa curiosidad es tu primer motor.',
  'no-se': 'Llegaste sin saber muy bien por qué, y te atreviste a admitirlo. Eso es honestidad.',
  otros: 'Llegaste porque otros te dijeron que vinieras. Aquí empezaste a buscar tu propia voz.',
}

const PERSONA_IMPORTANTE: Record<string, string> = {
  familia: 'Alguien de tu familia te enseñó algo que todavía llevas contigo.',
  docente: 'Un maestro o una maestra dejó una huella en ti.',
  amistad: 'Una amistad te enseñó algo que todavía llevas contigo.',
  yo: 'Aprendiste mucho por tu cuenta: sabes buscar tus propios caminos.',
}

const VALOR_RAIZ: Record<string, { nombre: string; texto: string }> = {
  perseverancia: { nombre: 'Perseverancia', texto: 'no rendirte' },
  empatia: { nombre: 'Empatía', texto: 'tratar bien a los demás' },
  autonomia: { nombre: 'Autonomía', texto: 'pensar por tu cuenta' },
  responsabilidad: { nombre: 'Responsabilidad', texto: 'cumplir con lo que te toca' },
}

const FUENTE_ORGULLO: Record<string, string> = {
  estudios: 'Sentiste orgullo por algo que lograste en tus estudios.',
  ayudar: 'Sentiste orgullo por algo que hiciste por otra persona.',
  crear: 'Sentiste orgullo por algo que creaste con tus manos o tus ideas.',
  valentia: 'Sentiste orgullo por un reto que superaste aunque te daba miedo.',
}

const INTERES: Record<string, { titulo: string; texto: string; caminos: string[] }> = {
  artistico: {
    titulo: 'Crear',
    texto: 'Te apasiona crear: arte, música, escritura o diseño.',
    caminos: ['Diseño gráfico', 'Música y producción', 'Comunicación', 'Arquitectura', 'Cine y fotografía'],
  },
  investigador: {
    titulo: 'Entender cómo funcionan las cosas',
    texto: 'Te apasiona entender cómo funcionan las cosas: ciencia, tecnología o números.',
    caminos: ['Ingeniería', 'Ciencias de la salud', 'Programación y tecnología', 'Ciencias naturales', 'Economía'],
  },
  social: {
    titulo: 'Estar con la gente',
    texto: 'Te apasiona estar con la gente: ayudar, enseñar y escuchar.',
    caminos: ['Psicología', 'Educación', 'Trabajo social', 'Enfermería', 'Trabajo comunitario'],
  },
  realista: {
    titulo: 'Usar las manos y el cuerpo',
    texto: 'Te apasiona usar las manos y el cuerpo: deporte, construir o reparar.',
    caminos: ['Deporte y entrenamiento', 'Mecánica y electricidad', 'Construcción', 'Agronomía', 'Gastronomía'],
  },
  emprendedor: {
    titulo: 'Organizar y liderar',
    texto: 'Te apasiona organizar, liderar y sacar proyectos adelante.',
    caminos: ['Administración de empresas', 'Emprendimiento', 'Mercadeo', 'Derecho', 'Gestión de proyectos'],
  },
}

const RESPUESTA_ECO: Record<string, string> = {
  dudar:
    'Cuando el Eco te habló, al principio dudaste. Pero te preguntaste de quién era esa voz y respondiste con la tuya. Eso es lo que cuenta.',
  firme: 'Cuando el Eco te habló, reconociste enseguida que esa voz no era tuya.',
  cuestionar:
    'Cuando el Eco te habló, lo cuestionaste. No aceptas algo solo porque alguien lo dice.',
}

const VALOR_GUIA: Record<string, string> = {
  vinculos: 'Las personas que te importan',
  pasion: 'Hacer lo que te apasiona',
  superacion: 'Superarte cada día',
  contribucion: 'Ayudar a que el mundo sea un poco mejor',
}

function texto(leer: LeerVariable, nombre: string) {
  const valor = leer(nombre)
  return typeof valor === 'string' ? valor : ''
}

export function construirBitacora(leer: LeerVariable): Seccion[] {
  const motivo = texto(leer, 'motivo_llegada')
  const persona = texto(leer, 'persona_importante')
  const raiz = VALOR_RAIZ[texto(leer, 'valor_raiz')]
  const orgullo = texto(leer, 'fuente_orgullo')
  const interes = INTERES[texto(leer, 'interes')]
  const eco = texto(leer, 'respuesta_eco')
  const guia = texto(leer, 'valor_guia')

  return [
    {
      id: 'partida',
      titulo: 'Mi punto de partida',
      descubierta: Boolean(MOTIVO_LLEGADA[motivo]),
      pista: 'Habla con Marea en la orilla de la isla.',
      parrafos: [MOTIVO_LLEGADA[motivo] ?? ''],
    },
    {
      id: 'raices',
      titulo: 'Mis raíces',
      descubierta: Boolean(PERSONA_IMPORTANTE[persona] && raiz),
      pista: 'Busca la concha que brilla entre las piedras.',
      parrafos: [
        PERSONA_IMPORTANTE[persona] ?? '',
        raiz ? `Lo más valioso que aprendiste fue a ${raiz.texto}.` : '',
      ],
      etiquetas: raiz ? [raiz.nombre] : [],
    },
    {
      id: 'logros',
      titulo: 'Lo que he logrado',
      descubierta: Boolean(FUENTE_ORGULLO[orgullo]),
      pista: 'Busca la huella marcada en una roca.',
      parrafos: [
        FUENTE_ORGULLO[orgullo] ?? '',
        'Recuérdalo cuando dudes de ti: ya has logrado cosas que te importan.',
      ],
    },
    {
      id: 'pasiones',
      titulo: 'Lo que me apasiona',
      descubierta: Boolean(interes),
      pista: 'Busca la semilla dorada que late bajo la arena.',
      parrafos: [interes?.texto ?? '', 'Algunos caminos que podrías explorar:'],
      etiquetas: interes?.caminos ?? [],
      nota: 'Son solo ideas para explorar, no un destino. En el Archipiélago de los Oficios podrás conocerlas de cerca.',
    },
    {
      id: 'voz',
      titulo: 'Mi propia voz',
      descubierta: Boolean(RESPUESTA_ECO[eco]),
      pista: 'Algo te espera en el camino hacia el faro.',
      parrafos: [RESPUESTA_ECO[eco] ?? ''],
    },
    {
      id: 'guia',
      titulo: 'Lo que guía mi camino',
      descubierta: Boolean(VALOR_GUIA[guia]),
      pista: 'Enciende el Faro de las Raíces.',
      parrafos: ['Cuando encendiste el faro, elegiste que esto guíe tu camino:'],
      etiquetas: VALOR_GUIA[guia] ? [VALOR_GUIA[guia]] : [],
    },
  ]
}

export const NOMBRES_INSIGNIAS: Record<string, string> = {
  autoconocimiento: 'Autoconocimiento',
  perseverancia: 'Perseverancia',
  curiosidad: 'Curiosidad',
}
