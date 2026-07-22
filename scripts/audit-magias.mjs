// AUDITORIA DO LIVRO DE MAGIAS e da CONJURAÇÃO.
//
// Duas perguntas, nenhuma delas "a tela abriu?":
//   1. o livro lista as magias da vocação, e SÓ as dela?
//   2. conjurar realmente fabrica o item — cobrando mana, soul e o reagente?
//
// A conjuração é o caminho mais perigoso do jogo pra fraude: se o servidor
// não cobrasse, runa viraria item infinito. Por isso o teste mede as três
// cobranças, não só a chegada do item.
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

  // ---------- a aba existe e renderiza? ----------
  await page.click('.tab[data-tab="spells"]');
  await page.waitForTimeout(1200);
  const painel = await page.evaluate(() => {
    const box = document.getElementById('spells-book');
    return { existe: !!box, linhas: box ? box.querySelectorAll('.rtc-row').length : 0,
             secoes: box ? [...box.querySelectorAll('h5')].map(h => h.textContent.trim()) : [],
             texto: box ? box.textContent.slice(0, 80) : '' };
  });
  console.log(`aba Spells: ${painel.linhas} magias · seções: ${painel.secoes.join(' | ') || 'nenhuma'}`);
  if (!painel.existe) falhas.push('a aba Spells não tem o container #spells-book');
  else if (!painel.linhas) falhas.push(`a aba Spells abriu VAZIA (texto: "${painel.texto}")`);
  else ok.push('livro de magias renderiza');

  // ---------- só magias da vocação? ----------
  const vazamento = await page.evaluate(async () => {
    const sp = await window.__liveImport('spells.js');
    const nomes = [...document.querySelectorAll('#spells-book .rtc-row-name')].map(n => n.textContent.split('"')[0].trim());
    const deOutras = nomes.filter(n => {
      const m = Object.values(sp.SPELLS).find(s => s.name === n);
      return m && !m.voc.includes(window.__G.vocation);
    });
    const daVoc = Object.values(sp.SPELLS).filter(s => s.voc.includes(window.__G.vocation)).length;
    return { voc: window.__G.vocation, listadas: nomes.length, esperadas: daVoc, deOutras };
  });
  console.log(`vocação ${vazamento.voc}: listadas ${vazamento.listadas} de ${vazamento.esperadas} magias da vocação`);
  if (vazamento.deOutras.length) falhas.push(`o livro mostra magia de OUTRA vocação: ${vazamento.deOutras.slice(0, 5).join(', ')}`);
  else if (vazamento.listadas !== vazamento.esperadas) {
    falhas.push(`o livro listou ${vazamento.listadas} magias, mas a vocação tem ${vazamento.esperadas}`);
  } else ok.push('livro filtra por vocação');

  // ---------- conjurar de verdade ----------
  const alvo = await page.evaluate(async () => {
    const sp = await window.__liveImport('spells.js');
    const so = await window.__liveImport('soul.js');
    const soul = Math.min(window.__G.soulMax || so.maxSoul(window.__G.promoted), window.__G.soul || 0);
    const cands = Object.entries(sp.SPELLS).filter(([id, s]) => s.type === 'conjure'
      && sp.isSpellAvailable(id, window.__G.vocation, window.__G.level)
      && s.mana <= window.__G.mana && (s.soul || 0) <= soul
      && (!s.reagent || (window.__G.inventory[s.reagent.item] || 0) >= s.reagent.count));
    // prefere uma COM reagente: é o caminho com mais coisa pra dar errado
    const escolhida = cands.find(([, s]) => s.reagent) || cands[0];
    return { soul, mana: window.__G.mana, total: cands.length,
             id: escolhida ? escolhida[0] : null, spell: escolhida ? escolhida[1] : null };
  });
  console.log(`conjuração disponível agora: ${alvo.total} (soul ${alvo.soul}, mana ${alvo.mana})`);

  if (!alvo.id) console.log('conjuração: INCONCLUSIVO — nenhuma magia de conjuração ao alcance (nível/mana/soul/reagente)');
  else {
    // ARMADILHA: medir mana por G.mana antes/depois NÃO funciona. Parado, o
    // cliente regenera mana sozinho a cada 2s e enche de volta o que a magia
    // gastou — a primeira versão deste teste acusou "não cobrou mana" numa
    // cobrança que o banco mostrava acontecendo. A cobrança de mana/soul só
    // pode ser medida pelo que o SERVIDOR devolve, conjurando duas vezes
    // seguidas e comparando as duas respostas (o intervalo é curto demais pra
    // regeneração mexer no resultado).
    const r = await page.evaluate(async id => {
      const su = await window.__liveImport('spellUseCases.js');
      const au = await window.__liveImport('authClient.js');
      const sp = await window.__liveImport('spells.js');
      const s = sp.SPELLS[id];
      const antes = {
        item: window.__G.inventory[s.conjures.item] || 0,
        reagente: s.reagent ? (window.__G.inventory[s.reagent.item] || 0) : null,
      };
      const res = await su.conjureSpell(window.__ACC.activeSlot, id);
      const r2 = await au.conjureOnServer(window.__ACC.activeSlot, id, window.__G.vocation);
      await new Promise(x => setTimeout(x, 800));
      return { nome: s.name, custo: { mana: s.mana, soul: s.soul || 0 },
               esperado: s.conjures.count, reagente: s.reagent, ok: res && res.ok, antes,
               servidor: { mana1: res && res.mana, mana2: r2 && r2.mana, soul1: res && res.soul, soul2: r2 && r2.soul },
               // conjureOnServer (a 2a chamada) não mexe no G — só a 1a conta aqui.
               depois: { item: window.__G.inventory[s.conjures.item] || 0,
                         reagente: s.reagent ? (window.__G.inventory[s.reagent.item] || 0) : null } };
    }, alvo.id);

    const ganhou = r.depois.item - r.antes.item;
    const gastouMana = r.servidor.mana1 - r.servidor.mana2;
    const gastouSoul = r.servidor.soul1 - r.servidor.soul2;
    console.log(`conjurou "${r.nome}": ok=${r.ok} | item +${ganhou} (esperado ${r.esperado})`
      + ` | mana ${r.servidor.mana1}->${r.servidor.mana2} = -${gastouMana} (esperado ${r.custo.mana})`
      + ` | soul ${r.servidor.soul1}->${r.servidor.soul2} = -${gastouSoul} (esperado ${r.custo.soul})`
      + (r.reagente ? ` | reagente ${r.antes.reagente} -> ${r.depois.reagente}` : ''));

    if (!r.ok) falhas.push(`conjurar "${r.nome}" falhou — o servidor recusou`);
    else {
      if (ganhou !== r.esperado) falhas.push(`"${r.nome}": deveria fabricar ${r.esperado} e fabricou ${ganhou}`);
      else ok.push('conjurar fabrica o item');
      if (gastouMana !== r.custo.mana) falhas.push(`"${r.nome}": cobrou ${gastouMana} de mana, deveria cobrar ${r.custo.mana}`);
      else ok.push('cobrança de mana');
      if (r.custo.soul > 0 && gastouSoul !== r.custo.soul) {
        falhas.push(`"${r.nome}": cobrou ${gastouSoul} soul, deveria cobrar ${r.custo.soul}`);
      } else if (r.custo.soul > 0) ok.push('cobrança de soul');
      if (r.reagente && r.depois.reagente !== r.antes.reagente - r.reagente.count) {
        falhas.push(`"${r.nome}": não consumiu o reagente (${r.antes.reagente} -> ${r.depois.reagente})`);
      } else if (r.reagente) ok.push('consumo do reagente');
    }

    // ---------- o servidor recusa sem soul? ----------
    // Vale mais que o caminho feliz: prova que a cobrança mora no SERVIDOR.
    const fraude = await page.evaluate(async id => {
      const su = await window.__liveImport('spellUseCases.js');
      const sp = await window.__liveImport('spells.js');
      const s = sp.SPELLS[id];
      const antes = window.__G.inventory[s.conjures.item] || 0;
      // Mente pro cliente: soul cheio e mana cheia. Se a cobrança fosse local,
      // isto conjuraria de graça pra sempre.
      window.__G.soul = 999; window.__G.mana = 99999;
      let ganhosSeguidos = 0;
      for (let i = 0; i < 12; i++) { await su.conjureSpell(window.__ACC.activeSlot, id); await new Promise(x => setTimeout(x, 700)); }
      ganhosSeguidos = (window.__G.inventory[s.conjures.item] || 0) - antes;
      return { conjuradas: ganhosSeguidos / s.conjures.count, porCast: s.conjures.count, custoSoul: s.soul || 0 };
    }, alvo.id);
    console.log(`teste de fraude: 12 tentativas mentindo soul=999 -> ${fraude.conjuradas} conjuraram de fato`);
    if (fraude.custoSoul > 0 && fraude.conjuradas >= 12) {
      falhas.push(`o servidor aceitou 12 conjurações seguidas mentindo o soul do cliente — a cobrança não está no servidor`);
    } else ok.push('servidor recusa conjuração sem recurso');
  }
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 250));
} finally {
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
