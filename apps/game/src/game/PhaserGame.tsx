import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { PuertoScene } from './scenes/PuertoScene'
import { ArchipielagoScene } from './scenes/ArchipielagoScene'
import { COLOR_MAR, VISTA } from './arte/isla'
import { cargarElemento, generarAvatarIlustrado } from '../avatar/ilustrado'
import type { AvatarIlustrado } from '../avatar/ilustrado'
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
    let avatarForma: AvatarIlustrado | null = null
    if (avatar.apariencia.estilo === 'ilustrado') {
      try {
        avatarForma = await generarAvatarIlustrado(avatar.apariencia)
        avatarImagen = await cargarElemento(avatarForma.url)
      } catch {
        avatarImagen = null // si falla, se usa el dibujo simple
        avatarForma = null
      }
    }
    if (cancelado || juego.current || !contenedor.current) return

    juego.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: contenedor.current,
      width: VISTA.ancho,
      height: VISTA.alto,
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
          game.registry.set('avatarForma', avatarForma)
        },
      },
      // La primera escena de la lista es la que arranca: la de la región guardada
      scene: partida.region === 'oficios' ? [ArchipielagoScene, PuertoScene] : [PuertoScene, ArchipielagoScene],
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
