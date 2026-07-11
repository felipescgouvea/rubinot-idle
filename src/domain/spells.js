// Magias reais do Tibia, por vocação. O RTC auto-casta a spell de ataque e
// usa a de cura no Smart Healing (ver application/huntUseCases.js).

// `element` só existe nas de ataque — decide o efeito visual sobre o monstro
// no momento do cast (ver ui/huntPanel.js). Cura sempre usa o mesmo brilho
// verde do Tibia, então spells de heal não precisam de elemento.
//
// `area` (só nas de ataque) é a FORMA de área do Tibia — ver domain/attackAreas.js
// e .spec/15-areas-de-ataque.md. Strikes/missiles são 'single' (alvo único);
// as ondas/berserks/caldera/hell's core acertam vários alvos da sala de uma vez.
export const SPELLS = {
  // universais (exceto knight, que tem a própria cura — exura ico, abaixo)
  exura:            { name: 'Light Healing', words: 'exura', icon: '✨', voc: ['paladin','sorcerer','druid'], level: 9,  mana: 20,  type: 'heal',   power: 0.15 },
  // knight — golpe básico é alvo único; a área vem das magias exori.
  exura_ico:        { name: 'Wound Cleansing', words: 'exura ico', icon: '🩹', voc: ['knight'], level: 10, mana: 40,  type: 'heal',   power: 0.30 },
  exori:            { name: 'Berserk', words: 'exori', icon: '💢', voc: ['knight'], level: 35, mana: 115, type: 'attack', power: 1.6, element: 'physical', area: 'ball' },
  exori_mas:        { name: 'Groundshaker', words: 'exori mas', icon: '🌋', voc: ['knight'], level: 33, mana: 160, type: 'attack', power: 1.5, element: 'physical', area: 'ball' },
  exori_gran:       { name: 'Fierce Berserk', words: 'exori gran', icon: '💥', voc: ['knight'], level: 90, mana: 340, type: 'attack', power: 2.4, element: 'physical', area: 'ball' },
  // paladin — flecha/missile/spear são alvo único; Divine Caldera é a área.
  exori_con:        { name: 'Ethereal Spear', words: 'exori con', icon: '🔱', voc: ['paladin'], level: 23, mana: 25,  type: 'attack', power: 1.4, element: 'physical', area: 'single' },
  exori_san:        { name: 'Divine Missile', words: 'exori san', icon: '☄️', voc: ['paladin'], level: 40, mana: 20,  type: 'attack', power: 1.7, element: 'holy', area: 'single' },
  exevo_mas_san:    { name: 'Divine Caldera', words: 'exevo mas san', icon: '🌟', voc: ['paladin'], level: 50, mana: 160, type: 'attack', power: 1.5, element: 'holy', area: 'ball' },
  exura_san:        { name: 'Divine Healing', words: 'exura san', icon: '🙏', voc: ['paladin'], level: 35, mana: 160, type: 'heal',   power: 0.45 },
  // sorcerer — strikes alvo único; waves em onda; Hell's Core em área ampla.
  exori_flam:       { name: 'Flame Strike', words: 'exori flam', icon: '🔥', voc: ['sorcerer','druid'], level: 12, mana: 20, type: 'attack', power: 1.4, element: 'fire', area: 'single' },
  exevo_flam_hur:   { name: 'Fire Wave', words: 'exevo flam hur', icon: '🌊', voc: ['sorcerer'], level: 18, mana: 25, type: 'attack', power: 1.35, element: 'fire', area: 'wave' },
  exori_vis:        { name: 'Energy Strike', words: 'exori vis', icon: '⚡', voc: ['sorcerer'], level: 12, mana: 20,  type: 'attack', power: 1.45, element: 'energy', area: 'single' },
  exevo_vis_hur:    { name: 'Energy Wave', words: 'exevo vis hur', icon: '⚡', voc: ['sorcerer'], level: 38, mana: 170, type: 'attack', power: 1.9, element: 'energy', area: 'wave' },
  exori_gran_vis:   { name: 'Strong Energy Strike', words: 'exori gran vis', icon: '🌩️', voc: ['sorcerer'], level: 80, mana: 60, type: 'attack', power: 2.2, element: 'energy', area: 'single' },
  exevo_gran_mas_vis:{ name: "Hell's Core", words: 'exevo gran mas vis', icon: '☢️', voc: ['sorcerer'], level: 60, mana: 600, type: 'attack', power: 3.2, element: 'energy', area: 'ball' },
  // druid — strikes alvo único; waves em onda; Eternal Winter em área ampla.
  exori_frigo:      { name: 'Ice Strike', words: 'exori frigo', icon: '❄️', voc: ['druid'], level: 12, mana: 20, type: 'attack', power: 1.45, element: 'ice', area: 'single' },
  exevo_frigo_hur:  { name: 'Ice Wave', words: 'exevo frigo hur', icon: '🌊', voc: ['druid'], level: 18, mana: 25, type: 'attack', power: 1.35, element: 'ice', area: 'wave' },
  exevo_tera_hur:   { name: 'Terra Wave', words: 'exevo tera hur', icon: '🍃', voc: ['druid'], level: 38, mana: 210, type: 'attack', power: 1.9, element: 'earth', area: 'wave' },
  exori_gran_frigo: { name: 'Strong Ice Strike', words: 'exori gran frigo', icon: '🧊', voc: ['druid'], level: 80, mana: 60, type: 'attack', power: 2.2, element: 'ice', area: 'single' },
  exevo_gran_mas_frio:{ name: 'Eternal Winter', words: 'exevo gran mas frio', icon: '🌨️', voc: ['druid'], level: 60, mana: 600, type: 'attack', power: 3.2, element: 'ice', area: 'ball' },
  exura_gran:       { name: 'Intense Healing', words: 'exura gran', icon: '💚', voc: ['sorcerer','druid'], level: 20, mana: 70, type: 'heal', power: 0.35 },
  exura_vita:       { name: 'Ultimate Healing', words: 'exura vita', icon: '💖', voc: ['sorcerer','druid'], level: 30, mana: 160, type: 'heal', power: 0.60 },
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
