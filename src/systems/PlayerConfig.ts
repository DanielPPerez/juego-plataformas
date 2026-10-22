import defaults from '../data/player.json';

export type PlayerConfig = typeof defaults;

const STORAGE_KEY = 'player-tuning';

// Config viva: el panel F1 la modifica y el jugador la lee cada frame
export function loadPlayerConfig(): PlayerConfig {
  const cfg = { ...defaults };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) Object.assign(cfg, JSON.parse(saved));
  } catch {
    // sin localStorage: se usan los valores por defecto
  }
  return cfg;
}

export function savePlayerConfig(cfg: PlayerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignorar
  }
}

export function resetPlayerConfig(cfg: PlayerConfig) {
  Object.assign(cfg, defaults);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}
