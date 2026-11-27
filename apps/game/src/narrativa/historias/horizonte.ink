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

// --- Acto II: Archipiélago de los Oficios ---
VAR llegada_oficios_vista = false
VAR conoce_a_brisa = false
VAR talleres_visitados = 0
VAR taller_realista = false
VAR taller_investigador = false
VAR taller_artistico = false
VAR taller_social = false
VAR taller_emprendedor = false
VAR taller_convencional = false
VAR eco_oficios_resuelto = false
VAR respuesta_eco_oficios = ""   // ceder | separar | preguntar
VAR insignia_curiosidad = false

// --- Variables que el juego actualiza desde fuera ---
VAR faro_encendido = false
VAR faro_oficios_encendido = false
VAR ultimo_disfrute = 0   // 1 a 4: cuánto disfrutó el último minijuego

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
    Cuando estés listo, la barca de la orilla sur te llevará al Archipiélago de los Oficios. # hablante: Marea
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
Cuando estés listo, la barca de la orilla sur te estará esperando, Navegante. # hablante: Marea # evento: fin-acto-1
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


// ######################################################
//  ACTO II — ARCHIPIÉLAGO DE LOS OFICIOS (borrador 1)
//  Seis islitas, una por tipo de interés (modelo de Holland):
//  realista · investigador · artístico · social · emprendedor · convencional
//  En cada una, un mentor propone un minijuego. Al terminar,
//  el joven dice cuánto lo disfrutó y cómo sintió que le salió.
// ######################################################

// ======================================================
//  LA BARCA — viajar entre regiones
// ======================================================
=== muelle_raices ===
{ not insignia_autoconocimiento:
    Una barca pequeña se mece junto al muelle. Todavía no es momento de zarpar. # hablante: companero
    { faro_encendido:
        Antes, habla con Marea. Seguro tiene algo que decirte. # hablante: companero
    - else:
        La Bruma no deja ver el horizonte. Primero hay que encender el faro. # hablante: companero
    }
    -> DONE
}
La barca está lista. Al norte, entre la niebla que se disipa, se ven varias islitas. # hablante: companero
{ llegada_oficios_vista:
    ¿Volvemos al Archipiélago de los Oficios? # hablante: companero
- else:
    Es el Archipiélago de los Oficios. Dicen que en cada islita vive alguien que ama lo que hace. # hablante: companero
}
* [Zarpar.]
    Sueltas la cuerda. El viento empuja la vela. # evento: viajar:oficios
* [Todavía no.]
    Aquí estaré cuando quieras. # hablante: companero
- -> DONE

=== muelle_oficios ===
Desde este muelle se puede volver a la Isla de las Raíces. # hablante: companero
* [Volver a la Isla de las Raíces.]
    Pones rumbo al sur. # evento: viajar:raices
* [Seguir explorando el archipiélago.]
- -> DONE


// ======================================================
//  LLEGADA Y BRISA — la cartógrafa
// ======================================================
=== llegada_oficios ===
~ llegada_oficios_vista = true
La barca toca la madera de un muelle. Alrededor, seis islitas salpican el mar, cada una con su propio humo, sus luces y sus ruidos.
¡Mira! En una suenan martillos; en otra, alguien canta; en otra hay un telescopio enorme. # hablante: companero
En el muelle, una mujer con un mapa enrollado bajo el brazo te saluda. # evento: mision-brisa
-> DONE

=== brisa ===
{ conoce_a_brisa:
    -> brisa_reencuentro
}
~ conoce_a_brisa = true
¡Una brújula que se mueve! Hacía tiempo que no veía una. Soy Brisa; dibujo los mapas de este archipiélago. # hablante: Brisa
Cada islita es un oficio distinto. En todas vive alguien que te puede enseñar lo que hace... si te animas a probarlo. # hablante: Brisa
¿Ya sabes a qué te quieres dedicar? # hablante: Brisa

* [Tengo una idea, pero no estoy seguro.]
    Una idea es un buen comienzo. Aquí podrás probarla, y quizás descubrir otras. # hablante: Brisa
* [No tengo ni idea.]
    Mejor así: vienes con los ojos abiertos. Nadie descubre lo que le gusta sin probar cosas. # hablante: Brisa
* [Sí, lo tengo clarísimo.]
    ¡Qué bien! Aun así, date permiso de visitar otras islas. A veces lo que nos gusta tiene parientes inesperados. # hablante: Brisa

