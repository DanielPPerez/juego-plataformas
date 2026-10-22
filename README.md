# Juego de plataformas procedural

Phaser 3 + TypeScript + Vite. Diseño en [docs/mini-gdd-plataformas-procedural.md](docs/mini-gdd-plataformas-procedural.md).

## Comandos

- `npm run dev`: servidor de desarrollo
- `npm run build`: build de producción en `dist/` (comprimir en zip para itch.io)

## Carpetas

- `docs/`: GDD y notas de diseño
- `tiled/`: archivos fuente de Tiled (.tmx / .tsx); se exportan a JSON en `src/data/`
- `public/assets/`: sprites, tiles, fondos, UI, fuentes y audio
- `src/scenes/`: escenas de Phaser
- `src/entities/`: jugador, enemigos y jefes
- `src/systems/`: generador de niveles, streaming de persecución, RNG, mejoras, guardado
- `src/data/`: salas, chunks y datos de enemigos/mejoras/jefes en JSON
- `tests/`: tests del generador con seeds
