# Mini GDD — [Nombre del juego]

> Documento vivo, máximo 3–4 páginas. Si algo no cabe aquí, no entra en la v1.
> Stack: **Phaser 3 + TypeScript + Vite** · Plataforma: navegador (desktop primero, móvil después)
> Meta: **versión jugable publicada en itch.io en ~14 semanas.**

---

## 1. Pitch

- **Una frase:** "Un plataformas con generación de mapa procedural donde te enfrentas a enemigos y jefes."
- **Gancho / qué lo hace distinto:** Plataformas medieval estilo retro contra monstruos lovecraftianos; los jefes son persecuciones con scroll forzado (estilo Metal Slug 3) y los 3 son partes de una misma entidad que se fusiona al final.
- **Género:** plataformas de **scroll lateral** (izquierda → derecha), **no** metroidvania: no hay exploración en cuadrícula ni backtracking.
- **Referencias:** Mario Bros (estructura lateral de niveles), Dead Cells (loop de runs), Celeste (control preciso), Spelunky (chunks hechos a mano), Metal Slug 3 (jefes de persecución)
- **Tema / ambientación original:** Medieval oscuro con horror cósmico lovecraftiano
- **Duración de un nivel:** mínimo 5 min sin sentirse repetitivo (~40 chunks). Run completa (6 niveles + 3 jefes): ~35–40 min.

## 2. Pilares (máx. 3)

Toda decisión se valida contra estos. Si una feature no apoya un pilar, se corta.

1. **Control preciso y responsivo** (coyote time, jump buffer, salto variable)
2. **Cada run es distinta** (mapa procedural + mejoras aleatorias)
3. **Jefes como examen** (cada jefe prueba lo aprendido en su bioma)

## 3. Core loop

```
Inicio de run → Explorar nivel procedural → Enemigos / recompensas
      ↑                                              ↓
  Morir / ganar  ←  Jefe (persecución)  ←  Elegir 1 de 3 mejoras
      ↓
  Meta-progresión (opcional, v1.1)
```

## 4. Límites de alcance (NO negociables para la v1)

| Elemento                  | Límite v1                                                    |
| ------------------------- | ------------------------------------------------------------- |
| Biomas                    | **3** (cada uno = 2 niveles + 1 jefe)                   |
| Jefes                     | **3** (uno por bioma; el 3.º es la fusión)            |
| Tipos de enemigo          | **6** (2 por bioma, reutilizando comportamientos)       |
| Mejoras / upgrades        | **12–15**                                              |
| Armas / habilidades base  | 2 armas + 2 habilidades especiales (1 de cada por personaje)  |
| Personajes jugables       | 2 (Caballero melee, Mago a distancia) ⚠️ ver lista de corte |
| Meta-progresión          | **Ninguna** en v1 (solo récord en localStorage)        |
| Multijugador / online     | **No**                                                  |
| Historia                  | 3 pantallas de texto máximo                                  |
| Resolución base          | 480×270 (pixel art, escala ×2/×3/×4)                      |
| Animaciones de ejecución | 3 (1 por jefe), máx. 12 frames cada una                      |

> Regla: cualquier idea nueva va a la sección **Backlog v1.1**, no al código.
>
> ⚠️ Nota: el 2.º personaje y los jefes de persecución añaden ~2 semanas. Por eso la meta es 14 semanas y el Mago es el primer candidato a corte.

## 5. Mecánicas del jugador

- Movimiento: correr, saltar, salto variable, coyote time (~100 ms), jump buffer (~100 ms)
- Extra: **dash** (con i-frames, 1 en el aire) + **doble salto** (decidido en la semana 1: sin él las plataformas altas quedaban fuera de alcance). Wall jump descartado.
- Plataformas atravesables: se suben desde abajo; **Abajo (S/↓)** para bajar
- Combate: Melee (Caballero) · Disparo (Mago)
- Vida: 5 corazones · i-frames tras recibir daño
- Controles: teclado (A/D o flechas para moverse, W/Espacio salto) + mouse (clic izq. ataque normal, clic der. habilidad). El aim del Mago sigue al cursor. Gamepad opcional en v1.1