- No se trata de acertar, sino de fijarte en dos cosas: qué disfrutas y qué se te da bien. No siempre coinciden. # hablante: Brisa
Cuando hayas visitado al menos cuatro islitas, ve al faro de la roca central. Dicen que solo se enciende cuando uno ha mirado varios caminos. # hablante: Brisa # evento: mision-talleres
-> DONE

= brisa_reencuentro
{
- faro_oficios_encendido && not insignia_curiosidad:
    -> brisa_despedida
- faro_oficios_encendido:
    Tu mapa ya tiene varios caminos marcados. Míralo en tu Bitácora cuando quieras. # hablante: Brisa
- talleres_visitados >= 4:
    Ya visitaste {talleres_visitados} islitas. El faro de la roca central te espera. # hablante: Brisa
- talleres_visitados > 0:
    Llevas {talleres_visitados} de seis islitas. Sigue explorando: cada una te mostrará algo distinto de ti. # hablante: Brisa
- else:
    Navega hacia cualquier islita y busca su muelle. No hay un orden correcto. # hablante: Brisa
}
-> DONE

= brisa_despedida
¡El faro brilla! Desde aquí se ven todas las islitas a la vez. # hablante: Brisa
Probaste {talleres_visitados} oficios distintos. Eso pide algo que no todos tienen: atreverse a explorar sin saber qué vas a encontrar. # hablante: Brisa
~ insignia_curiosidad = true
Eso tiene un nombre: Curiosidad. Llévala contigo. # hablante: Brisa # evento: insignia:curiosidad
En tu Bitácora dibujé tu mapa: lo que disfrutaste y lo que se te dio bien. # hablante: Brisa
Y un consejo de cartógrafa: los mapas se comprueban caminando. Busca a alguien que trabaje en lo que te llamó la atención y pregúntale cómo es su día. # hablante: Brisa
Puedes anotarlo como una ruta en tu Diario de Navegación. # hablante: Brisa # evento: fin-acto-2
-> DONE


// ======================================================
//  LOS SEIS MENTORES
//  Cada uno: presentación → minijuego → cierre (lo llama el juego)
// ======================================================

// ---------- REALISTA: el astillero de Don Fermín ----------
=== mentor_realista ===
{ taller_realista:
    Ese bote ya flota gracias a ti. Vuelve cuando quieras a darle unos martillazos. # hablante: Don Fermín
    -> DONE
}
Aquí huele a madera recién cortada. Un hombre de manos grandes lija el casco de un bote.
¡Llegas justo! Soy Fermín, carpintero de ribera: construyo y reparo barcos. # hablante: Don Fermín
A este bote le faltan clavos en el casco. Hay que darles en el momento justo, ni antes ni después. ¿Me ayudas? # hablante: Don Fermín # evento: minijuego:realista
-> DONE

=== cierre_realista ===
~ taller_realista = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    Se nota que te gusta ver cómo las cosas toman forma con tus manos. # hablante: Don Fermín
- else:
    No a todos les llama el martillo, y está bien. Pero ahora sabes cómo se siente. # hablante: Don Fermín
}
En este oficio se trabaja con el cuerpo, con herramientas y con cosas que se pueden tocar: construir, reparar, cultivar, moverse. # hablante: Don Fermín
Hay mucha gente así: electricistas, mecánicos, técnicos en refrigeración, chefs, agrónomos, atletas, ingenieros civiles. # hablante: Don Fermín
-> cierre_comun("realista")

// ---------- INVESTIGADOR: el observatorio de Ana Luz ----------
=== mentor_investigador ===
{ taller_investigador:
    Las estrellas siguen ahí, esperando nuevas preguntas. # hablante: Ana Luz
    -> DONE
}
En lo alto de la islita, una cúpula blanca se abre al cielo. Una mujer anota números en una libreta.
Hola. Soy Ana Luz, investigadora. Paso las noches buscando patrones: en las estrellas, en las mareas, en los números. # hablante: Ana Luz
Te propongo un reto: en cada serie hay una regla escondida. Descúbrela y dime qué viene después. # hablante: Ana Luz # evento: minijuego:investigador
-> DONE

=== cierre_investigador ===
~ taller_investigador = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    ¿Sentiste ese cosquilleo cuando la regla aparece? A eso le llamo la alegría de entender. # hablante: Ana Luz
- else:
    A veces los acertijos cansan. Lo importante es que te diste cuenta. # hablante: Ana Luz
}
Quienes disfrutan este oficio hacen preguntas y buscan respuestas con paciencia: observan, comparan, prueban. # hablante: Ana Luz
Médicos, programadores, biólogos, analistas de datos, farmacéuticos, economistas... todos investigan a su manera. # hablante: Ana Luz
-> cierre_comun("investigador")

