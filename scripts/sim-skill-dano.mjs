// Simula quanto a SKILL pesa no dano do golpe básico, para Knight e Paladino.
// Usa as funções REAIS do jogo (domain/combatFormulas.js), não uma reimplementação
// — se a fórmula mudar, esta simulação muda junto.
//
// Fórmula (idêntica ao TFS, src/weapons.cpp: Weapons::getMaxWeaponDamage):
//   max = round( floor(level/5) + ((skill/4 + 1) * (atk/3) * 1.03) / fatorDeAtaque )
// e o dano do golpe é sorteado com normal_random (tende ao MEIO da faixa):
//   melee (knight)     -> normal_random(0, max)
//   distance (paladino)-> normal_random(ceil(level*0.2), max)   [alvo = monstro]
import { getMaxWeaponDamage, rollPlayerAttack } from '../src/domain/combatFormulas.js?v=sim';
import { ITEMS } from '../src/domain/items.js?v=sim';

const N = 60000;                       // amostras por ponto
const LEVEL = +(process.argv[2] || 20);

function media(voc, skills, equipment) {
  let soma = 0, max = 0, min = Infinity;
  for (let i = 0; i < N; i++) {
    const r = rollPlayerAttack({ vocation: voc, level: LEVEL, skills, equipment, relics: [], fightMode: 'balanced' });
    soma += r.damage; if (r.damage > max) max = r.damage; if (r.damage < min) min = r.damage;
  }
  return { media: soma / N, max, min };
}

function tabela(titulo, voc, skillId, equipment, atkEfetivo) {
  console.log('\n' + '='.repeat(78));
  console.log(titulo);
  const arma = ITEMS[equipment.weapon];
  const muni = equipment.ammo ? ITEMS[equipment.ammo] : null;
  console.log(`arma: ${arma.name} (atk ${arma.atk || 0}${arma.distanceBonus ? ' +' + arma.distanceBonus + ' de bônus' : ''})`
    + (muni ? ` | munição: ${muni.name} (atk ${muni.atk})` : '') + ` | ataque efetivo = ${atkEfetivo}`);
  console.log(`nível ${LEVEL} | fórmula: max = round(floor(${LEVEL}/5) + ((skill/4 + 1) * ${atkEfetivo}/3) * 1.03)`);
  console.log('='.repeat(78));
  console.log('skill │  max  │ média │ ganho vs skill anterior │ ganho por ponto de skill');
  console.log('──────┼───────┼───────┼─────────────────────────┼─────────────────────────');
  let anterior = null;
  const passos = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  for (const sk of passos) {
    const skills = { [skillId]: { lv: sk, tries: 0 } };
    const max = getMaxWeaponDamage(LEVEL, sk, atkEfetivo, 1);
    const m = media(voc, skills, equipment);
    const dif = anterior ? m.media - anterior : null;
    const porPonto = anterior ? dif / 10 : null;
    console.log(
      `${String(sk).padStart(5)} │ ${String(max).padStart(5)} │ ${m.media.toFixed(1).padStart(5)} │ `
      + `${(dif === null ? '—' : `+${dif.toFixed(1)} (+${((dif / anterior) * 100).toFixed(1)}%)`).padStart(23)} │ `
      + `${(porPonto === null ? '—' : `+${porPonto.toFixed(2)}`).padStart(24)}`
    );
    anterior = m.media;
  }
  // peso relativo: quanto da média vem da skill vs do resto
  const semSkill = getMaxWeaponDamage(LEVEL, 0, atkEfetivo, 1);
  const com100 = getMaxWeaponDamage(LEVEL, 100, atkEfetivo, 1);
  console.log(`\nskill 0 -> 100: max vai de ${semSkill} para ${com100} (${(com100 / semSkill).toFixed(1)}x)`);
}

// ---- Knight: melee, o ataque vem da ARMA ----
const espada = 'fire_sword';
tabela('KNIGHT — golpe de espada', 'knight', 'sword',
  { weapon: espada, ammo: null }, ITEMS[espada].atk || 0);

// ---- Paladino: distance, o ataque vem do ARCO + MUNIÇÃO ----
const arco = 'bow', flecha = 'arrow';
const atkDist = (ITEMS[arco].atk || 0) + (ITEMS[arco].distanceBonus || 0) + (ITEMS[flecha].atk || 0);
tabela('PALADINO — tiro de arco', 'paladin', 'distance',
  { weapon: arco, ammo: flecha }, atkDist);

// ---- comparação direta no mesmo nível de skill ----
console.log('\n' + '='.repeat(78));
console.log(`COMPARAÇÃO no nível ${LEVEL} (média de ${N.toLocaleString('pt-BR')} golpes)`);
console.log('='.repeat(78));
console.log('skill │ knight (espada) │ paladino (arco) │ diferença');
console.log('──────┼─────────────────┼─────────────────┼──────────');
for (const sk of [10, 30, 50, 70, 90, 110]) {
  const k = media('knight', { sword: { lv: sk, tries: 0 } }, { weapon: espada, ammo: null });
  const p = media('paladin', { distance: { lv: sk, tries: 0 } }, { weapon: arco, ammo: flecha });
  console.log(`${String(sk).padStart(5)} │ ${k.media.toFixed(1).padStart(15)} │ ${p.media.toFixed(1).padStart(15)} │ `
    + `${(((p.media / k.media) - 1) * 100).toFixed(0).padStart(6)}%`);
}
console.log('\nObs.: o knight sorteia de 0 até o máximo; o paladino sorteia de');
console.log(`ceil(nível*0.2)=${Math.ceil(LEVEL * 0.2)} até o máximo (é assim no TFS, contra monstro).`);
console.log('Por isso, com o MESMO ataque efetivo, o paladino tem a média um pouco maior.');
