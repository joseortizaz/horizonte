import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { PuertoScene } from './scenes/PuertoScene'
import type { Avatar } from '../avatar/tipos'

export function PhaserGame({ avatar }: { avatar: Avatar }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const juego = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (juego.current || !contenedor.current) return

    juego.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: contenedor.current,
      width: 800,
      height: 600,
      backgroundColor: '#0e2a3d',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // Pasa el personaje al juego antes de que arranquen las escenas
      callbacks: {
        preBoot: (game) => {
          game.registry.set('avatar', avatar)
        },
      },
      scene: [PuertoScene],
    })

    return () => {
      juego.current?.destroy(true)
      juego.current = null
    }
  }, [avatar])

  return <div ref={contenedor} className="game-container" />
}
