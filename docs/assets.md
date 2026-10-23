# Guía de assets

## Cómo se cargan

- Todo PNG dentro de `src/assets/` se carga solo. **El nombre del archivo es la clave**: `src/assets/sprites/knight.png` sustituye al placeholder `knight`. Las subcarpetas solo sirven para ordenar.
- Si un archivo no existe, el juego dibuja su placeholder (los rectángulos de colores actuales). Se puede ir sustituyendo el arte de uno en uno.
- Las **hojas de sprites** (varios frames en una imagen) se declaran en [`src/data/assets.json`](../src/data/assets.json) con el tamaño de frame y las animaciones: `"run": [primerFrame, últimoFrame, fps]`. Los frames se numeran de izquierda a derecha y de arriba abajo, empezando en 0.
- Los sprites deben **mirar a la derecha**: el juego los voltea para ir a la izquierda.
- Después de añadir o quitar un PNG, reinicia `npm run dev`. Vite detecta los archivos al arrancar.

## Formato

| Qué | Formato |
| --- | --- |
| Imágenes | **PNG** con transparencia, sin escalar (1×). El juego escala ×3 con píxeles nítidos. |
| Paleta | 32 colores como máximo (GDD §10: Endesga 32, Dawnbringer 32…) |
| Audio (más adelante) | **OGG** + **MP3** del mismo sonido (Safari no reproduce OGG) |
| Fuentes | TTF/WOFF en `public/assets/fonts/` |

## Qué archivos usa el juego

| Archivo (`src/assets/…`) | Tamaño | Notas |
| --- | --- | --- |
| `sprites/knight.png` | frames de 24×32 | 25 frames (ver la tabla de abajo) |
| `sprites/mage.png` | frames de 24×32 | 19 frames (ver la tabla de abajo) |
| `sprites/bolt.png` | 8×8 | Rayo del Mago (el juego lo rota hacia donde va) |
| `sprites/wave.png` | 10×16 | Onda de corte del Caballero (mejora Proyectil extra) |
| `sprites/cultist.png` | frames de 16×24 | Animación `walk` |
| `sprites/rat.png` | frames de 14×8 | Animación `walk` |
| `sprites/larva.png` | frames de 10×6 | Animación `walk` |
| `sprites/deep_one.png` | frames de 16×24 | Profundo (bioma 2), animación `walk` |
| `sprites/night_gaunt.png` | frames de 20×14 | Descarnado nocturno (bioma 2), animación `fly` |
| `sprites/shoggoth.png` / `shoggoth_small.png` | 28×20 / 16×12 | Shoggoth menor y sus mitades (bioma 3), animación `walk` |
| `sprites/mi_go.png` | frames de 18×14 | Mi-Go (bioma 3), animación `fly` |
| `sprites/shot.png` | 6×6 | Proyectil enemigo (Mi-Go, lluvia de La Puerta) |
| `sprites/exit.png` | 16×32 | Puerta de salida |
| `sprites/coin.png` | 6×6 | Moneda |
| `sprites/chest.png` | 14×10 | Cofre |
| `tiles/tiles1.png`, `tiles2.png`, `tiles3.png` | tiles de 16×16 | Uno por bioma. Tile 0 = bloque sólido, tile 1 = plataforma atravesable (ver abajo) |
| `ui/heart.png`, `ui/heart-empty.png` | 7×6 | Corazones del HUD |

Si un pack trae frames de otro tamaño (por ejemplo, un caballero de 32×32), no hace falta recortarlo: basta con cambiar `frameWidth`/`frameHeight` y los índices de animación en `assets.json`. Yo lo ajusto.

**Todavía sin soporte (lo añado cuando tengas el arte):** fondos con parallax (3 capas por bioma), partes de los jefes (hoy son formas geométricas en `src/entities/bosses/bossLooks.ts`), tiles de borde y esquina (autotiling) y audio.

## Dibujar tu propio arte

### Herramientas

