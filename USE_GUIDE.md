# Guía de uso — D&D Manager

Esta guía explica **qué puedes hacer** en la app y **quién puede hacerlo** — sin entrar en cómo está construido por dentro (para eso está el [README](README.md)). Pensada tanto para quien lleva la partida (**Master**) como para quien juega (**Jugador/miembro**).

---

## Primeros pasos

- **Regístrate** con email y contraseña, o entra directamente con tu cuenta de **Google** (botón de Google en login/registro) — no hace falta elegir contraseña si usas Google.
- **Crea un grupo** para tu partida (te conviertes automáticamente en su **Master**) o **únete a uno existente** con el código de invitación que te pase el Master.
- Desde "Grupos" ves todos los grupos en los que participas, seas Master o jugador.

## Roles: Master vs. Jugador

- **Master**: la persona que crea el grupo. Gestiona miembros, sube el material de la partida (fichas, mapas, música) y tiene control total sobre el grupo.
- **Jugador**: cualquier otro miembro. Ve el material del grupo, gestiona su(s) propio(s) personaje(s) y participa en el chat/música según los permisos que el Master le dé.

El Master puede delegar algunos permisos concretos a jugadores (por ejemplo, gestionar la música — ver más abajo). El resto de acciones "de Master" no se pueden delegar.

---

## Grupos

- **Cualquier miembro** puede ver el detalle del grupo: nombre, lista de miembros, y accesos a fichas/diario/mapa/música.
- **El Master** puede:
  - Regenerar el código de invitación (invalida el anterior).
  - Expulsar a un miembro.
  - Elegir el color de los dados 3D del grupo (ver "Chat y dados" más abajo).
- **Cualquier jugador** puede salir del grupo por su cuenta cuando quiera.

## Fichas de personaje

- Las fichas se importan desde el `.md` que exporta Foundry VTT (arrastra el archivo o selecciónalo — no hace falta copiar/pegar texto).
- **Quién ve qué**:
  - El **dueño del personaje** y el **Master** ven la ficha completa (stats, inventario, conjuros, biografía...).
  - **Otros jugadores** solo ven el nombre y el retrato — útil para no destripar secretos del personaje de otro.
- **Editar sobre la marcha**: los puntos de golpe (PG) actuales y los huecos de conjuro gastados/máximos se pueden ajustar directamente desde la ficha durante la sesión (dueño o Master), sin tener que reimportar nada.
- **Imágenes**: puedes subir varias fotos/atuendos a la galería de un personaje y elegir cuál es el retrato principal.
- **Duplicar un personaje** a otro grupo (útil si juegas la misma ficha en varias mesas).
- **Borrar un personaje**: solo el Master puede hacerlo (ni siquiera el propio dueño), y pide confirmación explícita porque no se puede deshacer.

## Diario de grupo y diario personal

- Cada grupo tiene un **diario compartido** (visible para todos los miembros) y cada personaje puede tener su propio **diario personal**.
- **Importar un vault de Obsidian** (`.zip`) reemplaza por completo el diario de grupo — solo el Master puede hacerlo, y se pide confirmación porque es destructivo.
- **Crear, editar y borrar páginas** del diario de grupo está abierto a cualquier miembro (no solo al Master) — es un espacio colaborativo de notas de la partida. El diario personal de un personaje solo lo edita su dueño o el Master.
- Las páginas soportan **enlaces internos** (`[[Título de otra página]]`) que se navegan con un click, e imágenes embebidas.
- Un buscador en el panel lateral filtra las secciones (títulos de página) del árbol, sin tener que desplegar todo a mano.

## Mapa de campaña

- Un grupo puede tener **varios mapas**: el primero que se sube se convierte automáticamente en el **mapa del Mundo** (siempre fijo arriba del panel), y se pueden añadir tantos mapas de zona/ciudad como haga falta, organizados por **continente** en el panel lateral.
- **Subir y editar mapas** (imagen, título, continente, borrar) es solo del Master. **Ver el mapa y moverte por él** (arrastrar, hacer zoom) está abierto a cualquier miembro.
- El Master puede colocar **pines** sobre el mapa con un título, y enlazarlos opcionalmente a:
  - una página del diario de grupo (para "leer más" sobre ese lugar), y/o
  - **otro mapa del grupo** — al hacer click en el pin aparece un enlace "Ir a [mapa] →" que te lleva directamente a ese mapa de zona.
- Si reemplazas la imagen de un mapa ya existente, tiene que medir exactamente lo mismo que la anterior (así los pines no se descuadran).

## Música ambiente

- Cada grupo puede tener varias **listas de reproducción** (p. ej. "Taberna", "Combate") con canciones de YouTube (solo se oye el audio).
- Por defecto solo el **Master** gestiona la música, pero puede **dar permiso a jugadores concretos** para crear listas y añadir/editar/borrar/reordenar canciones.
- Una lista se puede marcar como **"abierta"**: en ese caso, cualquier miembro puede añadirle canciones aunque no tenga el permiso general — y puede borrar las que él mismo añadió.
- Controles disponibles para quien esté escuchando: reproducir/pausar, siguiente/anterior, aleatorio, repetir una canción, buscador de canciones (general o por lista), mover una canción a otra lista, reordenar arrastrando, y una cola personal **"reproducir después"** (deslizando una canción hacia la derecha) que solo tú ves y no se guarda para nadie más.
- Hay atajos de teclado mientras escuchas (espacio para pausar, flechas para avanzar/retroceder o cambiar de canción, arriba/abajo para el volumen, M para silenciar).
- La música sigue sonando en una barra inferior aunque navegues a otra página del grupo.

## Chat en vivo y tiradas de dados

- El **Master** inicia una "sesión" de chat cuando empieza a jugar, y la termina cuando acaba — mientras está activa, cualquier miembro puede escribir mensajes y tirar dados. Al terminar la sesión, la conversación se borra (es un chat de la sesión, no un historial permanente); si quieres guardarla, usa el botón **"Descargar"** antes de cerrarla.
- **Tirar dados**: desde el menú de tiradas (fórmula tipo `1d20+5`, o las acciones ya calculadas de tu ficha — ataques, salvaciones, habilidades) se lanzan dados 3D físicos en pantalla, y el resultado se publica automáticamente en el chat para que lo vea todo el grupo.
- Solo puedes tirar en nombre de tu propio personaje (o el Master en nombre de cualquiera).
- El Master puede elegir el **color de los dados** del grupo desde el detalle del grupo, para que combinen con el tono de la partida.

---

## Algunos consejos

- Si vas a reemplazar la imagen de un mapa, exporta desde el mismo lienzo/tamaño que la anterior — si mide distinto, la app te avisará y no la dejará subir hasta que coincida.
- El chat de sesión es efímero a propósito: descarga la conversación antes de "Finalizar sesión" si quieres conservarla.
- Si un jugador no ve la ficha completa de otro, es el comportamiento esperado (no un fallo) — solo el dueño y el Master ven todos los detalles.
- Delegar permisos (música, o en el futuro otros) es una buena forma de repartir tareas de mesa sin dar acceso total de Master.
