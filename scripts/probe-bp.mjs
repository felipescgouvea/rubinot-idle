// E2e do Battle Pass server-side: chama os endpoints /bp/buy-premium e /bp/claim
// direto (contexto autenticado), testando o grant server-side + anti double-claim.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  const out = await page.evaluate(async () => {
    const m = await import(new URL('src/infrastructure/authClient.js?v=136', location.href).href);
    const buy = await m.bpBuyPremiumOnServer(0);
    const claim1 = await m.bpClaimOnServer(0, 1, 'premium', 999999); // tier1 premium = 100 rubini
    const claim2 = await m.bpClaimOnServer(0, 1, 'premium', 999999); // repetido -> deve falhar
    const claimLowXp = await m.bpClaimOnServer(0, 20, 'premium', 0); // tier alto, xp 0 -> deve falhar
    return { buy, claim1, claim2, claimLowXp };
  });
  console.log('[probe] buy-premium:', JSON.stringify(out.buy));
  console.log('[probe] claim tier1 premium:', JSON.stringify(out.claim1));
  console.log('[probe] claim repetido:', JSON.stringify(out.claim2));
  console.log('[probe] claim xp insuficiente:', JSON.stringify(out.claimLowXp));
  if (!out.buy.ok || out.buy.rubini !== 250) problems.push(`buy-premium falhou (esperava rubini 250, veio ${out.buy && out.buy.rubini})`);
  if (!out.claim1.ok || out.claim1.rubini !== 350) problems.push(`claim tier1 premium falhou (esperava rubini 350 = 250+100, veio ${out.claim1 && out.claim1.rubini})`);
  if (out.claim2.ok) problems.push('claim repetido NÃO foi bloqueado (double-claim!)');
  if (out.claimLowXp.ok) problems.push('claim com xp insuficiente NÃO foi bloqueado');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ BP server-side OK (compra premium, grant real, anti double-claim, valida tier)');
process.exitCode = problems.length ? 1 : 0;
