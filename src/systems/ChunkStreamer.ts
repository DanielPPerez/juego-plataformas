import Phaser from 'phaser';
import { buildChunk, type ChunkInstance, type LevelPlan } from './ChunkGenerator';
import { CHUNK_H, CHUNK_PX, CHUNK_W, Tile } from './level';
import type { JumpAbility } from './LevelValidator';

// Índices de tile en la textura 'tiles'
const SOLID_INDEX = 0;
const PLATFORM_INDEX = 1;

type SpawnFn = (chunk: ChunkInstance, offsetX: number) => Phaser.GameObjects.GameObject[];

// Genera y destruye chunks alrededor del jugador: como máximo el anterior, el actual y el siguiente.
// No se puede volver más atrás del chunk anterior (el borde izquierdo del mundo avanza con el jugador).
export class ChunkStreamer {
  private loaded = new Map<number, { chunk: ChunkInstance; objects: Phaser.GameObjects.GameObject[] }>();
  private head = 0;

  constructor(
    private plan: LevelPlan,
    private ability: JumpAbility,
    private solidLayer: Phaser.Tilemaps.TilemapLayer,
    private platformLayer: Phaser.Tilemaps.TilemapLayer,
    private spawn: SpawnFn,
  ) {}

  get chunkCount(): number {
    return this.plan.chunks.length;
  }

  get leftBound(): number {
    return Math.max(0, this.head - 1) * CHUNK_PX;
  }

  get rightBound(): number {
    return Math.min(this.chunkCount, this.head + 2) * CHUNK_PX;
  }

  get loadedCount(): number {
    return this.loaded.size;
  }

  chunkAt(worldX: number): ChunkInstance | undefined {
    return this.loaded.get(Math.floor(worldX / CHUNK_PX))?.chunk;
  }

  // Devuelve true si cambió la ventana de chunks cargados
  update(playerX: number): boolean {
    const current = Phaser.Math.Clamp(Math.floor(playerX / CHUNK_PX), 0, this.chunkCount - 1);
    if (current < this.head && this.loaded.size > 0) return false;
    if (current === this.head && this.loaded.size > 0) return false;
    this.head = current;

    for (const index of [...this.loaded.keys()]) {
      if (index < this.head - 1) this.unload(index);
    }
    for (let i = this.head - 1; i <= this.head + 1; i++) {
      if (i >= 0 && i < this.chunkCount && !this.loaded.has(i)) this.load(i);
    }
    return true;
  }

  private load(index: number) {
    const chunk = buildChunk(this.plan, index, this.ability);
    const ox = index * CHUNK_W;
    for (let y = 0; y < CHUNK_H; y++) {
      for (let x = 0; x < CHUNK_W; x++) {
        const t = chunk.tiles[y * CHUNK_W + x];
        if (t === Tile.Solid) {
          this.solidLayer.putTileAt(SOLID_INDEX, ox + x, y, false).setCollision(true, true, true, true, false);
        } else if (t === Tile.Platform) {
          // Plataformas atravesables: solo colisionan por arriba
          this.platformLayer.putTileAt(PLATFORM_INDEX, ox + x, y, false).setCollision(false, false, true, false, false);
        }
      }
    }
    this.solidLayer.calculateFacesWithin(ox - 1, 0, CHUNK_W + 2, CHUNK_H);
    this.loaded.set(index, { chunk, objects: this.spawn(chunk, index * CHUNK_PX) });
  }

  private unload(index: number) {
    const entry = this.loaded.get(index)!;
    const ox = index * CHUNK_W;
    for (let y = 0; y < CHUNK_H; y++) {
      for (let x = 0; x < CHUNK_W; x++) {
        this.solidLayer.removeTileAt(ox + x, y, true, false);
        this.platformLayer.removeTileAt(ox + x, y, true, false);
      }
    }
    entry.objects.forEach((o) => o.destroy());
    this.loaded.delete(index);
  }
}
