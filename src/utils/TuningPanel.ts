import type { PlayerConfig } from '../systems/PlayerConfig';
import { resetPlayerConfig, savePlayerConfig } from '../systems/PlayerConfig';

type Range = [min: number, max: number, step: number];

const RANGES: Record<keyof PlayerConfig, Range> = {
  maxRunSpeed: [50, 300, 5],
  groundAccel: [200, 4000, 50],
  groundDecel: [200, 4000, 50],
  airAccel: [100, 4000, 50],
  airDecel: [0, 4000, 50],
  gravity: [300, 2500, 25],
  maxFallSpeed: [150, 900, 10],
  jumpVelocity: [150, 600, 5],
  jumpCutMultiplier: [0, 1, 0.05],
  apexThreshold: [0, 150, 5],
  apexGravityMultiplier: [0.1, 1, 0.05],
  coyoteTimeMs: [0, 250, 10],
  jumpBufferMs: [0, 250, 10],
  dashSpeed: [150, 800, 10],
  dashDurationMs: [50, 400, 10],
  dashCooldownMs: [0, 1500, 50],
};

// Panel HTML de ajuste en vivo (F1). Herramienta de desarrollo, no forma parte del juego.
export class TuningPanel {
  private root: HTMLDivElement;
  private inputs = new Map<keyof PlayerConfig, { slider: HTMLInputElement; label: HTMLSpanElement }>();

  constructor(private cfg: PlayerConfig) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed', top: '8px', left: '8px', zIndex: '10',
      background: 'rgba(10,8,16,0.92)', color: '#ddd', font: '12px monospace',
      padding: '10px', borderRadius: '6px', maxHeight: '95vh', overflowY: 'auto', display: 'none',
    });

    const title = document.createElement('div');
    title.textContent = 'Ajuste del jugador (F1)';
    title.style.marginBottom = '8px';
    this.root.appendChild(title);

    for (const key of Object.keys(RANGES) as (keyof PlayerConfig)[]) {
      const [min, max, step] = RANGES[key];
      const row = document.createElement('label');
      row.style.display = 'block';
      row.style.marginBottom = '4px';

      const label = document.createElement('span');
      label.style.display = 'inline-block';
      label.style.width = '230px';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String(step);
      slider.style.width = '140px';
      slider.addEventListener('input', () => {
        this.cfg[key] = Number(slider.value);
        this.refresh();
        savePlayerConfig(this.cfg);
      });
      // Soltar el foco para que las flechas vuelvan a mover al jugador
      slider.addEventListener('change', () => slider.blur());

      row.append(label, slider);
      this.root.appendChild(row);
      this.inputs.set(key, { slider, label });
    }

    const copy = this.button('Copiar JSON', () => {
      navigator.clipboard?.writeText(JSON.stringify(this.cfg, null, 2));
      copy.textContent = 'Copiado';
      setTimeout(() => (copy.textContent = 'Copiar JSON'), 1000);
    });
    const reset = this.button('Restaurar', () => {
      resetPlayerConfig(this.cfg);
      this.refresh();
    });
    this.root.append(copy, reset);

    document.body.appendChild(this.root);
    this.refresh();
  }

  toggle() {
    this.root.style.display = this.root.style.display === 'none' ? 'block' : 'none';
  }

  destroy() {
    this.root.remove();
  }

  private refresh() {
    for (const [key, { slider, label }] of this.inputs) {
      slider.value = String(this.cfg[key]);
      label.textContent = `${key}: ${this.cfg[key]}`;
    }
  }

  private button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.marginRight = '6px';
    b.addEventListener('click', () => {
      onClick();
      b.blur();
    });
    return b;
  }
}
