// Smoke sem login: a página carrega os módulos sem pageerror?
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const erros = [];
p.on('pageerror', e => erros.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
const vivo = await p.evaluate(() => ({ temAuth: !!document.getElementById('auth-email'), temWindowFns: typeof window.createCharacter === 'function' }));
console.log('estado:', JSON.stringify(vivo));
const reais = erros.filter(e => !/favicon|40[34]|net::ERR/i.test(e));
console.log(reais.length ? 'ERROS:\n  ' + [...new Set(reais)].join('\n  ') : 'sem erros de módulo');
await b.close();
