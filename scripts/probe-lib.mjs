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
  // O #auth-gate fica por cima da página inteira e continua interceptando
  // clique por um instante depois do login — sem esperar ele sumir, qualquer
  // page.click() seguinte entra num loop de retry até estourar o timeout.
  await page.waitForFunction(() => {
    const g = document.getElementById('auth-gate');
    return !g || g.offsetParent === null || getComputedStyle(g).display === 'none';
  }, null, { timeout: 25000 }).catch(() => {});

  // FALHA RUIDOSA se a sessão não ficou de pé. Sem isto o probe segue
  // deslogado, TODA chamada ao servidor volta "não logado" e o resultado parece
  // bug do jogo — foi exatamente o que aconteceu (o Supabase limita tentativas
  // seguidas de login, e vários probes em sequência esbarram nisso).
  // A sessão fica em 'rubinot_session' (chave própria do jogo), NÃO no formato
  // 'sb-<projeto>-auth-token' do SDK do Supabase — checar a chave errada me fez
  // acusar "login não persistiu" num login que tinha dado 200.
  const logado = await page.evaluate(() => (localStorage.getItem('rubinot_session') || '').length > 20);
  if (!logado) {
    throw new Error('LOGIN NÃO PERSISTIU (sessão ausente no localStorage) — provável limite de tentativas do Supabase. '
      + 'O resultado deste probe NÃO vale como veredito sobre o jogo; espere alguns minutos e rode de novo.');
  }
}

// A troca de personagem chama location.reload(). Dormir por tempo fixo corre
// com o reload: as leituras seguintes podem cair na página VELHA (que some logo
// depois) e devolver o estado errado. Aqui esperamos o reload de fato acontecer
// — o helper __liveImport some quando a página é recriada.
export async function esperarReload(page) {
  await page.waitForFunction(() => typeof window.__liveImport === 'undefined', null, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);
}
