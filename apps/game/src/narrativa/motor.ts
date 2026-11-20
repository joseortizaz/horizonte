import { Compiler } from 'inkjs/full'
import type { Story } from 'inkjs/full'
import fuente from './historias/horizonte.ink?raw'

// Envuelve el motor de Ink para que React lo use de forma sencilla.
// Por ahora el guion se compila al abrir el juego; más adelante se
// compilará antes, al construir la app, para que cargue más rápido.

export interface Linea {
  texto: string
  hablante: string | null
}

export interface PasoDialogo {
  lineas: Linea[]
  opciones: string[]
  eventos: string[]
  terminado: boolean
}

export class Narrativa {
  private historia: Story
  private nombreCompanero: string

  constructor(estadoGuardado: string | null, nombreCompanero: string) {
    this.nombreCompanero = nombreCompanero
    this.historia = new Compiler(fuente).Compile()
    if (estadoGuardado) {
      try {
        this.historia.state.LoadJson(estadoGuardado)
      } catch {
        console.warn('No se pudo cargar el estado de la narrativa; se empieza de cero.')
      }
    }
  }

  // Empieza la conversación de un personaje (el nombre de su nudo en Ink)
  iniciar(nudo: string): PasoDialogo {
    this.historia.ChoosePathString(nudo)
    return this.avanzar()
  }

  elegir(indice: number): PasoDialogo {
    this.historia.ChooseChoiceIndex(indice)
    return this.avanzar()
  }

  fijarVariable(nombre: string, valor: boolean | number | string) {
    this.historia.variablesState.$(nombre, valor)
  }

  leerVariable(nombre: string) {
    return this.historia.variablesState.$(nombre)
  }

  guardarEstado(): string {
    return this.historia.state.ToJson()
  }

  private avanzar(): PasoDialogo {
    const lineas: Linea[] = []
    const eventos: string[] = []

    while (this.historia.canContinue) {
      const texto = (this.historia.Continue() ?? '').trim()
      let hablante: string | null = null

      for (const etiqueta of this.historia.currentTags ?? []) {
        const [clave, ...resto] = etiqueta.split(':')
        const valor = resto.join(':').trim()
        if (clave.trim() === 'hablante') {
          hablante = valor === 'companero' ? this.nombreCompanero : valor
        }
        if (clave.trim() === 'evento') eventos.push(valor)
      }

      if (texto) lineas.push({ texto, hablante })
    }

    const opciones = this.historia.currentChoices.map((opcion) => opcion.text)
    return { lineas, opciones, eventos, terminado: opciones.length === 0 }
  }
}
