// Garante um personagem de CADA vocação nos 4 slots da conta de teste.
//
// Existe pra destravar a regra do Felipe: auditoria de combate tem que rodar
// nas 4 vocações, não só na que estiver à mão. Cada vocação percorre um caminho
// diferente do combate — knight é corpo a corpo (nenhum projétil voa), paladin
// atira munição, sorcerer/druid conjuram — e auditar uma só cobre um quarto do
// que o jogador vê.
//
// Tudo numa ÚNICA sessão de navegador: cada troca de slot recarrega a página,
// mas a sessão fica no localStorage, então não há novo login. Reabrir o
// navegador por slot esbarraria no limite de tentativas de login do Supabase e
// o probe seguinte sairia deslogado — falha que já se disfarçou de bug do jogo.
//
// Uso: node scripts/criar-4-vocacoes.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';

const PLANO = [
  { slot: 0, voc: 'sorcerer', nome: 'ClaudeSorc' },
  { slot: 1, voc: 'knight',   nome: 'ClaudeKnight' },
  { slot: 2, voc: 'paladin',  nome: 'ClaudePala' },
  { slot: 3, voc: 'druid',    nome: 'ClaudeDruid' },
];

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.on('dialog', d => d.accept());
const feitos = [], falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);

  for (const p of PLANO) {
    await instalarLiveImport(page);
    const atual = await page.evaluate(async () => {
      const gs = await window.__liveImport('gameStore.js');
      return { ativo: gs.ACCOUNT.activeSlot, voc: gs.G.vocation, slots: gs.ACCOUNT.slots.map(s => (s && s.vocation) || null) };
    });

    if (atual.slots[p.slot]) { feitos.push(`slot ${p.slot}: já tinha ${atual.slots[p.slot]}`); continue; }

    if (atual.ativo !== p.slot) {
      await page.evaluate(async (slot) => {
        const a = await window.__liveImport('accountUseCases.js');
        a.confirmSwitchCharacterSlot(slot);
      }, p.slot);
      await esperarReload(page);
      await instalarLiveImport(page);
    }

    const chegou = await page.evaluate(async () => {
      const gs = await window.__liveImport('gameStore.js');
      return { ativo: gs.ACCOUNT.activeSlot, voc: gs.G.vocation };
    });
    if (chegou.ativo !== p.slot) { falhas.push(`não consegui ativar o slot ${p.slot} (ficou no ${chegou.ativo})`); continue; }
    if (chegou.voc) { feitos.push(`slot ${p.slot}: já tinha ${chegou.voc}`); continue; }

    await page.waitForSelector('#char-name-input', { timeout: 20000 });
    await page.fill('#char-name-input', p.nome);
    await page.evaluate(v => window.createCharacter(v), p.voc);
    await page.waitForFunction(() => !!window.__G?.vocation, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);

    // O envio pra nuvem é debounced; sair antes dele partir deixa o personagem
    // só no localStorage deste navegador, que morre junto com o probe.
    await page.evaluate(async () => {
      const sg = await window.__liveImport('saveGameUseCase.js');
      sg.saveGame();
      await sg.flushCloudSave();
    }).catch(() => {});
    await page.waitForTimeout(2000);

    const virou = await page.evaluate(() => window.__G?.vocation);
    if (virou === p.voc) feitos.push(`slot ${p.slot}: criado ${p.voc} (${p.nome})`);
    else falhas.push(`slot ${p.slot}: pedi ${p.voc}, ficou ${virou || '(nenhum)'}`);
  }

  await instalarLiveImport(page);
  const final = await page.evaluate(async () => {
    const gs = await window.__liveImport('gameStore.js');
    return gs.ACCOUNT.slots.map(s => (s && s.vocation) || null);
  });
  console.log('\nslots ao final:', JSON.stringify(final));
  const vazios = final.filter(v => !v).length;
  if (vazios) falhas.push(`${vazios} slot(s) continuam vazios`);
} catch (e) {
  falhas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(58));
feitos.forEach(f => console.log('  ✓ ' + f));
if (falhas.length) { console.log(`\nRESULTADO: FALHOU — ${falhas.length}`); falhas.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
else console.log('\nRESULTADO: PASSOU — as 4 vocações existem');