## 6. Generación procedural

**Método: generación on-the-fly de chunks laterales hechos a mano.** El nivel es una franja horizontal que se va generando a la derecha mientras el jugador avanza.

1. Diseñar chunks de 1 pantalla (30×17 tiles) en ASCII (`scripts/chunks/`) → `npm run chunks` los convierte a JSON de **Tiled**, que se pueden seguir editando en Tiled.
2. **3 alturas de terreno:** baja (L), media (M) y alta (H). Cada chunk declara su altura de entrada y de salida, y el generador encadena chunks cuya entrada coincide con la salida del anterior. Hay chunks llanos (L→L, M→M, H→H) y subidas (L→M, M→H, L→H).
3. **Espejos:** cada chunk normal también se usa reflejado en horizontal (una subida L→M da una bajada M→L), lo que duplica la variedad sin diseñar más.
4. **Contrato de bordes:** en las columnas 0–1 y 28–29 hay suelo justo bajo los pies de la altura declarada y 4 filas de aire encima.
5. Cada chunk tiene una **dificultad** (1 fácil, 2 media, 3 difícil). Los **3 primeros chunks** de cada nivel son fáciles; después puede salir cualquiera. No se repite un diseño (ni su espejo) dentro de los últimos 8 chunks.
6. **On-the-fly:** el contenido de cada chunk (bloques aleatorios, enemigos, monedas) se genera cuando el jugador se acerca, con una RNG derivada de `seed:nivel:chunk`. Hay **máximo 3 chunks en memoria** (anterior, actual y siguiente); los que quedan atrás se destruyen y no se puede volver a ellos (como en Mario).
7. Caer a un hueco = perder vida y reaparecer al inicio del chunk actual.
8. **Seed** por run (para debug y para compartir runs). `?chunk=N` en la URL empieza en el chunk N (depuración).

- Chunks por bioma: **~30 diseños** (×2 con espejos), repartidos entre las 3 alturas y las 3 dificultades, + inicio y 3 salidas (una por altura)
- Longitud del nivel: 40 chunks (≈5 min), +5 por nivel
- **Validación:** cada chunk debe poder cruzarse de su entrada a su salida con la física del jugador, incluidos doble salto y dash (test BFS), y además un test genera 1000 niveles completos y comprueba que todos se pueden completar. Si los bloques aleatorios bloquean un chunk, se quitan.

### 6.1 Arena de jefe: persecución con scroll forzado

El mapa del jefe **también es procedural**, pero lineal y horizontal:

- Se usa un **pool de "chunks de persecución"** (franjas de 1 pantalla de ancho: puentes, plataformas que caen, huecos, obstáculos). Mínimo **8 por bioma**.
- **Streaming:** el mismo `ChunkStreamer` de los niveles: se generan chunks a la derecha de la cámara y se destruyen los que salen por la izquierda (máx. 3 en memoria).
- **Modo A — "Te persigue"** (entra por la izquierda): la cámara avanza sola y el borde izquierdo es zona de muerte / contacto con el jefe. El jugador debe avanzar y atacar hacia atrás.
- **Modo B — "Huye"** (entra por la derecha): el jefe retrocede y el jugador lo sigue. Si se aleja demasiado, el jefe se cura o invoca enemigos.
- Velocidad de scroll ajustable por fase (ej. 40 → 60 px/s).
- Reglas de chunks: nunca dos huecos seguidos, siempre una plataforma alcanzable con salto simple.

## 7. Jefes — La entidad dividida

**Base:** en *The Dunwich Horror* (Lovecraft, 1928), Yog-Sothoth se describe como la llave, la puerta y el guardián de la puerta a la vez. Aunque en el canon no se divide literalmente, esa triada encaja perfecto: **cada jefe es un aspecto, y el jefe final es la entidad completa.**

En lo visual, Lovecraft la describe como un conglomerado de **esferas iridiscentes**. Cada jefe lleva su propia "esfera" que, al morir, absorbe el jefe final.

