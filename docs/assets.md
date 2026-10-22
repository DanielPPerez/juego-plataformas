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
| `sprites/knight.png` | frames de 24×32 | Hoja con animaciones: idle, run, jump, fall, attack, dash, hurt (ver `assets.json`) |
| `sprites/cultist.png` | frames de 16×24 | Animación `walk` |
| `sprites/rat.png` | frames de 14×8 | Animación `walk` |
| `sprites/larva.png` | frames de 10×6 | Animación `walk` |
| `sprites/exit.png` | 16×32 | Puerta de salida |
| `sprites/coin.png` | 6×6 | Moneda |
| `sprites/chest.png` | 14×10 | Cofre |
| `tiles/tiles.png` | tiles de 16×16 | Por ahora: tile 0 = bloque sólido, tile 1 = plataforma atravesable (ver abajo) |
| `ui/heart.png`, `ui/heart-empty.png` | 7×6 | Corazones del HUD |

Si un pack trae frames de otro tamaño (por ejemplo, un caballero de 32×32), no hace falta recortarlo: basta con cambiar `frameWidth`/`frameHeight` y los índices de animación en `assets.json`. Yo lo ajusto.

**Todavía sin soporte (lo añado cuando tengas el arte):** fondos con parallax (3 capas por bioma), partes de La Llave (cuerpo, llave, ojo, tentáculo), tiles de borde y esquina (autotiling) y audio.

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
