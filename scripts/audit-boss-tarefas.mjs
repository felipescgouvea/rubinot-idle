// AUDITORIA do BOSS RUSH (com tiers) e das TAREFAS — as duas últimas áreas
// do jogo sem nenhuma cobertura de teste.
//
// Boss Rush: o que importa não é "o botão respondeu", é (a) o tier realmente
// deixa o boss mais forte, (b) entrar no modo boss faz spawnar o BOSS e não um
// bicho comum da zona, e (c) sair devolve o jogador pra zona onde ele estava —
// senão o modo vira uma armadilha que rouba a caçada em andamento.
//
// Tarefas: matar a criatura da tarefa tem que MEXER no contador. Uma tarefa
// que não conta é a mesma classe de bug do prey — bonita na tela, morta por
// dentro.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const erros = new Set();
page.on('pageerror', e => erros.add('PAGEERR ' + e.message.slice(0, 150)));
const falhas = [];
const ok = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ---------- BOSS RUSH: escala de tier (regra pura) ----------
  const tiers = await page.evaluate(async () => {
    const be = await window.__liveImport('bestiary.js');
    const vals = [1, 2, 3, 5, 8].map(t => ({ t, m: be.bossTierMultiplier(t) }));
    const auras = [1, 2, 3, 5, 9].map(t => be.bossAuraClass(t));
    return { vals, auras, sobeSempre: vals.every((v, i) => i === 0 || v.m > vals[i - 1].m) };
  });
  console.log('tier -> multiplicador: ' + tiers.vals.map(v => `T${v.t}=${v.m.toFixed(2)}x`).join('  '));
  if (!tiers.sobeSempre) falhas.push('o multiplicador de tier NÃO cresce sempre — tier maior tem que ser mais difícil');
  else if (tiers.vals[0].m <= 1) falhas.push(`tier 1 vale ${tiers.vals[0].m}x — boss desafiado deveria ser mais forte que o da zona`);
  else ok.push('escala de dificuldade por tier');
  if (new Set(tiers.auras).size < 4) falhas.push(`aura de tier quase não muda: ${tiers.auras.join(', ')}`);
  else ok.push('aura por tier');

  // ---------- BOSS RUSH: lista e entrada/saída ----------
  const boss = await page.evaluate(async () => {
    const bu = await window.__liveImport('bossRushUseCases.js');
    const lista = bu.unlockedBossZones();
    if (!lista.length) return { pulado: 'nenhuma zona com boss desbloqueada neste nível' };
    // a lista tem que vir do mais fraco pro mais forte (é a progressão)
    const be = await window.__liveImport('bestiary.js');
    const hps = lista.map(z => be.MONSTERS[z.zone.boss] ? be.MONSTERS[z.zone.boss].hp : 0);
    const ordenada = hps.every((h, i) => i === 0 || h >= hps[i - 1]);

    const zonaAntes = window.__G.activeZone;
    bu.startBossRush(lista[0].zoneId);
    await new Promise(r => setTimeout(r, 6000));
    const hu = await window.__liveImport('huntUseCases.js');
    const pack = (hu.getCurrentPack() || []).map(m => m.defKey);
    const ativo = bu.isBossRushActive();
    bu.stopBossRush();
    await new Promise(r => setTimeout(r, 2500));
    if (window.__G.hunting) window.toggleHunt();
    await new Promise(r => setTimeout(r, 1200));
    return { n: lista.length, ordenada, zonaAntes, zonaDepois: window.__G.activeZone,
             bossEsperado: lista[0].zone.boss, zonaBoss: lista[0].zoneId, pack, ativo };
  });
  if (boss.pulado) console.log('boss rush: pulado —', boss.pulado);
  else {
    console.log(`boss rush: ${boss.n} zona(s) · entrou em ${boss.zonaBoss} (boss ${boss.bossEsperado})`
      + ` · modo ativo=${boss.ativo} · sala: [${boss.pack.join(', ') || 'vazia'}]`);
    console.log(`   zona antes ${boss.zonaAntes} -> depois de sair ${boss.zonaDepois}`);
    if (!boss.ordenada) falhas.push('a lista de bosses não vem ordenada por força — a progressão fica ilegível');
    else ok.push('lista de bosses ordenada por força');
    if (!boss.ativo) falhas.push('startBossRush não deixou o modo boss ativo');
    else ok.push('entrar no Boss Rush');
    if (!boss.pack.length) console.log('   spawn: INCONCLUSIVO — a sala ainda estava vazia na leitura');
    else if (!boss.pack.includes(boss.bossEsperado)) {
      falhas.push(`no modo boss a sala trouxe [${boss.pack.join(', ')}] em vez do boss ${boss.bossEsperado}`);
    } else ok.push('modo boss spawna o boss');
    if (boss.zonaDepois !== boss.zonaAntes) {
      falhas.push(`sair do Boss Rush NÃO devolveu a zona: era ${boss.zonaAntes}, virou ${boss.zonaDepois}`);
    } else ok.push('sair do Boss Rush devolve a zona');
  }

  // ---------- TAREFAS: começar e progredir ----------
  const tarefa = await page.evaluate(async () => {
    const tu = await window.__liveImport('taskUseCases.js');
    // As tarefas moram em domain/progression.js (TASK_ROOMS), não num módulo
    // próprio: cada sala tem `tasks`, e cada tarefa lista as criaturas em `m`
    // e a quantidade em `n`.
    const pr = await window.__liveImport('progression.js');
    const salas = pr.TASK_ROOMS;
    if (!Array.isArray(salas)) return { erro: 'TASK_ROOMS não encontrado em progression.js' };
    // isRoomUnlocked recebe o ÍNDICE da sala e o mapa de conclusões, não a
    // sala em si — a sala 0 é sempre livre e as seguintes só abrem depois de
    // fechar a anterior inteira.
    const conclusao = window.__G.taskCompletion || {};
    let escolhida = null;
    for (let i = 0; i < salas.length; i++) {
      if (!pr.isRoomUnlocked(i, conclusao)) continue;
      const sala = salas[i];
      const idx = (sala.tasks || []).findIndex((t, j) => pr.isTaskUnlocked(sala, j, conclusao));
      if (idx >= 0) { escolhida = { roomId: sala.id, idx, tarefa: sala.tasks[idx] }; break; }
    }
    if (!escolhida) return { pulado: `nenhuma tarefa acessível no nível ${window.__G.level}` };
    tu.startTask(escolhida.roomId, escolhida.idx);
    await new Promise(r => setTimeout(r, 1200));
    return { roomId: escolhida.roomId, idx: escolhida.idx,
             alvo: (escolhida.tarefa.m || [])[0] || null,
             precisa: escolhida.tarefa.n || null,
             ativa: JSON.parse(JSON.stringify(window.__G.activeTask || null)) };
  });

  if (tarefa.erro) falhas.push('tarefas: ' + tarefa.erro);
  else if (tarefa.pulado) console.log('tarefas: pulado —', tarefa.pulado);
  else {
    console.log(`tarefa: ${tarefa.roomId}#${tarefa.idx} · alvo ${tarefa.alvo} x${tarefa.precisa} · registrada=${!!tarefa.ativa}`);
    if (!tarefa.ativa) falhas.push('startTask não registrou a tarefa em G.activeTask');
    else {
      ok.push('começar tarefa');
      // Caça a criatura da tarefa e vê se o contador anda.
      const progresso = await page.evaluate(async alvo => {
        const be = await window.__liveImport('bestiary.js');
        const hu = await window.__liveImport('huntUseCases.js');
        // zona onde a criatura da tarefa realmente aparece
        const zona = Object.keys(be.ZONE_SPAWN).find(z => (be.ZONE_SPAWN[z] || {})[alvo]);
        if (!zona) return { semZona: true };
        // ARMADILHA: o progresso NÃO fica em activeTask.progress — mora em
        // G.taskKills[chave da tarefa] (ver application/taskUseCases.js). Ler o
        // campo errado me fez acusar "tarefa morta por dentro" numa tarefa que
        // contava certo.
        const chave = window.__G.activeTask.key;
        const antes = (window.__G.taskKills || {})[chave] || 0;
        hu.selectZone(zona);
        await new Promise(r => setTimeout(r, 800));
        await hu.startHunt();
        await new Promise(r => setTimeout(r, 75000));
        const depois = (window.__G.taskKills || {})[chave] || 0;
        if (window.__G.hunting) window.toggleHunt();
        return { zona, antes, depois, chave, kills: window.__G.totalKills };
      }, tarefa.alvo);
      if (progresso.semZona) console.log(`progresso: INCONCLUSIVO — nenhuma zona spawna ${tarefa.alvo}`);
      else {
        console.log(`progresso em ${progresso.zona} (${progresso.chave}): ${progresso.antes} -> ${progresso.depois} · ${progresso.kills} mortes no total`);
        if (progresso.depois <= progresso.antes) {
          falhas.push(`matar ${tarefa.alvo} NÃO avançou a tarefa (${progresso.antes} -> ${progresso.depois}) — tarefa morta por dentro`);
        } else ok.push('tarefa progride ao matar a criatura');
      }
    }
    await page.evaluate(async () => {
      const tu = await window.__liveImport('taskUseCases.js');
      tu.cancelTask();
    }).catch(() => {});
  }
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 250));
} finally {
  await page.evaluate(() => { if (window.__G && window.__G.hunting) window.toggleHunt(); }).catch(() => {});
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