// ---------- ARTÍSTICO: el taller de colores de Kiko ----------
=== mentor_artistico ===
{ taller_artistico:
    Tu vela sigue siendo la más bonita del archipiélago. # hablante: Kiko
    -> DONE
}
Las paredes de esta islita están cubiertas de murales. Un joven con las manos manchadas de pintura te sonríe.
¡Pasa, este es mi taller! Soy Kiko: diseño, pinto murales y a veces hago música. # hablante: Kiko
Tu barca tiene la vela en blanco. Aquí no hay respuestas correctas: diséñala como tú quieras. # hablante: Kiko # evento: minijuego:artistico
-> DONE

=== cierre_artistico ===
~ taller_artistico = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    Se te iluminó la cara mientras creabas. Eso no se finge. # hablante: Kiko
- else:
    Crear desde cero puede dar vértigo. ¡Y aun así lo hiciste! # hablante: Kiko
}
En este oficio se expresa lo que uno ve y siente: con colores, sonidos, palabras, movimientos o imágenes. # hablante: Kiko
Diseñadores, músicos, arquitectos, escritores, fotógrafos, animadores, publicistas... # hablante: Kiko
Mira tu barca: ahora lleva tu vela. # hablante: Kiko
-> cierre_comun("artistico")

// ---------- SOCIAL: la escuela de Doña Altagracia ----------
=== mentor_social ===
{ taller_social:
    Los vecinos todavía hablan de lo bien que los escuchaste. # hablante: Doña Altagracia
    -> DONE
}
Bajo un gran árbol hay bancos, una pizarra y un botiquín. Una señora de voz suave atiende a la gente que llega.
Qué bueno que llegas, mi amor. Soy Altagracia: aquí enseño a leer a los niños y curo raspones. # hablante: Doña Altagracia
Hoy vienen varios vecinos con problemas. ¿Me ayudas a atenderlos? Lo más importante es escuchar bien. # hablante: Doña Altagracia # evento: minijuego:social
-> DONE

=== cierre_social ===
~ taller_social = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    Tienes paciencia y buen corazón para la gente. Eso vale oro. # hablante: Doña Altagracia
- else:
    Atender a otros cansa a veces, y está bien reconocerlo. # hablante: Doña Altagracia
}
En este oficio uno trabaja con personas: enseñar, cuidar, acompañar, escuchar. # hablante: Doña Altagracia
Maestros, enfermeras, psicólogos, trabajadores sociales, terapeutas, entrenadores, orientadores... # hablante: Doña Altagracia
-> cierre_comun("social")

// ---------- EMPRENDEDOR: el mercadito de Yaritza ----------
=== mentor_emprendedor ===
{ taller_emprendedor:
    ¡Volviste! El puesto sigue funcionando gracias a tus ideas. # hablante: Yaritza
    -> DONE
}
En esta islita hay toldos de colores y gente regateando. Una muchacha organiza cajas de frutas a toda velocidad.
¡Hey! Soy Yaritza. Empecé vendiendo jugos en una mesita y ahora tengo tres puestos. # hablante: Yaritza
Te presto un puesto por tres días. Tú decides cuántos jugos preparar y a qué precio venderlos. ¿Te atreves? # hablante: Yaritza # evento: minijuego:emprendedor
-> DONE

=== cierre_emprendedor ===
~ taller_emprendedor = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    ¡Tienes olfato para los negocios! Te brillan los ojos cuando hay que decidir. # hablante: Yaritza
- else:
    Arriesgar no es para todo el mundo, y saberlo también es ganancia. # hablante: Yaritza
}
En este oficio se convence, se organiza y se toman decisiones con riesgo: liderar equipos, vender ideas, iniciar proyectos. # hablante: Yaritza
Emprendedores, gerentes, abogados, vendedores, publicistas, políticos, organizadores de eventos... # hablante: Yaritza
-> cierre_comun("emprendedor")

// ---------- CONVENCIONAL: la capitanía de Ramón ----------
=== mentor_convencional ===
{ taller_convencional:
    Desde que ordenaste esas cajas, no se ha perdido ni un paquete. # hablante: Ramón
    -> DONE
}
En la capitanía del puerto todo tiene su lugar: mapas en sus tubos, libros en sus estantes. Un señor con lentes revisa una lista.
Buenas. Soy Ramón, capitán de puerto. Me encargo de que cada carga llegue a su destino. # hablante: Ramón
Acaba de llegar un barco y hay que repartir la carga en el muelle correcto. ¿Me echas una mano? # hablante: Ramón # evento: minijuego:convencional
-> DONE

