// Unit test das fórmulas de combate (determinísticas) — trava a fidelidade ao
// Crystal Server: gear/skill conhecidos → dano/valor conhecido. Roda offline
// (sem browser/servidor). Falha se alguma fórmula mudar sem querer.
//   node scripts/test-combat-formulas.mjs
const F = await import('file:///c:/workspace/rubinot-idle/src/domain/combatFormulas.js');
const { VOCATIONS } = await import('file:///c:/workspace/rubinot-idle/src/domain/character.js');

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const ok = Object.is(got, exp) || (typeof got === 'number' && Math.abs(got - exp) < 1e-9);
  if (ok) { pass++; } else { fail++; console.log(`❌ ${name}: obtido ${got}, esperado ${exp}`); }
}

// getMaxWeaponDamage: round(floor(level/5) + (((skill/4+1)*(atk/3))*1.03)/factor)
// level100 skill100 atk50 factor1 → round(20 + (26*16.6667)*1.03) = round(466.333) = 466
eq('getMaxWeaponDamage(100,100,50,1)', F.getMaxWeaponDamage(100, 100, 50, 1), 466);
// factor 2 (deveria reduzir): round(20 + 446.333/2) = round(20 + 223.167) = 243
eq('getMaxWeaponDamage factor 2', F.getMaxWeaponDamage(100, 100, 50, 2), 243);
// nível baixo, sem skill: round(floor(1/5)=0 + ((0/4+1)*(10/3))*1.03) = round(3.433) = 3
eq('getMaxWeaponDamage(1,0,10,1)', F.getMaxWeaponDamage(1, 0, 10, 1), 3);

// getMaxMeleeDamage(skill,atk) = ceil(skill*(atk*0.05) + atk*0.5)
// (50,40) = ceil(50*2 + 20) = 120
eq('getMaxMeleeDamage(50,40)', F.getMaxMeleeDamage(50, 40), 120);

// reduceElemental: dano * (1 - pct/100); físico ignora; sem absorb não muda
eq('reduceElemental 50% fogo', F.reduceElemental(100, 'fire', { fire: 50 }), 50);
eq('reduceElemental físico ignora', F.reduceElemental(100, 'physical', { fire: 50 }), 100);
eq('reduceElemental sem absorb', F.reduceElemental(100, 'fire', {}), 100);
eq('reduceElemental elemento sem res', F.reduceElemental(100, 'ice', { fire: 50 }), 100);

// teto de resistência elemental = 80 (nunca imunidade total)
eq('ELEMENTAL_RESIST_CAP', F.ELEMENTAL_RESIST_CAP, 80);

// reducePhysical determinístico nas bordas: sem armor/def não reduz; armor 1..3 = -1
eq('reducePhysical sem armor/def', F.reducePhysical(100, 0, 0), 100);
eq('reducePhysical armor 2 = -1', F.reducePhysical(100, 2, 0), 99);
eq('reducePhysical dano 0', F.reducePhysical(0, 50, 50), 0);

// Fight modes (Crystal Server): ofensivo = dano cheio (factor 1.0), equilibrado 1.2
eq('FIGHT_MODES.attack.attackFactor', F.FIGHT_MODES.attack.attackFactor, 1.0);
eq('FIGHT_MODES.balanced.attackFactor', F.FIGHT_MODES.balanced.attackFactor, 1.2);
eq('modo defensivo bloqueia mais', F.FIGHT_MODES.defense.defenseFactor > F.FIGHT_MODES.attack.defenseFactor, true);

// computeMaxMana: no nível 1 = baseMana da vocação; +manaPerLevel por nível
const someVoc = Object.keys(VOCATIONS)[0];
const v = VOCATIONS[someVoc];
eq(`computeMaxMana(${someVoc},1)=baseMana`, F.computeMaxMana({ vocation: someVoc, level: 1 }), v.baseMana);
eq(`computeMaxMana +manaPerLevel`, F.computeMaxMana({ vocation: someVoc, level: 2 }) - F.computeMaxMana({ vocation: someVoc, level: 1 }), v.manaPerLevel);
eq('computeMaxMana sem vocação = 100', F.computeMaxMana({ vocation: null, level: 50 }), 100);

console.log(`\n${fail ? '❌' : '✅'} fórmulas de combate: ${pass} passaram, ${fail} falharam`);
process.exitCode = fail ? 1 : 0;
