// Caça-bugs de runtime: percorre TODA aba/ação e captura pageerror + console.error.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport:{width:1366,height:900} });
const erros = [];
let contexto = 'boot';
p.on('pageerror', e => erros.push({ ctx: contexto, tipo: 'pageerror', msg: String(e).slice(0,200) }));
p.on('console', m => { if (m.type()==='error') { const t=m.text(); if(!/Failed to load resource|net::ERR|favicon|404/.test(t)) erros.push({ ctx: contexto, tipo: 'console', msg: t.slice(0,200) }); } });
p.on('dialog', d=>d.accept());
try {
  await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil:'domcontentloaded', timeout:60000 });
  await login(p, acct);
  await instalarLiveImport(p);
  await p.waitForTimeout(2000);
  // dispensa modal de graduação se aparecer
  const conf = await p.$('text=Confirm and travel to the mainland'); if (conf) { await conf.click().catch(()=>{}); await p.waitForTimeout(2500); }
  // percorre TODAS as abas
  const tabs = ['hunt','rtc','spells','tasks','skills','training','bestiary','arena','bossrush','worlds','battlepass','shop','market','highscores'];
  for (const tab of tabs) {
    contexto = 'tab:'+tab;
    const btn = await p.$(`.tab[data-tab="${tab}"]`);
    if (btn) { await btn.click().catch(()=>{}); await p.waitForTimeout(900); }
  }
  // ações: abrir batalha, iniciar/parar hunt
  contexto='hunt-tab'; await p.$('.tab[data-tab="hunt"]').then(x=>x&&x.click()); await p.waitForTimeout(600);
  contexto='open-battle'; const vb=await p.$('text=View Battle')||await p.$('text=Ver Batalha'); if(vb){await vb.click().catch(()=>{});await p.waitForTimeout(1500);}
  contexto='start-hunt'; await p.evaluate(async()=>{try{window.__H.selectZone('rat_cave');await new Promise(r=>setTimeout(r,500));await window.__H.startHunt();}catch(e){}}); await p.waitForTimeout(8000);
  contexto='stop-hunt'; await p.evaluate(()=>{try{if(window.__G.hunting)window.toggleHunt();}catch(e){}}); await p.waitForTimeout(1500);
  // abre modais diversos via funções globais
  for (const [nome, fn] of [['prey','openPreySelect'],['outfit','openOutfitPicker'],['daily','openDailyReward'],['achievements','openAchievements']]) {
    contexto='modal:'+nome;
    await p.evaluate((f)=>{ try { if(typeof window[f]==='function') window[f](0); } catch(e){} }, fn);
    await p.waitForTimeout(700);
    await p.keyboard.press('Escape').catch(()=>{});
  }
} catch (e) { erros.push({ ctx: contexto, tipo:'exceção', msg: String(e).slice(0,200) }); }
await b.close();
console.log(`erros capturados: ${erros.length}`);
const vistos = new Set();
for (const e of erros) { const k=e.ctx+'|'+e.msg; if(vistos.has(k))continue; vistos.add(k); console.log(`  [${e.tipo}] (${e.ctx}) ${e.msg}`); }
console.log(erros.length ? '\nRESULTADO: BUGS ENCONTRADOS' : '\nRESULTADO: LIMPO — nenhum erro de runtime');
