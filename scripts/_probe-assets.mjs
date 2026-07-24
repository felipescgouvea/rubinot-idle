import { chromium } from 'playwright';
import fs from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(fs.readFileSync(new URL('../.test-account.json', import.meta.url)));
const D = 'C:/Users/Felipe/AppData/Local/Temp/claude/c--workspace-rubinot-idle/5dce9f64-a06d-45cd-b2f2-5d50816d9f0f/scratchpad/';
const browser = await chromium.launch({ headless: false });
const page = await browser.newContext({ viewport: { width: 1280, height: 900 } }).then(c => c.newPage());
const missing = [];
page.on('response', r => { const u = r.url(); if ((u.includes('/monsters/') || u.includes('/items/')) && r.status() >= 400) missing.push(r.status()+' '+u.split('/').pop()); });
try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  // hunt numa zona de monstros mapeados (trolls = layers=1)
  const hunting = await page.evaluate(async () => {
    window.__G.density = 'pack'; window.__H.selectZone('troll_cave');
    await new Promise(r => setTimeout(r, 700)); await window.__H.startHunt();
    await new Promise(r => setTimeout(r, 2500)); return !!window.__G.hunting;
  });
  console.log('hunting:', hunting);
  await page.waitForTimeout(1500);
  const stage = await page.$('#dungeon-stage');
  if (stage) await stage.screenshot({ path: D + 'verify_hunt.png' });
  console.log('sprites de monstro/item com erro HTTP:', missing.length, missing.slice(0,8));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
