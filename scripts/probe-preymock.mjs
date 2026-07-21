import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 380 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  // clique via JS: o chrome do jogo às vezes tem overlay por cima e o
  // click "de verdade" do Playwright fica em retry até estourar
  await page.evaluate(() => document.querySelector('.tab[data-tab="bestiary"]').click()); await page.waitForTimeout(900);
  // injeta 3 cards ativos de exemplo (só visual, não toca no save)
  await page.evaluate(() => {
    const S = 'assets/sprites/monsters/';
    const cards = [
      { n:1, mon:'Rat.webp', name:'Rat', bt:'prey_damage', label:'DAMAGE', val:30, stars:3, t:'1h 47min', tp:89 },
      { n:2, mon:'Wolf.webp', name:'Wolf', bt:'prey_xp', label:'XP', val:40, stars:5, t:'54min', tp:45 },
      { n:3, mon:'Cave_Rat.webp', name:'Cave Rat', bt:'prey_loot', label:'LOOT', val:20, stars:2, t:'22min', tp:18 },
    ];
    const star = (on)=>`<span class="prey-star ${on?'on':''}">★</span>`;
    document.getElementById('prey-slots').innerHTML = cards.map(c=>`
      <div class="prey-card active">
        <div class="prey-card-top"><span class="prey-slot-no">${c.n}</span>
          <div class="prey-portrait"><img class="prey-portrait-img" src="${S}${c.mon}"></div></div>
        <div class="prey-creature-name">${c.name}</div>
        <div class="prey-bonus-box"><img class="prey-bonus-icon" src="assets/sprites/${c.bt==='prey_xp'?'vitals/Experience_Icon.webp':c.bt==='prey_loot'?'items/Backpack.webp':'items/Sword.webp'}">
          <span class="prey-bonus-val">+${c.val}%</span><span class="prey-bonus-label">${c.label}</span></div>
        <div class="prey-stars">${[0,1,2,3,4].map(i=>star(i<c.stars)).join('')}</div>
        <div class="prey-timer-track"><div class="prey-timer-fill" style="width:${c.tp}%"></div><span class="prey-timer-label">${c.t}</span></div>
        <div class="prey-card-actions"><button class="prey-btn reroll">🎲 Reroll</button><button class="prey-btn cancel">✕</button></div>
      </div>`).join('');
  });
  await page.waitForTimeout(700);
  const prey = await page.$('#prey-slots');
  if (prey) await prey.screenshot({ path: join(ROOT, 'scripts', 'panel-prey-active.png') });
  console.log('ok');
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
