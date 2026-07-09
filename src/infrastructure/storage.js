// Persistência local (localStorage). Única parte do código que sabe que o
// save existe como JSON numa chave de localStorage — se um dia isso virar
// IndexedDB ou outra coisa, só este arquivo muda.

const STORAGE_KEY = 'rubinot_idle_v1';

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadRawState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