=== cierre_convencional ===
~ taller_convencional = true
~ talleres_visitados += 1
{ ultimo_disfrute >= 3:
    Te gusta que las cosas queden bien hechas y en su sitio. Eso escasea, ¿sabes? # hablante: Ramón
- else:
    Ordenar no es lo más emocionante para todos. Pero ahora sabes cómo es. # hablante: Ramón
}
En este oficio se trabaja con datos, orden y precisión: registrar, calcular, organizar, cuidar los detalles. # hablante: Ramón
Contadores, administradores, secretarios ejecutivos, bibliotecarios, auditores, técnicos en logística... # hablante: Ramón
-> cierre_comun("convencional")

// Final común de cada taller
=== cierre_comun(id) ===
{
- talleres_visitados >= 4 && not faro_oficios_encendido:
    Ya visitamos {talleres_visitados} islitas. ¡El faro de la roca central nos espera! # hablante: companero # evento: taller-completado:{id}
- talleres_visitados == 6:
    ¡Visitamos las seis islitas! # hablante: companero # evento: taller-completado:{id}
- talleres_visitados == 1:
    ¡Primera islita visitada! ¿Cuál probamos ahora? # hablante: companero # evento: taller-completado:{id}
- else:
    Llevamos {talleres_visitados} islitas. ¿Cuál probamos ahora? # hablante: companero # evento: taller-completado:{id}
}
-> DONE


// ======================================================
//  EL ECO DE LOS OFICIOS — "eso no da dinero"
// ======================================================
=== eco_oficios ===
La niebla se arremolina sobre el agua y toma forma. Esta vez el Eco habla con voces que conoces: de casa, de la escuela, de la calle.
¿Para qué pruebas tantas cosas? Eso no da dinero. # hablante: Eco
Y además, eso no es para alguien como tú. Estudia lo que te digan y ya. # hablante: Eco

* [Quizás tenga razón. Mejor hago lo que esperan de mí.]
    ~ respuesta_eco_oficios = "ceder"
    Escuchar a quienes te quieren es importante. Pero hay una diferencia entre un consejo y una orden. # hablante: companero
    Puedes escuchar su preocupación y, aun así, elegir tú. # hablante: companero
* [El dinero importa, pero no es lo único que importa.]
    ~ respuesta_eco_oficios = "separar"
    ¡Eso! Se puede pensar en el dinero sin dejar que decida todo. Muchos oficios dan para vivir si uno se prepara bien. # hablante: companero
* [¿Quién dijo que no es para mí? ¿Según quién?]
    ~ respuesta_eco_oficios = "preguntar"
    Buena pregunta. Muchos "eso no es para ti" vienen de miedos o prejuicios, no de lo que tú puedes hacer. # hablante: companero

- La niebla tiembla. El Eco repite "no da dinero, no es para ti"... cada vez más bajito, hasta que se deshace. # hablante: Eco
~ eco_oficios_resuelto = true
Los Ecos de este archipiélago hablan de dinero y de lo que "le toca" a cada quien. Ahora ya sabes reconocerlos. # hablante: companero # evento: ocultar:eco
-> DONE


// ======================================================
//  EL FARO DE LOS OFICIOS
// ======================================================
=== faro_oficios ===
{ faro_oficios_encendido:
    El faro ilumina las seis islitas. Cada una es un camino posible. # hablante: companero
    -> DONE
}
{ talleres_visitados < 4:
    El faro está apagado. En su puerta hay seis huecos con forma de herramienta, pincel, estrella, corazón, moneda y llave. # hablante: companero
    Brisa dijo que hay que visitar al menos cuatro islitas. Llevamos {talleres_visitados}. # hablante: companero
    -> DONE
}
{ not eco_oficios_resuelto:
    Algo se mueve en la niebla, alrededor del faro... # hablante: companero
    -> eco_oficios
}
Pones la mano sobre la puerta. Las islitas que visitaste se encienden una a una en tu memoria.
De todo lo que probaste, ¿qué te sorprendió más de ti? # hablante: companero
* [Que me gustó algo que nunca había probado.]
* [Que lo que creía que me gustaba sí me gusta de verdad.]
* [Que disfrutar algo y hacerlo bien no siempre van juntos.]
- Una luz cálida sube por la torre y se derrama sobre el mar. # evento: encender-faro
~ faro_oficios_encendido = true
¡Mira cómo brillan todas las islitas! Vamos a contárselo a Brisa, en el muelle. # hablante: companero
-> DONE
