// Utilitários compartilhados pelos probes.
//
// ARMADILHA IMPORTANTE: o jogo versiona todo import (`?v=N`). Um
// `import('./src/application/gameStore.js?v=172')` dentro de page.evaluate com
// um N DIFERENTE do que a página carregou cria uma SEGUNDA INSTÂNCIA do módulo
// — estado próprio, zerado. Foi isso que fez os probes lerem `vocation: null`
// num personagem existente e abrirem uma segunda sessão de caçada.
// Por isso: descobrir a URL exata que a página já carregou e importar ELA.

export const LIVE_IMPORT = `
window.__liveImport = async (arquivo) => {
  const url = performance.getEntriesByType('resource')
    .map(r => r.name)
    .find(n => n.includes('/' + arquivo + '?v='));
  if (!url) throw new Error('modulo nao carregado na pagina: ' + arquivo);
  return import(url);
};
`;

// Instala o helper e expõe os módulos mais usados como window.__G / __H / __A.
export async function instalarLiveImport(page) {
  await page.evaluate(LIVE_IMPORT);
  return page.evaluate(async () => {
    const gs = await window.__liveImport('gameStore.js');
    window.__G = gs.G;
    window.__ACC = gs.ACCOUNT;
    try { window.__H = await window.__liveImport('huntUseCases.js'); } catch {}
    return { slot: gs.ACCOUNT.activeSlot, voc: gs.G.vocation };
  });
}

export async function login(page, acct) {
  await page.waitForSelector('#auth-email', { timeout: 25000 }).catch(() => null);
  if (await page.$('#auth-email')) {
    await page.fill('#auth-email', acct.email);
    await page.fill('#auth-password', acct.password);
    await page.click('#auth-submit');
    await page.waitForTimeout(8000);
  }
}