| # | Bioma                  | Nombre                               | Concepto                                                                                                          | Patrones (3 máx.)                                                                                                            | Fases | Modo                                          |
| - | ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------- |
| 1 | Aldea maldita          | **La Llave**                   | Masa de tentáculos con una llave rúnica clavada como espina dorsal. Arrasa el puente de madera tras el jugador. | 1) Golpe de tentáculo desde abajo (marca en el suelo) · 2) Escupe larvas que caminan · 3) Embestida que acelera el scroll  | 2     | **A** — te persigue desde la izquierda |
| 2 | Costa / puerto podrido | **La Puerta**                  | Arco de piedra viviente montado sobre un barco-ruina que huye por el mar; de su umbral salen Profundos.           | 1) Abre el portal y salen 2–3 enemigos · 2) Lluvia de proyectiles en arco · 3) Ola que inunda la parte baja de la pantalla | 2     | **B** — huye por la derecha            |
| 3 | Ciudadela / cielo roto | **El Guardián (Yog-Sothoth)** | Conglomerado de esferas que absorbe a La Llave y La Puerta.                                                       | Fase 1: patrones de La Llave · Fase 2: patrones de La Puerta · Fase 3: combina ambos + rayo de esfera barriendo la pantalla | 3     | **A → B → A** (alterna por fase)      |

- Implementación: **máquina de estados** (Idle → Telegraph → Attack → Recover) con patrones elegidos por peso
- Cada ataque tiene **telegraph visible** (≥0.5 s: brillo, sonido o marca en el suelo)
- La fase cambia al 50% de vida (y al 25% en el jefe final)
- **Jefes por partes:** se construyen como `Container` de Phaser (cuerpo + tentáculos/partes animadas por separado con tweens). Es mucho más barato que animarlos frame a frame y se ve como Metal Slug.
- Animación de ejecución al llegar a 0 HP (1 por jefe)

## 8. Enemigos

Criaturas de los relatos originales de Lovecraft, adaptadas a lo medieval.

| Nombre                                      | Bioma | Comportamiento                                                   | Reutiliza de      | Origen                                |
| ------------------------------------------- | ----- | ---------------------------------------------------------------- | ----------------- | ------------------------------------- |
| **Cultista**                          | 1     | Patrulla entre bordes; se gira al ver al jugador                 | —                | Cultos de varios relatos              |
| **Rata del muro**                     | 1     | Enjambre de 3; corre en línea recta y salta huecos              | Patrulla          | *The Rats in the Walls*             |
| **Profundo**                          | 2     | Patrulla y salta hacia el jugador si está cerca                 | Cultista          | *The Shadow over Innsmouth*         |
| **Descarnado nocturno** (Night-gaunt) | 2     | Vuela, agarra al jugador y lo suelta desde arriba                | — (volador base) | *The Dream-Quest of Unknown Kadath* |
| **Mi-Go**                             | 3     | Vuela y dispara en línea                                        | Descarnado        | *The Whisperer in Darkness*         |
| **Shoggoth menor**                    | 3     | Masa lenta que se divide en 2 al recibir daño; bloquea pasillos | Patrulla          | *At the Mountains of Madness*       |

> Solo hay 3 comportamientos base (**patrulla, volador, tirador**); los 6 enemigos son variaciones con datos en `enemies.json`.

## 9. Mejoras

| Mejora          | Efecto                                               |
| --------------- | ---------------------------------------------------- |
| Vitalidad       | +1 corazón máx.                                    |
| Filo / Foco     | +20% daño                                           |
| Dash sangriento | El dash hace daño                                   |
| Proyectil extra | Mago: +1 proyectil · Caballero: onda de corte corta |
| Imán           | Atrae monedas                                        |
| Doble ataque    | 2 golpes por ataque                                  |
| Escudo          | Bloquea 1 golpe (se recarga por nivel)               |
| Evasión        | 15% de esquivar daño                                |
| Suerte          | Monedas ×2                                          |
| Sello arcano    | Reduce el cooldown de la habilidad en 25%            |
| Sangre maldita  | +daño con 1 corazón                                |

