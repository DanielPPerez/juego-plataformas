# Juego de plataformas procedural

Phaser 3 + TypeScript + Vite. Diseño en [docs/mini-gdd-plataformas-procedural.md](docs/mini-gdd-plataformas-procedural.md).

## Comandos

- `npm run dev`: servidor de desarrollo
- `npm run build`: build de producción en `dist/` (comprimir en zip para itch.io)
- `npm test`: tests del generador (cada chunk se puede cruzar + 1000 niveles completables)
- `npm run chunks`: convierte los chunks ASCII de `scripts/chunks/` a JSON de Tiled (`-- --force` para sobrescribir)

Abre el juego con `?seed=abc` para repetir una run concreta , `?chunk=N` para empezar en el chunk N y `?boss` para ir directo a la persecución del jefe.

## Controles

A/D o flechas: moverse · W/Espacio: saltar (doble salto en el aire) · Shift: dash · S o Abajo: bajar de una plataforma · F1: panel de ajuste · R: nueva run

## Carpetas

- `docs/`: GDD y notas de diseño
- `scripts/chunks/`: chunks de nivel en ASCII; `npm run chunks` los convierte a JSON de Tiled en `src/data/chunks/`
- `public/assets/`: sprites, tiles, fondos, UI, fuentes y audio
- `src/scenes/`: escenas de Phaser
- `src/entities/`: jugador, enemigos y jefes
- `src/systems/`: generador y streaming de chunks, validador, RNG, mejoras, guardado
- `src/data/`: chunks y datos de jugador/enemigos/mejoras/jefes en JSON
- `tests/`: tests del generador con seeds
