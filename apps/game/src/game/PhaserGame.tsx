import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { PuertoScene } from './scenes/PuertoScene'

export function PhaserGame() {
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
      scene: [PuertoScene],
    })

    return () => {
      juego.current?.destroy(true)
      juego.current = null
    }
  }, [])

  return <div ref={contenedor} className="game-container" />
}