- Se eligen **1 de 3** a la mitad y al final de cada nivel.
- ⚠️ "Intercambio de personaje tras la primera run" es meta-progresión → se movió al **Backlog v1.1**. En v1 se elige personaje al inicio de cada run.

## 10. Arte y audio

### Dirección de arte

- **Estilo:** pixel art retro oscuro. Fondo casi negro, personajes y enemigos con colores saturados para que se lean; el horror lo dan los morados, verdes enfermizos y ámbar.
- **Paleta:** 32 colores máx. Opciones en Lospec: *Dawnbringer 32*, *Resurrect 64* (recortada) o *Endesga 32*.
- **Tamaños:**
  - Tiles: 16×16
  - Jugador: ~24×32 px
  - Enemigos: 16–32 px
  - Jefes: 160–240 px de alto (por partes)
- **Fondos:** 3 capas de parallax por bioma con atardecer o cielo con franjas y dithering.
- **Metal Slug como referencia de feel, no de nivel de detalle:** lo que se toma es el tamaño de los jefes, las explosiones y el "peso" de los golpes (hitstop de 50 ms, screen shake, flash blanco). Ese nivel de detalle frame a frame no es viable en 14 semanas.
- **Placeholders** (cuadrados de colores) hasta la semana 8.

### Audio

- SFX: jsfxr / ChipTone + Freesound (revisar licencia)
- Música: CC0 / CC-BY (acreditar), un tema por bioma + uno de jefe
- Registrar todas las licencias en `CREDITS.md` desde el día 1

### Propiedad intelectual

- Los relatos de Lovecraft son de dominio público en EE. UU. y los Mitos se usan libremente en muchísimos juegos comerciales.
- Lo que **no** se puede usar: arte, textos o diseños de adaptaciones modernas (juegos, cómics, películas) ni la marca *Call of Cthulhu*, que pertenece a Chaosium para juegos. Las criaturas se diseñan desde las descripciones originales.

### Dónde conseguir assets

