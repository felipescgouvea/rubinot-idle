// Nome do sprite de EFEITO real (assets/sprites/effects/<nome>.gif) de cada
// magia/runa — o mesmo que o Tibia toca no chão sobre a área atingida. A UI
// espalha esse sprite nos tiles ao redor do personagem seguindo a FORMA da
// área da magia (spell.area / rune.area) — ver ui/huntPanel.js: playAreaEffect.
//
// A maioria segue o elemento (fogo/energia/gelo/…); alguns têm efeito próprio
// no jogo (ex.: Groundshaker = o abalo de pedras marrom, não um "físico"
// genérico) e por isso têm override específico.

const ELEMENT_EFFECT = {
  fire: 'fire',
  energy: 'energy',
  ice: 'ice',
  holy: 'holy',
  earth: 'earth',
  physical: 'physical',
};

// Magias com efeito visual próprio no Tibia (diferente do "por elemento").
const SPELL_EFFECT_OVERRIDE = {
  exori_mas: 'groundshaker',       // Groundshaker — abalo de pedras no chão
  exevo_gran_mas_vis: 'fire',      // Hell's Core — grande explosão de fogo
};

const RUNE_EFFECT = {
  sudden_death_rune: 'death',
  explosion_rune: 'physical',
  avalanche_rune: 'ice',
  fireball_rune: 'fire',
  great_fireball_rune: 'fire',
};

export function spellEffectName(spellId, element) {
  return SPELL_EFFECT_OVERRIDE[spellId] || ELEMENT_EFFECT[element] || 'physical';
}
export function runeEffectName(runeId) {
  return RUNE_EFFECT[runeId] || 'physical';
}
