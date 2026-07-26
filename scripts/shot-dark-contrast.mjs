import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.addInitScript(() => { try { localStorage.setItem('rubinot_theme', 'dark'); } catch {} });
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#app-aside', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // mede contraste (luminância relativa) de alguns textos "frios" vs seu fundo
  const probe = await page.evaluate(() => {
    function lum(c){ const m=c.match(/\d+/g).map(Number); const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;}; return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]); }
    function bgOf(el){ let e=el; while(e){ const b=getComputedStyle(e).backgroundColor; if(b && b!=='rgba(0, 0, 0, 0)' && b!=='transparent') return b; e=e.parentElement;} return 'rgb(20,20,25)'; }
    function ratio(el){ if(!el) return null; const fg=getComputedStyle(el).color; const bg=bgOf(el); const L1=lum(fg),L2=lum(bg); const hi=Math.max(L1,L2),lo=Math.min(L1,L2); return +( (hi+.05)/(lo+.05) ).toFixed(2); }
    const out={};
    out.vocName = ratio(document.querySelector('.char-vocation, .voc-name, #char-vocation, [class*="vocation"]'));
    out.muted = ratio(document.querySelector('.muted'));
    out.boostedLabel = ratio(document.querySelector('.boosted-label'));
    return out;
  });
  console.log('[contraste dark (ratio, alvo ≥4.5 texto / ≥3 grande)]', JSON.stringify(probe));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-dark-contrast.png') });
} finally { await browser.close(); }
console.log('ok');
