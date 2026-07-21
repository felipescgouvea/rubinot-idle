// Teste do cenário de batalha: mede o deslocamento (--scene-y) ao longo de uma
// caçada real e verifica as três regras que o Felipe pediu:
//   1. enquanto procura, a cena rola pra frente (offset cresce)
//   2. quando o monstro aparece, a cena PARA onde estava — sem saltar
//   3. a parada acontece num múltiplo de 32px (a passada fecha)
// Também confere que nenhuma animação CSS está mexendo no ::before do bioma
// (foi esse conflito que fez a cena tremer).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONE = process.argv[2] || 'troll_cave';
const SECS = +(process.argv[3] || 60);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.add('CONSOLE ' + m.text().slice(0, 180)); });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(8000);

  // cria personagem se a conta estiver zerada (createCharacter EXIGE um nome)
  const made = await page.evaluate(async () => {
    const btn = document.querySelector('.voc-btn[data-voc="knight"]');
    if (!btn || btn.offsetParent === null) return 'ja tinha personagem';
    const input = document.getElementById('char-name-input');
    if (input) { input.value = 'AuditBot'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    await window.createCharacter('knight');
    return 'criado';
  });
  console.log('personagem:', made);
  await page.waitForTimeout(6000);

  const started = await page.evaluate(async (z) => {
    const m = await import('./src/application/huntUseCases.js?v=229');
    m.selectZone(z);
    await new Promise(r => setTimeout(r, 900));
    if (m.startHunt) await m.startHunt(); else window.toggleHunt();
    return true;
  }, ZONE).catch(e => 'ERR ' + e.message);
  console.log('caçada iniciada:', started);
  await page.waitForTimeout(2500);

  // ---- amostragem: offset da cena + se há monstro na frente, a cada 250ms ----
  const samples = await page.evaluate(async (secs) => {
    const stage = document.getElementById('dungeon-stage');
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      const cs = getComputedStyle(stage, '::before');
      out.push({
        t: Math.round(performance.now() - t0),
        y: parseFloat(stage.style.getPropertyValue('--scene-y')) || 0,
        bgPos: cs.backgroundPosition,
        anim: cs.animationName,
        searching: stage.classList.contains('searching'),
        biome: stage.dataset.biome || '',
      });
      await new Promise(r => setTimeout(r, 250));
    }
    return out;
  }, SECS);

  await page.evaluate(() => window.toggleHunt && window.toggleHunt());
  await page.waitForTimeout(1200);

  // ---------------- análise ----------------
  const biome = samples[0]?.biome;
  const anims = [...new Set(samples.map(s => s.anim))];
  console.log(`\nbioma: "${biome}" | animações CSS no ::before: ${anims.join(', ')}`);

  let saltos = [], paradasForaDoPasso = [], regressoes = 0, avancou = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const d = b.y - a.y;
    if (d > 0) avancou++;
    // regressão = a cena voltou (o "salto" que o Felipe viu). Ignora a volta
    // natural do loop de 1024px.
    if (d < -1 && !(a.y > 900 && b.y < 200)) regressoes++;
    // parou de procurar entre estas duas amostras -> a parada tem que cair
    // num múltiplo de 32 (a passada fechou)
    if (a.searching && !b.searching) {
      const resto = ((b.y % 32) + 32) % 32;
      if (Math.min(resto, 32 - resto) > 1.5) paradasForaDoPasso.push({ t: b.t, y: +b.y.toFixed(1), resto: +resto.toFixed(1) });
      // e não pode ter saltado no momento da parada
      if (Math.abs(d) > 20) saltos.push({ t: b.t, de: +a.y.toFixed(1), para: +b.y.toFixed(1) });
    }
    // enquanto PARADO a cena não pode se mexer
    if (!a.searching && !b.searching && Math.abs(d) > 0.6) saltos.push({ t: b.t, de: +a.y.toFixed(1), para: +b.y.toFixed(1), motivo: 'mexeu parado' });
  }
  const transicoes = samples.filter((s, i) => i && samples[i - 1].searching !== s.searching).length;

  console.log(`amostras: ${samples.length} | avanços: ${avancou} | trocas procurando<->lutando: ${transicoes}`);
  console.log(`REGRESSÕES (cena saltou pra trás): ${regressoes}`);
  console.log(`SALTOS na parada / movimento parado: ${saltos.length}`, saltos.slice(0, 5));
  console.log(`PARADAS fora do múltiplo de 32px: ${paradasForaDoPasso.length}`, paradasForaDoPasso.slice(0, 5));

  const ok = regressoes === 0 && saltos.length === 0 && paradasForaDoPasso.length === 0
    && avancou > 5 && transicoes > 0 && anims.every(a => a === 'none');
  console.log(`\nRESULTADO: ${ok ? 'PASSOU' : 'FALHOU'}`);
} catch (e) {
  console.log('EX', e.message);
} finally {
  console.log('erros de página:', [...errs].join(' | ') || 'nenhum');
  await browser.close();
}
