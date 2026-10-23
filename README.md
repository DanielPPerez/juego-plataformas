# Juego de plataformas procedural

Phaser 3 + TypeScript + Vite. Diseño en [docs/mini-gdd-plataformas-procedural.md](docs/mini-gdd-plataformas-procedural.md).

## Comandos

- `npm run dev`: servidor de desarrollo
- `npm run build`: build de producción en `dist/` (comprimir en zip para itch.io)
- `npm test`: tests del generador (cada chunk se puede cruzar + 1000 niveles completables)
- `npm run chunks`: convierte los chunks ASCII de `scripts/chunks/` a JSON de Tiled (`-- --force` para sobrescribir)

## Controles

A/D o flechas: moverse · W/Espacio: saltar (doble salto en el aire) · Shift: dash · S o Abajo: bajar de una plataforma · Esc: pausa · F1: panel de ajuste

- **Caballero:** clic = corte lateral · W/↑ + clic = corte hacia arriba · S/↓ + clic en el aire = corte hacia abajo (rebota al acertar)
- **Mago:** clic = rayo hacia el cursor · clic derecho = nova arcana

## Herramientas de desarrollo

Con `npm run dev` (o `?dev` en la URL):

- El menú tiene un selector para ir directo al Nivel 1, al Nivel 2 o al jefe (La Llave), con el personaje que elijas.
- En juego: **F2** salta el tramo actual (termina el nivel o mata al jefe) y **F3** activa o desactiva la invencibilidad.
- URL: `?seed=abc` repite una run, `?chunk=N` empieza en el chunk N, `?boss` va directo a la persecución y `?mage` juega con el Mago.

## Arte

Ver [docs/assets.md](docs/assets.md): dónde descargar, dónde poner los archivos y en qué formato.

## Carpetas

- `docs/`: GDD y notas de diseño
- `scripts/chunks/`: chunks de nivel en ASCII; `npm run chunks` los convierte a JSON de Tiled en `src/data/chunks/`
- `src/assets/`: arte del juego (PNG; ver docs/assets.md)
- `public/assets/`: fuente pixel y tileset placeholder para abrir los chunks en Tiled
- `src/scenes/`: escenas de Phaser
- `src/entities/`: jugador, enemigos y jefes
- `src/systems/`: generador y streaming de chunks, validador, RNG, mejoras, guardado
- `src/data/`: chunks y datos de jugador/enemigos/mejoras/jefes en JSON
- `tests/`: tests del generador (seeds) y de las mejoras
