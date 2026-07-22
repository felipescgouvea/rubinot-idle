// Garante que a conta de teste tenha personagem (o reset zerou tudo).
// Usado antes dos probes que precisam de combate.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const SET = process.argv[2] || 'sorcerer';   // set com magia de área cedo
const NOME = process.argv[3] || 'ClaudeAudit';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
p.on('dialog', d => d.accept());
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await login(p, acct);
await instalarLiveImport(p);
const antes = await p.evaluate(() => window.__G.vocation);
if (antes) { console.log('já tem personagem:', antes); await b.close(); process.exit(0); }
await p.waitForSelector('#char-name-input', { timeout: 20000 });
await p.fill('#char-name-input', NOME);
await p.evaluate(v => window.createCharacter(v), SET);
await p.waitForFunction(() => !!window.__G.vocation, null, { timeout: 30000 });
await p.waitForTimeout(6000);
console.log('criado:', await p.evaluate(() => ({ voc: window.__G.vocation, lvl: window.__G.level, itens: Object.keys(window.__G.inventory).length })));
await b.close();
