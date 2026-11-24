// ======================================================
//  PROYÉCTATE — Guion principal
//  Acto I: Prólogo e Isla de las Raíces (borrador 1)
//
//  Cada personaje u objeto tiene su propio nudo (=== nombre ===).
//  Etiquetas:
//    # hablante: Nombre     → quién dice la línea (sin etiqueta = narración)
//    # hablante: companero  → el compañero que eligió el jugador
//    # evento: id           → avisa al juego que pasó algo
// ======================================================

// --- Progreso de la historia ---
VAR prologo_visto = false
VAR conoce_a_marea = false
VAR recuerdos = 0
VAR tiene_concha = false
VAR tiene_huella = false
VAR tiene_semilla = false
VAR eco_resuelto = false
VAR insignia_autoconocimiento = false

// --- Lo que el jugador va descubriendo de sí (alimenta la Bitácora) ---
VAR motivo_llegada = ""      // respuestas | no-se | otros
VAR persona_importante = ""  // familia | docente | amistad | yo
VAR valor_raiz = ""          // perseverancia | empatia | autonomia | responsabilidad
VAR fuente_orgullo = ""      // estudios | ayudar | crear | valentia
VAR interes = ""             // artistico | investigador | social | realista | emprendedor
VAR respuesta_eco = ""       // dudar | firme | cuestionar
VAR valor_guia = ""          // vinculos | pasion | superacion | contribucion
VAR curiosidad = 0

// --- Variables que el juego actualiza desde fuera ---
VAR faro_encendido = false

-> DONE


// ======================================================
//  PRÓLOGO — llegada a la isla
// ======================================================
=== prologo ===
~ prologo_visto = true
La barca toca la arena con un golpe suave. Todo a tu alrededor es blanco, espeso, silencioso.
En tu mano hay una brújula. Su aguja no apunta a ningún lado.
¡Eh, despierta! Llegamos. Bueno... creo que llegamos. # hablante: companero
Soy tu compañero de viaje. No sé muy bien cómo vine a parar contigo, pero aquí estoy. # hablante: companero

* [¿Dónde estamos?]
    Es una isla. Hay un letrero medio borrado que dice "Raíces". # hablante: companero
* [¿Por qué mi brújula no funciona?]
    ~ curiosidad += 1
    Dicen que las brújulas se apagan cuando la Bruma se le mete a uno en la cabeza. # hablante: companero
* [Tengo un mal presentimiento...]
    Es normal sentirse así en un lugar nuevo. Vamos con calma, que yo voy contigo. # hablante: companero

- Mira, en la orilla hay alguien con un bastón. Quizá sepa dónde estamos. # hablante: companero
Muévete con las flechas, con WASD o tocando la pantalla. Acércate a las personas y a los destellos para interactuar. # evento: mision-marea
-> DONE


// ======================================================
//  MAREA — la guardiana de la isla
// ======================================================
=== marea ===
{ conoce_a_marea:
    -> reencuentro
}
~ conoce_a_marea = true
// Si ya encendió el faro sin pasar por aquí, Marea lo reconoce y lo despide
{ faro_encendido:
    -> primer_encuentro_faro
}
Vaya, vaya... Un Navegante con la brújula en blanco. # hablante: Marea
{ recuerdos > 0:
    Aunque veo que ya empezaste a buscar por tu cuenta: llevas {recuerdos} de tres Recuerdos. # hablante: Marea
}
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

- La Bruma cubre esta isla desde hace mucho tiempo. Dicen que se disipa cuando alguien enciende el faro. # hablante: Marea
Pero el faro no se enciende con fuerza, sino con memoria. # hablante: Marea
{ recuerdos > 0:
    Esos destellos que encontraste son Recuerdos. Son tuyos, aunque todavía no lo sepas. # hablante: Marea
- else:
    Por la isla hay tres Recuerdos perdidos. Son tuyos, aunque todavía no lo sepas. # hablante: Marea
}

* [¿Recuerdos míos? ¿Cómo pueden estar aquí?]
    Esta isla guarda lo que te formó: personas, momentos, gustos. Todo lo que traes contigo sin darte cuenta. # hablante: Marea
* [¿Y si no me gusta lo que encuentre?]
    ~ curiosidad += 1
    Entonces sabrás qué quieres cambiar. Eso también es una raíz. # hablante: Marea

- { recuerdos == 3:
    Y tú ya los tienes todos. El faro te espera al noreste: llévaselos. # hablante: Marea
- else:
    Busca los destellos entre la Bruma. # hablante: Marea
    Y ten cuidado con los Ecos: repiten lo que otros esperan de ti, hasta que crees que es tu propia voz. # hablante: Marea # evento: mision-recuerdos
}
-> DONE

