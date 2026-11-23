import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { PuertoScene } from './scenes/PuertoScene'
import { COLOR_MAR, MUNDO } from './arte/isla'
import { cargarElemento, generarAvatarIlustrado } from '../avatar/ilustrado'
import type { Avatar } from '../avatar/tipos'
import type { Partida } from '../partida/tipos'

export function PhaserGame({ avatar, partida, resueltos }: {
  avatar: Avatar
  partida: Partida
  resueltos: string[]
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const juego = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (juego.current || !contenedor.current) return
    let cancelado = false

    async function iniciar() {
    // El personaje ilustrado se recolorea antes de arrancar el juego
    let avatarImagen: HTMLImageElement | null = null
    if (avatar.apariencia.estilo === 'ilustrado') {
      try {
        const { piel, cabello, ropa } = avatar.apariencia
        avatarImagen = await cargarElemento(await generarAvatarIlustrado({ piel, cabello, ropa }))
      } catch {
        avatarImagen = null // si falla, se usa el dibujo simple
      }
    }
    if (cancelado || juego.current || !contenedor.current) return

    juego.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: contenedor.current,
      width: MUNDO.ancho,
      height: MUNDO.alto,
      backgroundColor: COLOR_MAR,
      scale: {
        // EXPAND: el mundo se ve completo y el mar llena el resto de la pantalla
        mode: Phaser.Scale.EXPAND,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // Pasa el personaje y la partida al juego antes de que arranquen las escenas
      callbacks: {
        preBoot: (game) => {
          game.registry.set('avatar', avatar)
          game.registry.set('partida', partida)
          game.registry.set('resueltos', resueltos)
          game.registry.set('avatarImagen', avatarImagen)
        },
      },
      scene: [PuertoScene],
    })
    }
    iniciar()

    return () => {
      cancelado = true
      juego.current?.destroy(true)
      juego.current = null
    }
  }, [avatar, partida, resueltos])

  return <div ref={contenedor} className="game-container" />
}
