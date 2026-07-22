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

// MARCO DE RESET (save epoch). O save do jogo vive em DOIS lugares:
// localStorage e Supabase. Apagar só o lado do servidor não reseta ninguém —
// o navegador restaura o personagem do save local no próximo F5 e ainda
// reescreve tudo na nuvem, desfazendo o reset um cliente por vez. Aconteceu:
// zerei o banco e o personagem voltou inteiro num F5.
//
// Aqui fica o último marco que ESTE navegador já aplicou. O servidor publica o
// marco atual em game_config; quando os dois diferem, o save local é apagado
// antes de qualquer leitura (ver main.js: startAuthedSession).
const EPOCH_KEY = 'rubinot_save_epoch';

export function loadSaveEpoch() {
  try { return localStorage.getItem(EPOCH_KEY); } catch { return null; }
}

export function saveSaveEpoch(epoch) {
  try { localStorage.setItem(EPOCH_KEY, String(epoch)); } catch { /* modo privado */ }
}
