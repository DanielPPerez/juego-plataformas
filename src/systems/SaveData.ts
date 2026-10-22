// Récord en localStorage (puede no estar disponible: modo privado, iframe sin permisos…)
export interface Record {
  bestLevel: number;
  bestCoins: number;
}

const KEY = 'record';

export function loadRecord(): Record {
  try {
    return { bestLevel: 0, bestCoins: 0, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { bestLevel: 0, bestCoins: 0 };
  }
}

// Guarda si mejora el récord; devuelve true si es un récord nuevo
export function saveRecord(level: number, coins: number): boolean {
  const record = loadRecord();
  const isNew = level > record.bestLevel || (level === record.bestLevel && coins > record.bestCoins);
  if (!isNew) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ bestLevel: level, bestCoins: coins }));
  } catch {
    // sin localStorage: el récord no se guarda
  }
  return true;
}
