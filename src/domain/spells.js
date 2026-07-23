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
// `power` = BASE POWER da magia: os 4 coeficientes REAIS do Tibia/Crystal Server
// [aMin, baseMin, aMax, baseMax]. O dano/cura é um valor aleatório uniforme entre
// min e max, onde (ver domain/combatFormulas.js):
//   min = nível/5 + aMin·X + baseMin ;  max = nível/5 + aMax·X + baseMax
// X = Magic Level (padrão), ou, nas magias físicas de knight: skill·ataque
// (`scale:'melee'`) ou skill de distância do paladino (`scale:'distance'`).
// Valores extraídos dos scripts oficiais do Crystal Server (zimbadev/crystalserver).
export const SPELLS = {
  // --- Cura de nível 1, do Dawnport (TibiaWiki: Dawnport) — sem elas, um personagem
  // recém-criado ficava sem NENHUMA spell de cura disponível até nível 8 (só sobrava
  // poção). Bruise Bane é exclusiva do knight; Magic Patch é dos outros 3.
  bruise_bane:      { name: 'Bruise Bane', words: 'exura infir ico', icon: '🩹', voc: ['knight'], level: 1, mana: 10, type: 'heal', power: [1, 6, 2, 13], cd: 1 },
  magic_patch:      { name: 'Magic Patch', words: 'exura infir', icon: '✨', voc: ['paladin','sorcerer','druid'], level: 1, mana: 6, type: 'heal', power: [0.4, 2, 0.5, 3], cd: 1 },

  // universais (exceto knight, que tem a própria cura — exura ico, abaixo)
  exura:            { name: 'Light Healing', words: 'exura', icon: '✨', voc: ['paladin','sorcerer','druid'], level: 8,  mana: 20,  type: 'heal',   power: [1.4, 8, 1.8, 11], cd: 1 },
  exura_gran:       { name: 'Intense Healing', words: 'exura gran', icon: '💚', voc: ['sorcerer','druid','paladin'], level: 20, mana: 70, type: 'heal', power: [3.2, 20, 5.4, 40], cd: 1 },
  exura_vita:       { name: 'Ultimate Healing', words: 'exura vita', icon: '💖', voc: ['sorcerer','druid'], level: 30, mana: 160, type: 'heal', power: [6.8, 42, 12.9, 90], cd: 1 },
  exura_san:        { name: 'Divine Healing', words: 'exura san', icon: '🙏', voc: ['paladin'], level: 35, mana: 160, type: 'heal',   power: [6.9, 40, 13.2, 82], cd: 1 },

  // --- Knight — golpes físicos escalam com skill·ataque da arma (scale:'melee').
  // exori/exori gran são área 3x3 (square); exori mas é a área gigante
  // (Groundshaker cobre até 36 sqm, bem mais que o 3x3 do Berserk); o resto é
  // alvo único, exceto Front Sweep (cone à frente).
  exura_ico:        { name: 'Wound Cleansing', words: 'exura ico', icon: '🩹', voc: ['knight'], level: 8, mana: 40,  type: 'heal',   power: [4, 25, 8, 50], cd: 1 },
  exori:            { name: 'Berserk', words: 'exori', icon: '💢', voc: ['knight'], level: 35, mana: 125, type: 'attack', power: [0.03, 7, 0.05, 11], scale: 'melee', element: 'physical', area: 'square', cd: 4 },
  exori_ico:        { name: 'Brutal Strike', words: 'exori ico', icon: '🗡️', voc: ['knight'], level: 16, mana: 30, type: 'attack', power: [0.02, 4, 0.04, 9], scale: 'melee', element: 'physical', area: 'single', cd: 6 },
  exori_hur:        { name: 'Whirlwind Throw', words: 'exori hur', icon: '🪓', voc: ['knight'], level: 28, mana: 40, type: 'attack', power: [0.01, 1, 0.03, 6], scale: 'melee', element: 'physical', area: 'single', cd: 6 },
  exori_mas:        { name: 'Groundshaker', words: 'exori mas', icon: '🌋', voc: ['knight'], level: 33, mana: 200, type: 'attack', power: [0.02, 4, 0.03, 6], scale: 'melee', element: 'physical', area: 'ball', cd: 8 },
  exori_min:        { name: 'Front Sweep', words: 'exori min', icon: '⚔️', voc: ['knight'], level: 70, mana: 200, type: 'attack', power: [0.04, 11, 0.08, 21], scale: 'melee', element: 'physical', area: 'wave', cd: 6 },
  exori_gran:       { name: 'Fierce Berserk', words: 'exori gran', icon: '💥', voc: ['knight'], level: 90, mana: 360, type: 'attack', power: [0.06, 13, 0.11, 27], scale: 'melee', element: 'physical', area: 'square', cd: 6 },
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
  exori_flam:       { name: 'Flame Strike', words: 'exori flam', icon: '🔥', voc: ['sorcerer','druid'], level: 8, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'fire', area: 'single', cd: 2 },
  exori_vis:        { name: 'Energy Strike', words: 'exori vis', icon: '⚡', voc: ['sorcerer','druid'], level: 12, mana: 20,  type: 'attack', power: [1.4, 8, 2.2, 14], element: 'energy', area: 'single', cd: 2 },
  exori_frigo:      { name: 'Ice Strike', words: 'exori frigo', icon: '❄️', voc: ['sorcerer','druid'], level: 8, mana: 20, type: 'attack', power: [1.4, 8, 2.2, 14], element: 'ice', area: 'single', cd: 2 },
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
  exevo_tera_hur:   { name: 'Terra Wave', words: 'exevo tera hur', icon: '🍃', voc: ['druid'], level: 38, mana: 170, type: 'attack', power: [3.25, 5, 6.75, 30], element: 'earth', area: 'wave', cd: 4 },
  exori_gran_tera:  { name: 'Strong Terra Strike', words: 'exori gran tera', icon: '🌿', voc: ['druid'], level: 70, mana: 60, type: 'attack', power: [2.8, 16, 4.4, 28], element: 'earth', area: 'single', cd: 8 },
  exori_max_tera:   { name: 'Ultimate Terra Strike', words: 'exori max tera', icon: '🌳', voc: ['druid'], level: 90, mana: 100, type: 'attack', power: [4.5, 35, 7.3, 55], element: 'earth', area: 'single', cd: 30 },
  exevo_gran_mas_frio:{ name: 'Eternal Winter', words: 'exevo gran mas frigo', icon: '🌨️', voc: ['druid'], level: 60, mana: 1050, type: 'attack', power: [5.5, 25, 11, 50], element: 'ice', area: 'ball', cd: 40 },
  exevo_gran_mas_tera:{ name: 'Wrath of Nature', words: 'exevo gran mas tera', icon: '🌪️', voc: ['druid'], level: 55, mana: 700, type: 'attack', power: [3, 32, 9, 40], element: 'earth', area: 'ball', cd: 40 },

  // ===================================================================
  // Ataques de DANO CONTÍNUO (as magias "utori"). No Tibia elas não dão
  // dano na hora: grudam uma condição no monstro que sangra por vários
  // segundos. Por isso não têm `power` — têm `dot` (ver a explicação do
  // campo lá em cima, e domain/dotDamage.js pra conta de cada golpe).
  // Números conferidos em data/scripts/spells/attack/*.lua do Crystal Server.
  // ===================================================================
  utori_flam:       { name: 'Ignite', words: 'utori flam', icon: '🔥', voc: ['sorcerer'], level: 26, mana: 30, type: 'attack', element: 'fire', area: 'single', cd: 2,
                      dot: { list: 'varying', rounds: [0.3, 2, 0.6, 4], damage: 10, everyMs: [8000, 10000] } },
  utori_vis:        { name: 'Electrify', words: 'utori vis', icon: '⚡', voc: ['sorcerer'], level: 34, mana: 30, type: 'attack', element: 'energy', area: 'single', cd: 2,
                      dot: { list: 'varying', rounds: [0.15, 1, 0.25, 1], damage: 25, everyMs: [10000, 12000] } },
  utori_san:        { name: 'Holy Flash', words: 'utori san', icon: '✨', voc: ['paladin'], level: 70, mana: 30, type: 'attack', element: 'holy', area: 'single', cd: 2,
                      dot: { list: 'constant', rounds: [0.3, 2, 0.5, 3], damage: 20, everyMs: [10000, 12000] } },
  utori_mort:       { name: 'Curse', words: 'utori mort', icon: '☠️', voc: ['sorcerer'], level: 75, mana: 30, type: 'attack', element: 'death', area: 'single', cd: 2,
                      dot: { list: 'exponential', damage: [0.5, 7, 0.9, 8], everyMs: [4000, 4000] } },
  utori_pox:        { name: 'Envenom', words: 'utori pox', icon: '🤢', voc: ['druid'], level: 50, mana: 30, type: 'attack', element: 'earth', area: 'single', cd: 2,
                      dot: { list: 'logarithmic', damage: [0.55, 6, 0.75, 7], everyMs: [4000, 4000] } },
  // Única "utori" do knight: escala com a MELHOR skill de arma corpo a corpo
  // (o Crystal Server varre club/sword/axe e pega a maior), não com Magic Level.
  utori_kor:        { name: 'Inflict Wound', words: 'utori kor', icon: '🩸', voc: ['knight'], level: 40, mana: 30, type: 'attack', element: 'physical', area: 'single', cd: 2,
                      dot: { list: 'logarithmic', scale: 'melee', damage: [0.2, 2, 0.4, 2], everyMs: [4000, 4000] } },

  // Lightning e Apprentice's Strike — dano imediato normal, só faltavam.
  // Apprentice's Strike é a única magia do jogo com dano FIXO no Crystal Server
  // (retorna -10/-20 direto, sem olhar nível nem Magic Level).
  exori_amp_vis:    { name: 'Lightning', words: 'exori amp vis', icon: '🌩️', voc: ['sorcerer'], level: 55, mana: 60, type: 'attack', power: [2.2, 12, 3.4, 21], element: 'energy', area: 'single', cd: 2 },
  exori_min_flam:   { name: "Apprentice's Strike", words: 'exori min flam', icon: '🔥', voc: ['sorcerer','druid'], level: 6, mana: 6, type: 'attack', power: [0, 10, 0, 20], element: 'fire', area: 'single', cd: 2 },

  // ===================================================================
  // CURA que faltava. As "exana" curam CONDIÇÕES (veneno, fogo, sangramento):
  // como a caçada aqui não aplica essas condições no jogador, elas entram no
  // livro como magia conhecida mas sem efeito de combate — marcadas `utility`
  // pra UI dizer isso na cara em vez de fingir que curam vida.
  // Recovery/Intense Recovery são regeneração ao longo do tempo (buff), não
  // cura instantânea — por isso `type:'support'` com `buff.regen`.
  // ===================================================================
  exura_gran_san:   { name: 'Salvation', words: 'exura gran san', icon: '🙌', voc: ['paladin'], level: 60, mana: 210, type: 'heal', power: [12, 75, 20, 125], cd: 1 },
  exura_gran_ico:   { name: 'Intense Wound Cleansing', words: 'exura gran ico', icon: '💗', voc: ['knight'], level: 80, mana: 200, type: 'heal', power: [70, 438, 92, 544], cd: 1 },
  exura_gran_mas_res:{ name: 'Mass Healing', words: 'exura gran mas res', icon: '🫧', voc: ['druid'], level: 36, mana: 150, type: 'heal', power: [4.6, 100, 9.6, 125], cd: 1 },
  exura_sio:        { name: 'Heal Friend', words: 'exura sio', icon: '🤝', voc: ['druid'], level: 18, mana: 120, type: 'heal', power: [6.3, 45, 14.4, 90], cd: 1 },

  exana_pox:        { name: 'Cure Poison', words: 'exana pox', icon: '🧪', voc: ['sorcerer','druid','paladin','knight'], level: 10, mana: 30, type: 'utility', cd: 6 },
  exana_vis:        { name: 'Cure Electrification', words: 'exana vis', icon: '🧪', voc: ['druid'], level: 22, mana: 30, type: 'utility', cd: 6 },
  exana_flam:       { name: 'Cure Burning', words: 'exana flam', icon: '🧪', voc: ['druid'], level: 30, mana: 30, type: 'utility', cd: 6 },
  exana_kor:        { name: 'Cure Bleeding', words: 'exana kor', icon: '🧪', voc: ['druid','knight'], level: 45, mana: 30, type: 'utility', cd: 6 },
  exana_mort:       { name: 'Cure Curse', words: 'exana mort', icon: '🧪', voc: ['paladin'], level: 80, mana: 40, type: 'utility', cd: 6 },

  // ===================================================================
  // SUPORTE. `buff` = o que a magia muda enquanto dura (ms). Os percentuais
  // vêm dos CONDITION_PARAM_SKILL_*PERCENT do Crystal Server: 135 significa "skill vale
  // 135% do normal". `defenseOff` é o CONDITION_PARAM_DISABLE_DEFENSE —
  // Blood Rage e Sharpshooter batem mais forte e defendem zero.
  // As de utilidade fora de combate (luz, corda, procurar pessoa, invocar,
  // magias de grupo) entram como `utility`: existem no livro, sem efeito na
  // caçada solo — dizer isso é mais honesto que inventar um bônus.
  // ===================================================================
  utamo_vita:       { name: 'Magic Shield', words: 'utamo vita', icon: '🛡️', voc: ['sorcerer','druid'], level: 14, mana: 50, type: 'support', cd: 2, buff: { manaShield: true, ms: 200000 } },
  utito_tempo:      { name: 'Blood Rage', words: 'utito tempo', icon: '🩸', voc: ['knight'], level: 60, mana: 290, type: 'support', cd: 60, buff: { meleePct: 135, defenseOff: true, ms: 10000 } },
  utamo_tempo:      { name: 'Protector', words: 'utamo tempo', icon: '🛡️', voc: ['knight'], level: 55, mana: 200, type: 'support', cd: 60, buff: { shieldPct: 220, pacified: true, ms: 13000 } },
  utito_tempo_san:  { name: 'Sharpshooter', words: 'utito tempo san', icon: '🎯', voc: ['paladin'], level: 60, mana: 450, type: 'support', cd: 60, buff: { distancePct: 150, defenseOff: true, ms: 10000 } },
  utamo_tempo_san:  { name: 'Swift Foot', words: 'utamo tempo san', icon: '👟', voc: ['paladin'], level: 55, mana: 400, type: 'support', cd: 60, buff: { hastePct: 80, pacified: true, ms: 10000 } },
  utura:            { name: 'Recovery', words: 'utura', icon: '💚', voc: ['paladin','knight'], level: 50, mana: 75, type: 'support', cd: 60, buff: { regenHp: 20, regenEveryMs: 3000, ms: 60000 } },
  utura_gran:       { name: 'Intense Recovery', words: 'utura gran', icon: '💚', voc: ['paladin','knight'], level: 100, mana: 165, type: 'support', cd: 60, buff: { regenHp: 40, regenEveryMs: 3000, ms: 60000 } },
  utani_hur:        { name: 'Haste', words: 'utani hur', icon: '💨', voc: ['sorcerer','druid','paladin','knight'], level: 14, mana: 60, type: 'support', cd: 2, buff: { hastePct: 30, ms: 33000 } },
  utani_gran_hur:   { name: 'Strong Haste', words: 'utani gran hur', icon: '🌬️', voc: ['sorcerer','druid'], level: 20, mana: 100, type: 'support', cd: 2, buff: { hastePct: 70, ms: 22000 } },
  utani_tempo_hur:  { name: 'Charge', words: 'utani tempo hur', icon: '🐎', voc: ['knight'], level: 25, mana: 100, type: 'support', cd: 2, buff: { hastePct: 70, ms: 30000 } },
  exeta_res:        { name: 'Challenge', words: 'exeta res', icon: '📢', voc: ['knight'], level: 20, mana: 40, type: 'support', cd: 2, buff: { taunt: true, ms: 6000 } },
  exeta_vis:        { name: 'Enchant Staff', words: 'exeta vis', icon: '🪄', voc: ['sorcerer'], level: 41, mana: 80, type: 'utility', cd: 2 },

  utevo_lux:        { name: 'Light', words: 'utevo lux', icon: '🕯️', voc: ['sorcerer','druid','paladin','knight'], level: 8, mana: 20, type: 'utility', cd: 2 },
  utevo_gran_lux:   { name: 'Great Light', words: 'utevo gran lux', icon: '🔦', voc: ['sorcerer','druid','paladin','knight'], level: 13, mana: 60, type: 'utility', cd: 2 },
  utevo_vis_lux:    { name: 'Ultimate Light', words: 'utevo vis lux', icon: '💡', voc: ['sorcerer','druid'], level: 26, mana: 140, type: 'utility', cd: 2 },
  exiva:            { name: 'Find Person', words: 'exiva', icon: '🔎', voc: ['sorcerer','druid','paladin','knight'], level: 8, mana: 20, type: 'utility', cd: 2 },
  exani_tera:       { name: 'Magic Rope', words: 'exani tera', icon: '🪢', voc: ['sorcerer','druid','paladin','knight'], level: 9, mana: 20, type: 'utility', cd: 2 },
  exani_hur:        { name: 'Levitate', words: 'exani hur', icon: '🪂', voc: ['sorcerer','druid','paladin','knight'], level: 12, mana: 50, type: 'utility', cd: 2 },
  utana_vid:        { name: 'Invisibility', words: 'utana vid', icon: '👻', voc: ['sorcerer','druid'], level: 35, mana: 440, type: 'utility', cd: 2 },
  exana_ina:        { name: 'Cancel Invisibility', words: 'exana ina', icon: '👁️', voc: ['paladin'], level: 26, mana: 200, type: 'utility', cd: 2 },
  utevo_res_ina:    { name: 'Creature Illusion', words: 'utevo res ina', icon: '🎭', voc: ['sorcerer','druid'], level: 23, mana: 100, type: 'utility', cd: 2 },
  utevo_res:        { name: 'Summon Creature', words: 'utevo res', icon: '🐺', voc: ['sorcerer','druid'], level: 25, mana: 0, type: 'utility', cd: 2 },
  utori_mas_sio:    { name: 'Enchant Party', words: 'utori mas sio', icon: '🎉', voc: ['sorcerer'], level: 32, mana: 0, type: 'utility', cd: 2 },
  utura_mas_sio:    { name: 'Heal Party', words: 'utura mas sio', icon: '🎉', voc: ['druid'], level: 32, mana: 0, type: 'utility', cd: 2 },
  utamo_mas_sio:    { name: 'Protect Party', words: 'utamo mas sio', icon: '🎉', voc: ['paladin'], level: 32, mana: 0, type: 'utility', cd: 2 },
  utito_mas_sio:    { name: 'Train Party', words: 'utito mas sio', icon: '🎉', voc: ['knight'], level: 32, mana: 0, type: 'utility', cd: 2 },

  // ===================================================================
  // CONJURAÇÃO — as magias que FABRICAM item (munição do paladino e as runas
  // dos magos). Custam mana E soul points (ver domain/soul.js); as runas ainda
  // consomem uma Blank Rune de reagente, igual ao Tibia. `conjures` diz o que
  // sai e quantas cargas — números tirados da chamada conjureItem(reagente,
  // item, quantidade) de cada data/scripts/spells/conjuring/*.lua do Crystal Server.
  // ===================================================================
  exevo_infir_con:  { name: 'Arrow Call', words: 'exevo infir con', icon: '🏹', voc: ['paladin'], level: 1, mana: 30, soul: 1, type: 'conjure', conjures: { item: 'simple_arrow', count: 3 }, cd: 2 },
  exevo_con:        { name: 'Conjure Arrow', words: 'exevo con', icon: '🏹', voc: ['paladin'], level: 13, mana: 100, soul: 1, type: 'conjure', conjures: { item: 'arrow', count: 10 }, cd: 2 },
  exevo_con_pox:    { name: 'Conjure Poisoned Arrow', words: 'exevo con pox', icon: '🏹', voc: ['paladin'], level: 16, mana: 130, soul: 2, type: 'conjure', conjures: { item: 'poison_arrow', count: 7 }, cd: 2 },
  exevo_con_mort:   { name: 'Conjure Bolt', words: 'exevo con mort', icon: '🏹', voc: ['paladin'], level: 17, mana: 140, soul: 2, type: 'conjure', conjures: { item: 'bolt', count: 5 }, cd: 2 },
  exevo_con_hur:    { name: 'Conjure Sniper Arrow', words: 'exevo con hur', icon: '🏹', voc: ['paladin'], level: 24, mana: 160, soul: 3, type: 'conjure', conjures: { item: 'sniper_arrow', count: 5 }, cd: 2 },
  exevo_con_flam:   { name: 'Conjure Explosive Arrow', words: 'exevo con flam', icon: '🏹', voc: ['paladin'], level: 25, mana: 290, soul: 3, type: 'conjure', conjures: { item: 'burst_arrow', count: 8 }, cd: 2 },
  exevo_con_grav:   { name: 'Conjure Piercing Bolt', words: 'exevo con grav', icon: '🏹', voc: ['paladin'], level: 33, mana: 180, soul: 3, type: 'conjure', conjures: { item: 'piercing_bolt', count: 5 }, cd: 2 },
  exeta_con:        { name: 'Enchant Spear', words: 'exeta con', icon: '🔱', voc: ['paladin'], level: 45, mana: 350, soul: 3, type: 'conjure', reagent: { item: 'spear', count: 1 }, conjures: { item: 'enchanted_spear', count: 1 }, cd: 2 },
  exevo_con_vis:    { name: 'Conjure Power Bolt', words: 'exevo con vis', icon: '🏹', voc: ['paladin'], level: 59, mana: 700, soul: 4, type: 'conjure', conjures: { item: 'power_bolt', count: 10 }, cd: 2 },

  adori_blank:      { name: 'Blank Rune', words: 'adori blank', icon: '📜', voc: ['sorcerer','druid','paladin'], level: 20, mana: 50, soul: 1, type: 'conjure', conjures: { item: 'blank_rune', count: 1 }, cd: 2 },
  adori_infir_vis:  { name: 'Lightest Missile Rune', words: 'adori infir vis', icon: '📜', voc: ['sorcerer','druid','paladin'], level: 1, mana: 6, soul: 0, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'lightest_missile_rune', count: 10 }, cd: 2 },
  adori_infir_mas_tera:{ name: 'Light Stone Shower Rune', words: 'adori infir mas tera', icon: '📜', voc: ['sorcerer','druid','paladin'], level: 1, mana: 6, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'light_stone_shower_rune', count: 4 }, cd: 2 },
  adori_min_vis:    { name: 'Light Magic Missile Rune', words: 'adori min vis', icon: '📜', voc: ['sorcerer','druid'], level: 15, mana: 120, soul: 1, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'light_magic_missile_rune', count: 10 }, cd: 2 },
  adori_vis:        { name: 'Heavy Magic Missile Rune', words: 'adori vis', icon: '📜', voc: ['sorcerer','druid'], level: 25, mana: 350, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'heavy_magic_missile_rune', count: 10 }, cd: 2 },
  adori_tera:       { name: 'Stalagmite Rune', words: 'adori tera', icon: '📜', voc: ['sorcerer','druid'], level: 24, mana: 350, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'stalagmite_rune', count: 10 }, cd: 2 },
  adori_flam:       { name: 'Fireball Rune', words: 'adori flam', icon: '📜', voc: ['sorcerer'], level: 27, mana: 460, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'fireball_rune', count: 5 }, cd: 2 },
  adori_mas_flam:   { name: 'Great Fireball Rune', words: 'adori mas flam', icon: '📜', voc: ['sorcerer'], level: 30, mana: 530, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'great_fireball_rune', count: 4 }, cd: 2 },
  adori_frigo:      { name: 'Icicle Rune', words: 'adori frigo', icon: '📜', voc: ['druid'], level: 28, mana: 460, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'icicle_rune', count: 5 }, cd: 2 },
  adori_mas_frigo:  { name: 'Avalanche Rune', words: 'adori mas frigo', icon: '📜', voc: ['druid'], level: 30, mana: 530, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'avalanche_rune', count: 4 }, cd: 2 },
  adori_mas_tera:   { name: 'Stone Shower Rune', words: 'adori mas tera', icon: '📜', voc: ['druid'], level: 28, mana: 430, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'stone_shower_rune', count: 4 }, cd: 2 },
  adori_mas_vis:    { name: 'Thunderstorm Rune', words: 'adori mas vis', icon: '📜', voc: ['sorcerer'], level: 28, mana: 430, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'thunderstorm_rune', count: 4 }, cd: 2 },
  adori_san:        { name: 'Holy Missile Rune', words: 'adori san', icon: '📜', voc: ['paladin'], level: 27, mana: 300, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'holy_missile_rune', count: 5 }, cd: 2 },
  adori_gran_mort:  { name: 'Sudden Death Rune', words: 'adori gran mort', icon: '📜', voc: ['sorcerer'], level: 45, mana: 985, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'sudden_death_rune', count: 3 }, cd: 2 },
  adevo_mas_hur:    { name: 'Explosion Rune', words: 'adevo mas hur', icon: '📜', voc: ['sorcerer','druid'], level: 31, mana: 570, soul: 4, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'explosion_rune', count: 6 }, cd: 2 },
  adevo_res_flam:   { name: 'Soulfire Rune', words: 'adevo res flam', icon: '📜', voc: ['sorcerer','druid'], level: 27, mana: 420, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'soulfire_rune', count: 3 }, cd: 2 },
  adevo_mas_flam:   { name: 'Fire Bomb Rune', words: 'adevo mas flam', icon: '📜', voc: ['sorcerer','druid'], level: 27, mana: 600, soul: 4, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'fire_bomb_rune', count: 2 }, cd: 2 },
  adevo_mas_pox:    { name: 'Poison Bomb Rune', words: 'adevo mas pox', icon: '📜', voc: ['druid'], level: 25, mana: 520, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'poison_bomb_rune', count: 2 }, cd: 2 },
  adevo_mas_vis:    { name: 'Energy Bomb Rune', words: 'adevo mas vis', icon: '📜', voc: ['sorcerer'], level: 37, mana: 880, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'energy_bomb_rune', count: 2 }, cd: 2 },
  adevo_grav_flam:  { name: 'Fire Field Rune', words: 'adevo grav flam', icon: '📜', voc: ['sorcerer','druid'], level: 15, mana: 240, soul: 1, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'fire_field_rune', count: 3 }, cd: 2 },
  adevo_grav_pox:   { name: 'Poison Field Rune', words: 'adevo grav pox', icon: '📜', voc: ['sorcerer','druid'], level: 14, mana: 200, soul: 1, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'poison_field_rune', count: 3 }, cd: 2 },
  adevo_grav_vis:   { name: 'Energy Field Rune', words: 'adevo grav vis', icon: '📜', voc: ['sorcerer','druid'], level: 18, mana: 320, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'energy_field_rune', count: 3 }, cd: 2 },
  adevo_mas_grav_flam:{ name: 'Fire Wall Rune', words: 'adevo mas grav flam', icon: '📜', voc: ['sorcerer','druid'], level: 33, mana: 780, soul: 4, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'fire_wall_rune', count: 4 }, cd: 2 },
  adevo_mas_grav_pox:{ name: 'Poison Wall Rune', words: 'adevo mas grav pox', icon: '📜', voc: ['sorcerer','druid'], level: 29, mana: 640, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'poison_wall_rune', count: 4 }, cd: 2 },
  adevo_mas_grav_vis:{ name: 'Energy Wall Rune', words: 'adevo mas grav vis', icon: '📜', voc: ['sorcerer','druid'], level: 41, mana: 1000, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'energy_wall_rune', count: 4 }, cd: 2 },
  adura_gran:       { name: 'Intense Healing Rune', words: 'adura gran', icon: '📜', voc: ['druid'], level: 15, mana: 120, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'intense_healing_rune', count: 1 }, cd: 2 },
  adura_vita:       { name: 'Ultimate Healing Rune', words: 'adura vita', icon: '📜', voc: ['druid'], level: 24, mana: 400, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'ultimate_healing_rune', count: 1 }, cd: 2 },
  adana_pox:        { name: 'Cure Poison Rune', words: 'adana pox', icon: '📜', voc: ['druid'], level: 15, mana: 200, soul: 1, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'cure_poison_rune', count: 1 }, cd: 2 },
  adito_grav:       { name: 'Destroy Field Rune', words: 'adito grav', icon: '📜', voc: ['sorcerer','druid','paladin'], level: 17, mana: 120, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'destroy_field_rune', count: 3 }, cd: 2 },
  adito_tera:       { name: 'Disintegrate Rune', words: 'adito tera', icon: '📜', voc: ['sorcerer','druid','paladin'], level: 21, mana: 200, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'desintegrate_rune', count: 3 }, cd: 2 },
  adevo_grav_tera:  { name: 'Magic Wall Rune', words: 'adevo grav tera', icon: '📜', voc: ['sorcerer'], level: 32, mana: 750, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'magic_wall_rune', count: 3 }, cd: 2 },
  adana_mort:       { name: 'Animate Dead Rune', words: 'adana mort', icon: '📜', voc: ['sorcerer','druid'], level: 27, mana: 600, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'animate_dead_rune', count: 1 }, cd: 2 },
  adevo_ina:        { name: 'Chameleon Rune', words: 'adevo ina', icon: '📜', voc: ['druid'], level: 27, mana: 600, soul: 2, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'chameleon_rune', count: 1 }, cd: 2 },
  adeta_sio:        { name: 'Convince Creature Rune', words: 'adeta sio', icon: '📜', voc: ['druid'], level: 16, mana: 200, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'convince_creature_rune', count: 1 }, cd: 2 },
  adana_ani:        { name: 'Paralyze Rune', words: 'adana ani', icon: '📜', voc: ['druid'], level: 54, mana: 1400, soul: 3, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'paralyze_rune', count: 1 }, cd: 2 },
  adevo_grav_vita:  { name: 'Wild Growth Rune', words: 'adevo grav vita', icon: '📜', voc: ['druid'], level: 27, mana: 600, soul: 5, type: 'conjure', reagent: { item: 'blank_rune', count: 1 }, conjures: { item: 'wild_growth_rune', count: 2 }, cd: 2 },
  exevo_pan:        { name: 'Food', words: 'exevo pan', icon: '🍞', voc: ['druid'], level: 14, mana: 120, soul: 1, type: 'conjure', conjures: { item: 'meat', count: 1 }, cd: 2 },
};

export function isSpellAvailable(spellId, vocation, level) {
  const s = SPELLS[spellId];
  return !!(s && vocation && s.voc.includes(vocation) && level >= s.level);
}

// Cura padrão quando o jogador não escolheu nenhuma no RTC — knight não tem
// acesso a "exura" (usa a própria, exura ico), as demais vocações usam exura.
// Abaixo do nível 8 (antes de exura/exura_ico destravarem), cai pra cura de
// nível 1 do Dawnport (bruise_bane/magic_patch) em vez de mostrar cadeado.
export function defaultHealSpellId(vocation, level = 0) {
  if (level < 8) return vocation === 'knight' ? 'bruise_bane' : 'magic_patch';
  return vocation === 'knight' ? 'exura_ico' : 'exura';
}
