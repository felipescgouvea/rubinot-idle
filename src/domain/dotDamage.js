// DANO CONTÍNUO (as magias "utori": Ignite, Curse, Electrify, Envenom,
// Holy Flash, Inflict Wound).
//
// Essas magias não dão dano no instante do cast: elas grudam uma condição na
// criatura, que sangra por vários segundos depois. O Tibia monta essa sequência
// de golpes ANTES, no momento do cast — é uma lista fixa de (dano, quando) que
// não muda mais, mesmo que o conjurador morra.
//
// A montagem aqui é a tradução direta de Creature:addDamageCondition
// (data/lib/core/creature.lua do TFS), incluindo as quatro formas de lista:
//
//   varying      N rodadas de dano fixo, cada uma com intervalo sorteado
//   constant     N rodadas de dano fixo, intervalo igual em todas
//   exponential  começa fraquinho e DOBRA de força até passar do alvo (Curse)
//   logarithmic  começa forte e vai decaindo até sumir (Envenom, Inflict Wound)
//
// Isso importa porque as duas últimas não são "dano X vezes N": o total real é
// vários múltiplos do número da fórmula. Chutar "dano × rodadas" daria um
// veneno muito mais fraco que o do Tibia.

const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));

// min/max da fórmula do TFS: nível/80 + X·coef + base, onde X é Magic Level
// (padrão) ou a melhor skill corpo a corpo (Inflict Wound, scale:'melee').
function faixa(dot, campo, { level, magicLevel, meleeSkill }) {
  const [aMin, bMin, aMax, bMax] = dot[campo];
  const x = dot.scale === 'melee' ? (meleeSkill || 0) : (magicLevel || 0);
  return [level / 80 + x * aMin + bMin, level / 80 + x * aMax + bMax];
}

// Devolve [{ damage, atMs }] — atMs é o tempo, em ms depois do cast, em que
// aquele golpe cai. Lista vazia = a magia não causou nada (dano zero).
export function buildDotSchedule(dot, ctx) {
  if (!dot) return [];
  const [minP, maxP] = dot.everyMs;
  const golpes = [];
  let t = 0;

  if (dot.list === 'varying' || dot.list === 'constant') {
    const [min, max] = faixa(dot, 'rounds', ctx);
    const rodadas = rndInt(Math.floor(min), Math.floor(max));
    // 'constant' sorteia UM intervalo e repete; 'varying' sorteia a cada rodada.
    const fixo = dot.list === 'constant' ? rndInt(minP, maxP) : 0;
    for (let i = 0; i < rodadas; i++) {
      t += dot.list === 'constant' ? fixo : rndInt(minP, maxP);
      golpes.push({ damage: dot.damage, atMs: t });
    }
    return golpes;
  }

  const [min, max] = faixa(dot, 'damage', ctx);
  const alvo = dot.list === 'exponential'
    ? rndInt(Math.floor(min), Math.floor(max))
    : rnd(Math.floor(min), Math.floor(max));
  if (alvo <= 0) return [];
  const periodo = minP;

  if (dot.list === 'exponential') {
    // Rampa 10·1,2^k começando em k = -10 e subindo até passar do alvo; o
    // último golpe é o valor final multiplicado por um fator sorteado.
    let k = -10, valor = 0;
    // teto de segurança: a rampa cresce 20% por passo, então mesmo um alvo
    // absurdo converge — o limite só existe pra nunca travar o servidor.
    for (let i = 0; i < 200; i++) {
      valor = Math.floor(10 * Math.pow(1.2, k) + 0.5);
      t += periodo;
      golpes.push({ damage: valor, atMs: t });
      if (valor >= alvo) {
        t += periodo;
        golpes.push({ damage: Math.max(1, Math.floor(valor * (rndInt(10, 1200) / 1000) + 0.5)), atMs: t });
        break;
      }
      k++;
    }
    return golpes;
  }

  // logarithmic: alvo · e^(-0,05·n), n = 0, 1, 2... até arredondar pra zero.
  for (let n = 0; n < 500; n++) {
    const valor = Math.floor(alvo * Math.exp(-0.05 * n) + 0.5);
    if (valor <= 0) break;
    t += periodo;
    golpes.push({ damage: valor, atMs: t });
  }
  return golpes;
}

// Só pra UI/tooltip: dano total e duração da sequência, sem sortear de novo.
export function dotSummary(schedule) {
  if (!schedule.length) return { total: 0, ms: 0, hits: 0 };
  return {
    total: schedule.reduce((s, g) => s + g.damage, 0),
    ms: schedule[schedule.length - 1].atMs,
    hits: schedule.length,
  };
}