// Primer encuentro cuando el faro ya está encendido
= primer_encuentro_faro
Así que fuiste tú quien encendió el faro... # hablante: Marea
Soy Marea, la guardiana de esta isla. Pocas veces alguien llega tan lejos sin que nadie le muestre el camino. # hablante: Marea
Dime, ¿qué te trajo hasta aquí? # hablante: Marea

* [Vine a buscar respuestas.]
    ~ motivo_llegada = "respuestas"
    ~ curiosidad += 1
* [La verdad, no lo sé. Simplemente llegué.]
    ~ motivo_llegada = "no-se"
    No saber también es un buen comienzo. # hablante: Marea
* [Me dijeron que tenía que venir.]
    ~ motivo_llegada = "otros"
    Muchos llegan empujados por voces ajenas. Lo importante es que el faro lo encendiste tú. # hablante: Marea

- -> despedida

= reencuentro
{
- faro_encendido && not insignia_autoconocimiento:
    -> despedida
- faro_encendido:
    El faro brilla y tu brújula ya señala algo. Revisa tu rumbo en tu Diario de Navegación cada semana. # hablante: Marea
    Cuando estés listo, otras islas te esperan más allá. # hablante: Marea
- recuerdos == 3:
    Ya tienes los tres Recuerdos. El faro te espera al noreste. # hablante: Marea
- recuerdos > 0:
    Llevas {recuerdos} de tres Recuerdos. Sigue buscando entre la Bruma. # hablante: Marea
- else:
    Los destellos están entre la Bruma. Camina sin prisa y mira con atención. # hablante: Marea
}
-> DONE

= despedida
¡Lo lograste! Mira cómo brilla el faro. # hablante: Marea
{ motivo_llegada == "respuestas":
    Querías respuestas... y acabas de encontrar las primeras. # hablante: Marea
- else:
    ¿Lo sientes? Tu brújula ya no está en blanco. # hablante: Marea
}
Hoy hiciste algo que mucha gente evita: mirarte por dentro con honestidad. # hablante: Marea
~ insignia_autoconocimiento = true
Eso tiene un nombre: Autoconocimiento. Llévalo contigo. # hablante: Marea # evento: insignia:autoconocimiento
Y ahora que tu brújula se mueve, úsala. En tu Diario de Navegación puedes trazar tus primeras rutas: lo que quieres lograr en tu vida, más allá de esta isla. # hablante: Marea
Más allá de la Bruma hay otras islas. En cada una descubrirás algo nuevo de ti. # hablante: Marea
Cuando estés listo, el mar te estará esperando, Navegante. # hablante: Marea # evento: fin-acto-1
-> DONE


// ======================================================
//  RECUERDO 1 — La concha (las personas que nos forman)
// ======================================================
=== recuerdo_concha ===
Entre las piedras brilla una concha. Al tocarla, escuchas una voz conocida, lejana.
Es el recuerdo de alguien que te enseñó algo importante.
¿Quién fue? # hablante: companero

* [Alguien de mi familia.]
    ~ persona_importante = "familia"
* [Un maestro o una maestra.]
    ~ persona_importante = "docente"
* [Un amigo o una amiga.]
    ~ persona_importante = "amistad"
* [Aprendí casi todo por mi cuenta.]
    ~ persona_importante = "yo"

- { persona_importante == "yo":
    Eso dice mucho de ti: sabes buscar tus propios caminos. # hablante: companero
- else:
    Esa persona es parte de tus raíces. Lo que te enseñó viaja contigo. # hablante: companero
}
¿Y qué fue lo más valioso que aprendiste? # hablante: companero

* [A no rendirme.]
    ~ valor_raiz = "perseverancia"
* [A tratar bien a los demás.]
    ~ valor_raiz = "empatia"
* [A pensar por mi cuenta.]
    ~ valor_raiz = "autonomia"
* [A cumplir con lo que me toca.]
    ~ valor_raiz = "responsabilidad"

- Guardas la concha. La Bruma se aclara un poco.
~ tiene_concha = true
~ recuerdos += 1
-> recuerdo_guardado("concha")


// ======================================================
//  RECUERDO 2 — La huella (los logros propios)
// ======================================================
=== recuerdo_huella ===
En una roca hay una huella del tamaño exacto de tu pie.
Al verla recuerdas un momento en que te sentiste orgulloso u orgullosa de ti.
¿De qué se trataba? # hablante: companero

* [Algo que logré en los estudios.]
    ~ fuente_orgullo = "estudios"
* [Algo que hice por otra persona.]
    ~ fuente_orgullo = "ayudar"
* [Algo que creé: un dibujo, una canción, un proyecto...]
    ~ fuente_orgullo = "crear"
* [Un reto que superé aunque me daba miedo.]
    ~ fuente_orgullo = "valentia"

- No importa lo grande que fue, sino lo que dice de ti. ¿Qué dice? # hablante: companero

* [Que soy capaz.]
* [Que me importan los demás.]
* [Que puedo con más de lo que creo.]