| Herramienta | Precio | Por qué |
| --- | --- | --- |
| [Aseprite](https://www.aseprite.org/) | ~20 USD (o gratis compilándolo desde el código fuente) | El estándar para pixel art animado: capas, onion skin y exportación directa a sprite sheet |
| [Piskel](https://www.piskelapp.com/) | Gratis, en el navegador | Lo más sencillo para empezar: frames, onion skin y exportación a PNG sprite sheet |
| [Lospec Pixel Editor](https://lospec.com/pixel-editor/) | Gratis, en el navegador | Bueno para tiles y sprites sueltos, con paletas de Lospec integradas |
| [Pixilart](https://www.pixilart.com/draw) | Gratis, en el navegador | Alternativa sencilla con animación |

Recomendación: empieza con **Piskel** y, si te engancha, pasa a **Aseprite**.

### Cómo se monta una sprite sheet

- **Lienzo de cada frame:** el tamaño de la tabla (24×32 para Caballero y Mago). Todos los frames de una hoja miden lo mismo.
- **Pies abajo y centrados.** El juego coloca el sprite con los pies en la parte inferior del frame y la caja de colisión mide 16×28 en el centro. Deja unos 4 px libres a cada lado (para la espada, la capa…).
- **Mirando a la derecha.**
- **Exportar:** una **fila horizontal** con todos los frames seguidos en el orden de la tabla, sin márgenes ni separación entre frames, a escala 1×. En Piskel: *Export → PNG → Spritesheet*, 1 fila. En Aseprite: *File → Export Sprite Sheet → Horizontal Strip*, *Border/Spacing = 0*.
- Si cambias el número de frames de una animación, ajusta los índices en `src/data/assets.json` (o dímelo y lo hago yo).

### Caballero (`knight.png`, frames de 24×32, 25 frames → imagen de 600×32)

| Frames | Animación | Notas |
| --- | --- | --- |
| 0–3 | `idle` | Respiración, 6 fps |
| 4–11 | `run` | Ciclo de carrera, 12 fps |
| 12 | `jump` | Subiendo |
| 13 | `fall` | Cayendo |
| 14–16 | `attack` | Corte lateral (dura 0,12 s: los 3 frames rápidos) |
| 17–19 | `attack_up` | Corte hacia arriba |
| 20–22 | `attack_down` | Corte hacia abajo (en el aire) |
| 23 | `dash` | Pose estirada |
| 24 | `hurt` | Retroceso al recibir daño |

### Mago (`mage.png`, frames de 24×32, 19 frames → imagen de 456×32)

| Frames | Animación |
| --- | --- |
| 0–3 | `idle` |
| 4–11 | `run` |
| 12 | `jump` |
| 13 | `fall` |
| 14–16 | `cast` (disparo y nova) |
| 17 | `dash` |
| 18 | `hurt` |

### Enemigos (una fila con su animación `walk`, 4 frames)

| Archivo | Frame | Imagen completa |
| --- | --- | --- |
| `cultist.png` | 16×24 | 64×24 |
| `rat.png` | 14×8 | 56×8 |
| `larva.png` | 10×6 | 40×6 |

### Tiles (`tiles1.png` … `tiles3.png`, uno por bioma)

Por ahora, 2 tiles de 16×16 en fila (imagen de 32×16): el primero es el bloque sólido y el segundo la plataforma atravesable (dibuja solo la franja de arriba; el resto, transparente). Cuando tengas más variantes (bordes, esquinas, decoración), dímelo y añado el autotiling.

## Dónde descargar (gratis)

Comprueba siempre la licencia en la página y apúntala en `CREDITS.md`. Lo más cómodo es **CC0**, que no exige ni atribución.

| Pack | Qué trae | Licencia |
| --- | --- | --- |
| [GothicVania Cemetery Pack](https://opengameart.org/node/85024) (ansimuz) | Tileset 16×16, 3 fondos con parallax, decorados, protagonista con 6 animaciones y 3 enemigos | CC0 |
| [GothicVania Church Pack](https://opengameart.org/content/gothicvania-church-pack) (ansimuz) | Tileset 16×16, fondos, protagonista animado y 3 enemigos | CC0 |
| [Knight 16x16 Platformer Character](https://thepixelgame.itch.io/knight-16x16-platformer-character-sprite-sheet) (ThePixelGame) | Caballero con idle, correr, salto y aterrizaje | Gratis, uso comercial; no se puede redistribuir |
| [Free Cthulu](https://chierit.itch.io/free-cthulu) (chierit) | Monstruo lovecraftiano con 7 animaciones (base para La Llave o enemigos) | CC-BY 4.0 (hay que acreditar) |
| [March Monsters 2018 Pack](https://sprngr.itch.io/march-monsters-2018-pack) (sprngr) | Más de 150 monstruos pixel art | Gratis (revisar la licencia) |
| [kenney.nl](https://kenney.nl/assets) | UI, efectos de sonido | CC0 |
| [Lospec](https://lospec.com/palette-list) | Paletas | — |

Opciones de pago baratas que encajan con el tema: [Lovecraftian Monsters Pack](https://ariaw.itch.io/lovecraftian-monsters-pack) (1 USD, incluye un cultista) y [Moonlit Dungeon tileset](https://sebbyspoons.itch.io/moonlit-dungeon-dark-fantasy-pixel-platformer-tileset) (4,99 USD).

> ⚠️ El repositorio es **público**: los packs con licencia "no redistribuir" (por ejemplo, el de ThePixelGame) no se pueden subir a GitHub tal cual. En ese caso hay que dejarlos fuera del repo (`.gitignore`) o usar solo packs CC0/CC-BY.

## Flujo recomendado

1. Descarga un pack y descomprímelo en `art-source/<nombre-del-pack>/`. Esa carpeta está en `.gitignore`.
2. Dime qué pack es. Yo elijo los sprites, los copio a `src/assets/` con el nombre correcto, ajusto `assets.json` (frames y animaciones) y adapto los tiles.
3. Apunto el pack en `CREDITS.md`.
