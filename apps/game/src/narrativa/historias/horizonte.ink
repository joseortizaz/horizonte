// ======================================================
//  HORIZONTE — Guion principal (versión de prueba)
//  Cada personaje tiene su propio nudo (=== nombre ===).
//  Etiquetas:
//    # hablante: Nombre   → quién dice la línea
//    # evento: id          → avisa al juego que pasó algo
// ======================================================

// Variables que recuerdan las decisiones del jugador
VAR conoce_a_marea = false
VAR motivo_llegada = ""
VAR curiosidad = 0

// Variables que el juego actualiza desde fuera
VAR faro_encendido = false

-> DONE


=== marea ===
{ conoce_a_marea:
    -> reencuentro
}
~ conoce_a_marea = true
Vaya, vaya... Un Navegante con la brújula en blanco. # hablante: Marea
Hacía muchas mareas que nadie llegaba a la Isla de las Raíces. # hablante: Marea
¿Qué te trajo hasta aquí? # hablante: Marea

* [Vine a buscar respuestas.]
    ~ motivo_llegada = "respuestas"
    ~ curiosidad += 1
    Respuestas... Primero tendrás que aprender a hacer buenas preguntas. # hablante: Marea
* [La verdad, no lo sé. Simplemente llegué.]
    ~ motivo_llegada = "no-se"
    No saber también es un buen comienzo. A la Bruma no le gusta la gente que se atreve a admitirlo. # hablante: Marea
* [Me dijeron que tenía que venir.]
    ~ motivo_llegada = "otros"
    Ah... un Eco. Muchos llegan empujados por voces ajenas. Aquí aprenderás a distinguir cuál es la tuya. # hablante: Marea

- La Bruma cubre esta isla desde hace mucho tiempo. # hablante: Marea
Dicen que se disipa cuando alguien enciende el faro con una decisión propia. # hablante: Marea

* [¿Dónde está el faro?]
    Al otro lado de la isla, hacia el noreste. La Bruma te hará dudar del camino, pero no tiene pérdida. # hablante: Marea
* [¿Y si me equivoco de camino?]
    ~ curiosidad += 1
    Entonces habrás aprendido un camino más. Equivocarse no apaga a nadie. # hablante: Marea

- Anda, Navegante. Tu brújula te espera. # hablante: Marea # evento: mision-faro
-> DONE

= reencuentro
{ faro_encendido:
    ¡Lo lograste! Mira cómo brilla el faro. # hablante: Marea
    { motivo_llegada == "respuestas":
        Querías respuestas... y acabas de encontrar la primera: puedes confiar en tus pasos. # hablante: Marea
    - else:
        ¿Lo sientes? Tu brújula ya no está en blanco. Empieza a señalar algo tuyo. # hablante: Marea
    }
- else:
    El faro sigue esperando al noreste. Confía en tus pasos, Navegante. # hablante: Marea
}
-> DONE
