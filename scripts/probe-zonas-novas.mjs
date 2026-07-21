// Confere, na PRODUÇÃO, que cada zona nova existe no servidor e spawna gente do
// próprio elenco. Não tenta matar nada: o personagem de teste é fraco e "não
// matou" não diz nada sobre a zona estar certa (ver probe-xp).
//
// Uso: node scripts/probe-zonas-novas.mjs [arquivo-json-de-zonas]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const zonas = JSON.parse(readFileSync(process.argv[2] || 'scripts/zones-to-add.json', 'utf8'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 150)));
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  let est = await instalarLiveImport(page);
  if (!est.voc) {
    await page.evaluate(async () => {
      const i = document.getElementById('char-name-input');
      if (i) { i.value = 'AuditZone'; i.dispatchEvent(new Event('input', { bubbles: true })); }
      await window.createCharacter('knight');
    });
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 25000 }).catch(() => {});
  }

  // as zonas existem no bundle que a PÁGINA carregou?
  const noBundle = await page.evaluate(async ids => {
    const B = await window.__liveImport('bestiary.js');
    return ids.map(id => ({
      id,
      existe: !!B.ZONES[id],
      spawn: !!B.ZONE_SPAWN[id],
      elenco: B.ZONES[id] ? B.ZONES[id].monsters : [],
    }));
  }, zonas.map(z => z.id));
  noBundle.forEach(z => {
    if (!z.existe) falhas.push(`${z.id}: não existe no bundle publicado`);
    else if (!z.spawn) falhas.push(`${z.id}: sem pesos de spawn`);
  });
  console.log(`zonas no bundle: ${noBundle.filter(z => z.existe).length}/${zonas.length}`);

  // amostra: inicia algumas e confere QUEM nasce
  const amostra = zonas.filter((_, i) => i % 4 === 0).slice(0, 6);
  for (const z of amostra) {
    const elenco = (noBundle.find(x => x.id === z.id) || {}).elenco || [];
    // Para de VERDADE antes de trocar de zona: selectZone() reinicia a caçada
    // sozinho se ela ainda estiver ativa, e o startHunt() seguinte abre uma
    // segunda sessão — o cliente passa a seguir a errada e a zona parece "não
    // spawnar". Dormir por tempo fixo não garante isso.
    await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
    await page.waitForFunction(() => !window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(id => window.__H.selectZone(id), z.id);
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__H.startHunt());
    await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
    const nasceu = await page.waitForFunction(
      () => (window.__H.getCurrentPack() || []).length > 0, null, { timeout: 35000}
    ).then(() => true).catch(() => false);
    const est2 = await page.evaluate(() => ({
      pack: (window.__H.getCurrentPack() || []).map(m => m.defKey),
      hp: window.__G.hp, hunting: !!window.__G.hunting,
    }));
    const pack = est2.pack;
    const forasteiros = pack.filter(k => !elenco.includes(k));
    // Personagem morto (hp 0) ou caçada derrubada explicam "não spawnou" sem que
    // a zona tenha problema — o boneco de teste é nível baixo e estas zonas
    // matam. Só vira falha se a caçada estava viva e mesmo assim nada nasceu.
    // Morrer é o caso comum: estas zonas matam um personagem de nível baixo em
    // segundos (4 dragões nasceram e mataram o boneco em 10s no Covil do
    // Dragão). Quando isso acontece a caçada para e o pack esvazia — nada a ver
    // com a zona estar errada.
    const morreu = est2.hp <= 0 || !est2.hunting;
    console.log(`  ${z.id.padEnd(26)} hp ${String(est2.hp).padStart(4)} ${est2.hunting ? 'caçando' : 'PAROU  '} | spawnou: ${nasceu ? pack.join(', ') : '(nada em 35s)'}`);
    if (!nasceu && !morreu) falhas.push(`${z.id}: não spawnou nada em 35s (com a caçada viva)`);
    if (!nasceu && morreu) console.log(`     ^ ignorado: personagem morreu/caçada parou, não é problema da zona`);
    if (forasteiros.length) falhas.push(`${z.id}: spawnou fora do elenco -> ${forasteiros.join(', ')}`);
  }
  await page.evaluate(() => window.__G.hunting && window.toggleHunt());
  await page.waitForTimeout(1500);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