- Lo voy a recordar. Y tú también deberías. # hablante: companero
La huella se ilumina y se desprende de la roca como una piedra pequeña. La guardas.
~ tiene_huella = true
~ recuerdos += 1
-> recuerdo_guardado("huella")


// ======================================================
//  RECUERDO 3 — La semilla (los intereses)
// ======================================================
=== recuerdo_semilla ===
Una semilla dorada late bajo la arena, como si tuviera corazón.
Esta semilla brilla con eso que te hace perder la noción del tiempo. ¿Qué es? # hablante: companero

* [Crear: arte, música, escribir, diseñar.]
    ~ interes = "artistico"
* [Entender cómo funcionan las cosas: ciencia, tecnología, números.]
    ~ interes = "investigador"
* [Estar con gente: ayudar, enseñar, escuchar.]
    ~ interes = "social"
* [Usar las manos y el cuerpo: deporte, construir, reparar.]
    ~ interes = "realista"
* [Organizar, liderar, emprender proyectos.]
    ~ interes = "emprendedor"

- Eso que te apasiona puede convertirse en un camino. Algún día lo exploraremos en el Archipiélago de los Oficios. # hablante: companero
Guardas la semilla. Todavía está tibia.
~ tiene_semilla = true
~ recuerdos += 1
-> recuerdo_guardado("semilla")


// Final común de los tres recuerdos
=== recuerdo_guardado(id) ===
{ recuerdos:
- 3: ¡Los tres! Vamos al faro, al noreste de la isla. # hablante: companero # evento: recoger:{id}
- else: Llevamos {recuerdos} de tres. Sigamos buscando. # hablante: companero # evento: recoger:{id}
}
-> DONE


// ======================================================
//  EL ECO — la voz de las expectativas ajenas
// ======================================================
=== eco ===
Una figura gris, hecha de niebla, te corta el paso. Habla con muchas voces a la vez.
¿Para qué buscas recuerdos? Eso no sirve para nada. # hablante: Eco
Mejor haz lo que todos esperan de ti. Es más fácil. # hablante: Eco

* [Tal vez tengas razón...]
    ~ respuesta_eco = "dudar"
    ¿Ves? Ni siquiera tú confías en ti. # hablante: Eco
    No le hagas caso. Los Ecos repiten frases que escuchamos tantas veces que parecen nuestras. # hablante: companero
    ¿Esa voz es tuya, o de alguien más? # hablante: companero
    ** [No es mía. La he escuchado de otros.]
    ** [No lo sé... pero no quiero que decida por mí.]
    -- Entonces respóndele con tu propia voz. # hablante: companero
    -> responder
* [Esa voz no es mía.]
    ~ respuesta_eco = "firme"
    -> responder
* [¿Y quién eres tú para decirme eso?]
    ~ respuesta_eco = "cuestionar"
    ~ curiosidad += 1
    -> responder

= responder
* [Voy a decidir mi propio camino.]
* [Puedo escuchar consejos, pero la decisión es mía.]
* [Prefiero equivocarme por mí que acertar por otros.]

- El Eco tiembla, se deshace en jirones y se pierde entre la Bruma.
~ eco_resuelto = true
Eso fue valiente. Cada vez que respondes con tu voz, la Bruma pierde fuerza. # hablante: companero # evento: ocultar:eco
-> DONE


// ======================================================
//  EL FARO
// ======================================================
=== faro ===
{ faro_encendido:
    El faro brilla con fuerza. Desde aquí se ve toda la isla, sin Bruma.
    -> DONE
}
{ recuerdos < 3:
    El faro está frío y en silencio. En su puerta hay tres huecos: uno con forma de concha, otro de huella y otro de semilla.
    Parece que necesita tus tres Recuerdos. Llevamos {recuerdos} de tres. # hablante: companero
    -> DONE
}
Colocas la concha, la huella y la semilla en sus huecos. El faro tiembla.
Antes de encenderlo, piensa en algo: con todo lo que recordaste... ¿qué quieres que guíe tu camino? # hablante: companero

* [Las personas que me importan.]
    ~ valor_guia = "vinculos"
* [Hacer lo que me apasiona.]
    ~ valor_guia = "pasion"
* [Superarme cada día.]
    ~ valor_guia = "superacion"
* [Ayudar a que el mundo sea un poco mejor.]
    ~ valor_guia = "contribucion"

- Una luz dorada sube por la torre. La Bruma se retira como la marea cuando baja. # evento: encender-faro
~ faro_encendido = true
Tu brújula... ¡mira! La aguja empezó a moverse. # hablante: companero
{ conoce_a_marea:
    Volvamos con Marea. Querrá verlo. # hablante: companero
- else:
    En la orilla hay alguien con un bastón: Marea, la guardiana de la isla. Querrá verlo. # hablante: companero
}
-> DONE