| Sitio                                                                | Para qué                                                                   | Licencia             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------- |
| [kenney.nl](https://kenney.nl/assets)                                 | Tiles, UI, SFX                                                              | CC0                  |
| [itch.io/game-assets](https://itch.io/game-assets/free/tag-pixel-art) | Packs de pixel art; busca "dark fantasy", "gothic", "lovecraft", "medieval" | Varía por pack      |
| [opengameart.org](https://opengameart.org)                            | Sprites, tiles, música                                                     | Varía (filtrar CC0) |
| [craftpix.net](https://craftpix.net)                                  | Packs de plataformas, enemigos y fondos (free + premium)                    | Revisar licencia     |
| [lospec.com](https://lospec.com/palette-list)                         | Paletas y tutoriales                                                        | —                   |
| [freesound.org](https://freesound.org)                                | Efectos de sonido                                                           | CC0 / CC-BY          |
| [incompetech.com](https://incompetech.com)                            | Música (Kevin MacLeod)                                                     | CC-BY                |
| [sonniss.com/gameaudiogdc](https://sonniss.com/gameaudiogdc)          | Bundles gratis de SFX                                                       | Royalty-free         |

## 11. Arquitectura técnica

```
src/
  main.ts                # config de Phaser (pixelArt: true, roundPixels: true)
  scenes/                # Boot, Preload, Menu, CharacterSelect, Game, BossChase, UI (HUD), GameOver
  entities/
    player/              # Player (base), Knight, Mage
    enemies/             # Enemy (base), behaviors/ (Patrol, Flyer, Shooter)
    bosses/              # Boss (base + state machine), KeyBoss, GateBoss, GuardianBoss
  systems/
    ChunkGenerator.ts    # secuencia de chunks + contenido on-the-fly (sin Phaser, testeable)
    ChunkStreamer.ts     # carga/descarga chunks alrededor del jugador (niveles y persecución)
    LevelValidator.ts    # BFS de alcanzabilidad
    RNG.ts               # seeded
    Upgrades.ts
    SaveData.ts
  data/
    chunks/<bioma>/*.json  # Tiled (chunks de nivel)
    chase/*.json         # Tiled (chunks de persecución)
    enemies.json, upgrades.json, bosses.json
  utils/
```

- Física: **Arcade Physics**
- Datos en JSON (enemigos, mejoras, patrones de jefe), no hardcodeados
- RNG con seed (`seedrandom`)
- Object pooling para proyectiles, partículas y enemigos invocados
- Game feel: hitstop, screen shake (`camera.shake`), flash al recibir daño
- Guardado: `localStorage` (récord, opciones de audio)
- Deploy: build de Vite → zip → itch.io (luego Cloudflare Pages / CrazyGames)

## 12. Milestones

| Semana | Entregable                                                      | Criterio de "hecho"                                           |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------- |
| 1–2   | **Movimiento (Caballero)**                                | Saltar se siente bien en una sala de prueba                   |
| 3–4   | **Generador**                                             | Chunks laterales on-the-fly, seed, siempre completable, 10 chunks del bioma 1 |
| 5      | **Combate + Cultista + Rata**                             | Se puede morir y matar; hitstop y shake                       |
| 6–7   | **Persecución (ChunkStreamer + auto-scroll) + La Llave**  | Persecución modo A con 2 fases y ejecución                  |
| 8      | **Loop completo bioma 1**                                 | Menú → nivel → mejora → nivel → jefe → victoria/derrota |
| —     | **🚦 Checkpoint: demo en itch.io**                        | Pedir feedback antes de seguir                                |
| 9      | **Mago**                                                  | Aim con mouse, proyectiles con pooling                        |
| 10–11 | Biomas 2 y 3 (chunks de nivel y de persecución, enemigos)       | Solo contenido, reutilizando sistemas                         |
| 12–13 | La Puerta (modo B) + El Guardián (fusión) + mejoras restantes |                                                               |
| 14     | Pulido, audio, arte final, release                              | Sin crashes, 60 FPS en laptop media                           |

> Si un milestone se atrasa más de 1 semana: **cortar alcance, no extender plazo.**

## 13. Lista de corte (lo primero que se va si hay atraso)

1. **Mago** → solo Caballero en v1 (el Mago llega en v1.1)
2. Bioma 3 → La Puerta es el jefe final
3. Animaciones de ejecución → reemplazar por explosión + flash
4. Controles táctiles / móvil (con aim de mouse ya era difícil)
5. Salas opcionales (cofres/desafíos)
6. 3.ª fase de El Guardián

## 14. Definición de "terminado" (v1)

- [ ] Una run completa jugable de principio a fin
- [ ] 3 jefes de persecución (o 2 si se aplicó la lista de corte)
- [ ] Menú, selección de personaje, pausa, game over y créditos
- [ ] Sin assets de terceros con copyright; `CREDITS.md` completo
- [ ] Publicado en itch.io con página, capturas y GIF

## 15. Backlog v1.1+ (las ideas van aquí, no al código)

- Meta-progresión (desbloqueos permanentes)
- Intercambio de personaje a mitad de run
- Personajes extra
- Gamepad
- Ranking online (Firebase)
- PWA / service worker
- Publicación en CrazyGames / Poki

## 16. Riesgos

| Riesgo                                                | Mitigación                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| El generador produce niveles imposibles               | Camino garantizado + test automático con 1000 seeds               |
| Persecuciones injustas (huecos imposibles con scroll) | Reglas de chunks + test de bot que solo salta                      |
| El control no se siente bien                          | Semanas 1–2 dedicadas solo a eso                                  |
| Feature creep (2 personajes, 3 jefes complejos)       | Sección 4 + lista de corte + checkpoint en la semana 8            |
| El arte consume demasiado tiempo                      | Placeholders hasta la semana 8; jefes por partes, no frame a frame |
