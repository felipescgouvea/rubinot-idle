// Magias reais do Tibia, por vocação. O RTC auto-casta a spell de ataque e
// usa a de cura no Smart Healing (ver application/huntUseCases.js).

// `element` só existe nas de ataque — decide o efeito visual sobre o monstro
// no momento do cast (ver ui/huntPanel.js). Cura sempre usa o mesmo brilho
// verde do Tibia, então spells de heal não precisam de elemento.
//
// `area` (só nas de ataque) é a FORMA de área do Tibia — ver domain/attackAreas.js
// e .spec/15-areas-de-ataque.md. Strikes/missiles são 'single' (alvo único);
// beams saem em linha reta; waves em cone; 'square' é o 3x3 do Berserk; 'ball'
// é a área gigante do Groundshaker/Caldera/Hell's Core/Eternal Winter/etc.
//
// `cd` = cooldown em SEGUNDOS, fiel ao Tibia atual (valores puxados do TibiaWiki).
// Enquanto a magia está em cooldown, o RTC não a casta de novo — o personagem
// faz o golpe básico nesse meio-tempo (ver application/huntUseCases.js).
//
// `power` = BASE POWER da magia: os 4 coeficientes REAIS do Tibia/TFS
// [aMin, baseMin, aMax, baseMax]. O dano/cura é um valor aleatório uniforme entre
// min e max, onde (ver domain/combatFormulas.js):
//   min = nível/5 + aMin·X + baseMin ;  max = nível/5 + aMax·X + baseMax
// X = Magic Level (padrão), ou, nas magias físicas de knight: skill·ataque
// (`scale:'melee'`) ou skill de distância do paladino (`scale:'distance'`).
// Valores extraídos dos scripts oficiais do TFS (otland/forgottenserver).
export const SPELLS = {
  // universais (exceto knight, que tem a própria cura — exura ico, abaixo)
  exura:            { name: 'Light Healing', words: 'exura', icon: '✨', voc: ['paladin','sorcerer','druid'], level: 9,  mana: 20,  type: 'heal',   power: [1.4, 8, 1.8, 11], cd: 1 },
  exura_gran:       { name: 'Intense Healing', words: 'exura gran', icon: '💚', voc: ['sorcerer','druid'], level: 20, mana: 70, type: 'heal', power: [3.2, 20, 5.4, 40], cd: 1 },
  exura_vita:       { name: 'Ultimate Healing', words: 'exura vita', icon: '💖', voc: ['sorcerer','druid'], level: 30, mana: 160, type: 'heal', power: [6.8, 42, 12.9, 90], cd: 1 },
  exura_san:        { name: 'Divine Healing', words: 'exura san', icon: '🙏', voc: ['paladin'], level: 35, mana: 160, type: 'heal',   power: [6.9, 40, 13.2, 82], cd: 1 },

  // --- Knight — golpes físicos escalam com skill·ataque da arma (scale:'melee').
  // exori/exori gran são área 3x3 (square); exori mas é a área gigante
  // (Groundshaker cobre até 36 sqm, bem mais que o 3x3 do Berserk); o resto é
  // alvo único, exceto Front Sweep (cone à frente).
  exura_ico:        { name: 'Wound Cleansing', words: 'exura ico', icon: '🩹', voc: ['knight'], level: 10, mana: 40,  type: 'heal',   power: [4, 25, 8, 50], cd: 1 },
  exori:            { name: 'Berserk', words: 'exori', icon: '💢', voc: ['knight'], level: 35, mana: 115, type: 'attack', power: [0.03, 7, 0.05, 11], scale: 'melee', element: 'physical', area: 'square', cd: 4 },
  exori_ico:        { name: 'Brutal Strike', words: 'exori ico', icon: '🗡️', voc: ['knight'], level: 16, mana: 30, type: 'attack', power: [0.02, 4, 0.04, 9], scale: 'melee', element: 'physical', area: 'single', cd: 6 },
  exori_hur:        { name: 'Whirlwind Throw', words: 'exori hur', icon: '🪓', voc: ['knight'], level: 28, mana: 40, type: 'attack', power: [0.01, 1, 0.03, 6], scale: 'melee', element: 'physical', area: 'single', cd: 6 },
  exori_mas:        { name: 'Groundshaker', words: 'exori mas', icon: '🌋', voc: ['knight'], level: 33, mana: 160, type: 'attack', power: [0.02, 4, 0.03, 6], scale: 'melee', element: 'physical', area: 'ball', cd: 8 },
  exori_min:        { name: 'Front Sweep', words: 'exori min', icon: '⚔️', voc: ['knight'], level: 70, mana: 200, type: 'attack', power: [0.04, 11, 0.08, 21], scale: 'melee', element: 'physical', area: 'wave', cd: 6 },
  exori_gran:       { name: 'Fierce Berserk', words: 'exori gran', icon: '💥', voc: ['knight'], level: 90, mana: 340, type: 'attack', power: [0.06, 13, 0.11, 27], scale: 'melee', element: 'physical', area: 'square', cd: 6 },
  exori_gran_ico:   { name: 'Annihilation', words: 'exori gran ico', icon: '☠️', voc: ['knight'], level: 110, mana: 300, type: 'attack', power: [0.06, 13, 0.14, 34], scale: 'melee', element: 'physical', area: 'single', cd: 30 },

  // --- Paladin — flecha/missile/spear são alvo único; Divine Caldera é a
  // área gigante (mesma família do Groundshaker/Hell's Core).
  exori_con:        { name: 'Ethereal Spear', words: 'exori con', icon: '🔱', voc: ['paladin'], level: 23, mana: 25,  type: 'attack', power: [0.7, 0, 1.0, 5], scale: 'distance', element: 'physical', area: 'single', cd: 2 },
  exori_gran_con:   { name: 'Strong Ethereal Spear', words: 'exori gran con', icon: '🔺', voc: ['paladin'], level: 90, mana: 55, type: 'attack', power: [1.0, 7, 1.5, 13], scale: 'distance', element: 'physical', area: 'single', cd: 8 },
  exori_san:        { name: 'Divine Missile', words: 'exori san', icon: '☄️', voc: ['paladin'], level: 40, mana: 20,  type: 'attack', power: [1.9, 8, 3.0, 18], element: 'holy', area: 'single', cd: 2 },
  exevo_mas_san:    { name: 'Divine Caldera', words: 'exevo mas san', icon: '🌟', voc: ['paladin'], level: 50, mana: 160, type: 'attack', power: [5, 25, 6.2, 45], element: 'holy', area: 'ball', cd: 4 },

  // --- Magias de Dawnport (Choose your Character, patch 10.55): antes delas,
  // sorcerer e druid ficavam sem NENHUMA magia de ataque do nível 1 ao 12 (só
  // o golpe básico da wand/rod). São versões fracas dos Strikes/Waves reais,
  // liberadas desde o nível 1 (fiel ao Tibia — ficaram disponíveis a
  // qualquer personagem a partir de 19/nov/2014, não só em Dawnport). Knight
  // (Bruise Bane) e Paladin (Arrow Call) não entram aqui: são cura/conjurar
  // munição, não dano — knight já bate com a arma e paladin já atira desde o
  // nível 1, sem esse buraco.
  buzz:             { name: 'Buzz', words: 'exori infir vis', icon: '🐝', voc: ['sorcerer'], level: 1, mana: 6, type: 'attack', power: [0.4, 2, 0.7, 4], element: 'energy', area: 'single', cd: 2 },
  scorch:           { name: 'Scorch', words: 'exevo infir flam hur', icon: '🔥', voc: ['sorcerer'], level: 1, mana: 8, type: 'attack', power: [0.4, 2, 0.6, 4], element: 'fire', area: 'wave', cd: 4 },
  mud_attack:       { name: 'Mud Attack', words: 'exori infir tera', icon: '🟫', voc: ['druid'], level: 1, mana: 6, type: 'attack', power: [0.4, 2, 0.7, 4], element: 'earth', area: 'single', cd: 2 },
  chill_out:        { name: 'Chill Out', words: 'exevo infir frigo hur', icon: '🧊', voc: ['druid'], level: 1, mana: 8, type: 'attack', power: [0.4, 2, 0.6, 4], element: 'ice', area: 'wave', cd: 4 },

  // --- Strikes básicos (fire/energy/ice/earth): desde a atualização de
  // magias do Tibia, sorcerer E druid têm acesso aos 4, alvo único. Death
  // Strike é exclusivo do sorcerer (não existe versão druida).
  exori_flam:       { name: 'Flame Strike', words: 'exori flam', icon: '🔥', voc: ['sorcerer','druid'], level: 12, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'fire', area: 'single', cd: 2 },
  exori_vis:        { name: 'Energy Strike', words: 'exori vis', icon: '⚡', voc: ['sorcerer','druid'], level: 12, mana: 20,  type: 'attack', power: [1.4, 8, 2.2, 14], element: 'energy', area: 'single', cd: 2 },
  exori_frigo:      { name: 'Ice Strike', words: 'exori frigo', icon: '❄️', voc: ['sorcerer','druid'], level: 12, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'ice', area: 'single', cd: 2 },
  exori_tera:       { name: 'Terra Strike', words: 'exori tera', icon: '🍃', voc: ['sorcerer','druid'], level: 13, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'earth', area: 'single', cd: 2 },
  exori_mort:       { name: 'Death Strike', words: 'exori mort', icon: '💀', voc: ['sorcerer'], level: 16, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'death', area: 'single', cd: 2 },

  // --- Sorcerer — waves/beam de fogo e energia; Strong/Ultimate ficam com o
  // sorcerer (druid tem os equivalentes de ice/earth mais abaixo); Hell's
  // Core (fogo) e Rage of the Skies (energia) são as áreas gigantes.
  exevo_flam_hur:   { name: 'Fire Wave', words: 'exevo flam hur', icon: '🌊', voc: ['sorcerer'], level: 18, mana: 25, type: 'attack', power: [1.2, 7, 2.0, 12], element: 'fire', area: 'wave', cd: 4 },
  exevo_gran_flam_hur:{ name: 'Great Fire Wave', words: 'exevo gran flam hur', icon: '🔥', voc: ['sorcerer'], level: 38, mana: 120, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'fire', area: 'wave', cd: 4 },
  exori_gran_flam:  { name: 'Strong Flame Strike', words: 'exori gran flam', icon: '🔥', voc: ['sorcerer'], level: 70, mana: 60, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'fire', area: 'single', cd: 8 },
  exori_max_flam:   { name: 'Ultimate Flame Strike', words: 'exori max flam', icon: '🔆', voc: ['sorcerer'], level: 90, mana: 100, type: 'attack', power: [4.5, 35, 7.3, 55], element: 'fire', area: 'single', cd: 30 },
  exevo_vis_hur:    { name: 'Energy Wave', words: 'exevo vis hur', icon: '⚡', voc: ['sorcerer'], level: 38, mana: 170, type: 'attack', power: [4.5, 20, 7.6, 48], element: 'energy', area: 'wave', cd: 8 },
  exevo_vis_lux:    { name: 'Energy Beam', words: 'exevo vis lux', icon: '📡', voc: ['sorcerer'], level: 23, mana: 40, type: 'attack', power: [1.8, 11, 3.0, 19], element: 'energy', area: 'beam', cd: 4 },
  exevo_gran_vis_lux:{ name: 'Great Energy Beam', words: 'exevo gran vis lux', icon: '🌩️', voc: ['sorcerer'], level: 29, mana: 110, type: 'attack', power: [3.6, 22, 6.0, 37], element: 'energy', area: 'beam', cd: 6 },
  exori_gran_vis:   { name: 'Strong Energy Strike', words: 'exori gran vis', icon: '🌩️', voc: ['sorcerer'], level: 80, mana: 60, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'energy', area: 'single', cd: 8 },
  exori_max_vis:    { name: 'Ultimate Energy Strike', words: 'exori max vis', icon: '🔷', voc: ['sorcerer'], level: 100, mana: 100, type: 'attack', power: [4.5, 35, 7.3, 55], element: 'energy', area: 'single', cd: 30 },
  exevo_gran_mas_flam:{ name: "Hell's Core", words: 'exevo gran mas flam', icon: '🔥', voc: ['sorcerer'], level: 60, mana: 1100, type: 'attack', power: [8, 50, 12, 75], element: 'fire', area: 'ball', cd: 40 },
  exevo_gran_mas_vis:{ name: 'Rage of the Skies', words: 'exevo gran mas vis', icon: '⛈️', voc: ['sorcerer'], level: 55, mana: 600, type: 'attack', power: [4, 75, 10, 150], element: 'energy', area: 'ball', cd: 40 },

  // --- Druid — waves/beam de gelo e terra; Strong/Ultimate ficam com o druid;
  // Eternal Winter (gelo) e Wrath of Nature (terra) são as áreas gigantes.
  // Physical Strike é a única magia física do elenco do druid.
  exori_moe_ico:    { name: 'Physical Strike', words: 'exori moe ico', icon: '👊', voc: ['druid'], level: 16, mana: 20, type: 'attack', power: [1.6, 9, 2.4, 14], element: 'physical', area: 'single', cd: 2 },
  exevo_frigo_hur:  { name: 'Ice Wave', words: 'exevo frigo hur', icon: '🌊', voc: ['druid'], level: 18, mana: 25, type: 'attack', power: [1.2, 7, 2.0, 12], element: 'ice', area: 'wave', cd: 4 },
  exevo_gran_frigo_hur:{ name: 'Strong Ice Wave', words: 'exevo gran frigo hur', icon: '🧊', voc: ['druid'], level: 40, mana: 170, type: 'attack', power: [4.5, 20, 7.6, 48], element: 'ice', area: 'wave', cd: 8 },
  exori_gran_frigo: { name: 'Strong Ice Strike', words: 'exori gran frigo', icon: '🧊', voc: ['druid'], level: 80, mana: 60, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'ice', area: 'single', cd: 8 },
  exori_max_frigo:  { name: 'Ultimate Ice Strike', words: 'exori max frigo', icon: '❄️', voc: ['druid'], level: 100, mana: 100, type: 'attack', power: [4.5, 35, 7.3, 55], element: 'ice', area: 'single', cd: 30 },
  exevo_tera_hur:   { name: 'Terra Wave', words: 'exevo tera hur', icon: '🍃', voc: ['druid'], level: 38, mana: 210, type: 'attack', power: [3.25, 5, 6.75, 30], element: 'earth', area: 'wave', cd: 4 },
  exori_gran_tera:  { name: 'Strong Terra Strike', words: 'exori gran tera', icon: '🌿', voc: ['druid'], level: 70, mana: 60, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'earth', area: 'single', cd: 8 },
  exori_max_tera:   { name: 'Ultimate Terra Strike', words: 'exori max tera', icon: '🌳', voc: ['druid'], level: 90, mana: 100, type: 'attack', power: [4.5, 35, 7.3, 55], element: 'earth', area: 'single', cd: 30 },
  exevo_gran_mas_frio:{ name: 'Eternal Winter', words: 'exevo gran mas frigo', icon: '🌨️', voc: ['druid'], level: 60, mana: 600, type: 'attack', power: [5.5, 25, 11, 50], element: 'ice', area: 'ball', cd: 40 },
  exevo_gran_mas_tera:{ name: 'Wrath of Nature', words: 'exevo gran mas tera', icon: '🌪️', voc: ['druid'], level: 55, mana: 700, type: 'attack', power: [3, 32, 9, 40], element: 'earth', area: 'ball', cd: 40 },
};

export function isSpellAvailable(spellId, vocation, level) {
  const s = SPELLS[spellId];
  return !!(s && vocation && s.voc.includes(vocation) && level >= s.level);
}

// Cura padrão quando o jogador não escolheu nenhuma no RTC — knight não tem
// acesso a "exura" (usa a própria, exura ico), as demais vocações usam exura.
export function defaultHealSpellId(vocation) {
  return vocation === 'knight' ? 'exura_ico' : 'exura';
}
