// Ícones do "chrome" da UI (abas, cabeçalhos, botões) — sprites pixel-art reais
// do TibiaWiki, a MESMA linguagem visual do conteúdo do jogo (itens/monstros/
// vitais), em vez de emoji do sistema operacional. Emoji muda de desenho por SO
// (Segoe no Windows, Apple no Mac...) e destoa do pixel art ao lado — dando o ar
// "genérico" que a gente quer evitar. Aqui fica a FONTE ÚNICA das escolhas de
// ícone do chrome: mudar o sprite de um conceito num lugar só reflete em toda a
// UI que usa uiIcon()/data-icon. O emoji continua como fallback gracioso (mesmo
// mecanismo de spriteImgOrFallback dos ícones de conteúdo — ver tibiaSprites.js).
import { spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=312';

// conceito do chrome -> { sprite real do TibiaWiki, emoji de fallback }
// Escolhas: objeto canônico do Tibia que melhor representa cada área.
export const UI_ICONS = {
  hunt:       { file: 'items/Target_Board.webp',         emoji: '🎯' }, // alvo de caça (Map parecia envelope)
  rtc:        { file: 'items/Wand_of_Cosmic_Energy.webp', emoji: '🪄' }, // varinha = auto-cast (distinto do livro de Spells)
  spells:     { file: 'items/Spellbook.webp',            emoji: '📖' }, // livro de magias (era duplicado no RTC)
  tasks:      { file: 'items/Scroll.webp',               emoji: '📜' }, // pergaminho de tarefa
  skills:     { file: 'skills/Sword_Fighting_Icon.webp', emoji: '⚡' },
  training:   { file: 'skills/Training_Dummy.gif',       emoji: '🏋️' }, // boneco de treino real
  bestiary:   { file: 'items/Book_Brown.webp',           emoji: '📖' }, // tomo de criaturas
  // Prêmios de Arena/Battle Pass (ver application/rewardGrants.js) — sprite
  // real do Tibia pra cada tipo, nada de emoji genérico.
  rw_xp:        { file: 'vitals/Experience_Icon.webp',   emoji: '⭐' },
  rw_loot:      { file: 'ui/prey-loot.png',              emoji: '🍀' },
  rw_gold:      { file: 'items/Gold_Coin.webp',          emoji: '💰' },
  rw_charm:     { file: 'currency/Charm_Points_Icon.gif', emoji: '🔮' },
  rw_preyCard:  { file: 'ui/prey-card.png',              emoji: '🎴' },
  rw_trainWand: { file: 'skills/Training_Dummy.gif',     emoji: '🪄' },
  arena:      { file: 'items/Arena_Badge.webp',          emoji: '🏟️' }, // emblema da arena (item real)
  bossrush:   { file: 'items/Demon_Skull.webp',          emoji: '💀' }, // caveira de demônio
  worlds:     { file: 'items/Compass.webp',              emoji: '🌍' },
  battlepass: { file: 'items/Medal_of_Honour.webp',      emoji: '🎖️' }, // medalha
  shop:       { file: 'items/Gold_Pouch.webp',           emoji: '🛒' }, // bolsa de ouro
  market:     { file: 'items/Parcel.webp',               emoji: '🏪' }, // encomenda (troca entre players)
  highscores: { file: 'items/Golden_Goblet.webp',        emoji: '🏆' }, // troféu

  // conceitos que só aparecem em cabeçalhos de painel / botões (não têm aba própria)
  analyzer:        { file: 'items/Abacus.webp',                emoji: '📊' }, // Hunt Analyzer (contagem/estatística)
  blessings:       { file: 'items/Blessed_Ankh.webp',         emoji: '🛡️' }, // bênçãos
  equipment:       { file: 'items/Warrior_Helmet.webp',       emoji: '⚔️' },
  training_online: { file: 'skills/Sword_Fighting_Icon.webp', emoji: '⚔️' }, // treino ativo
  prey:            { file: 'items/Wolf_Paw.webp',             emoji: '🐾' },
  charms:          { file: 'currency/Charm_Points_Icon.gif',  emoji: '✨' }, // símbolo real de charm
  boosted:         { file: 'items/Torch.webp',                emoji: '🔥' }, // boosted do dia (chama)
  daily:           { file: 'items/Reward_Box.webp',           emoji: '🎁' }, // recompensa diária

  // toggles de estilo de luta — ÍCONES AUTÊNTICOS do client (OTClient, MIT).
  // Ver assets/sprites/ui/CREDITS.txt. Sheet de 2 estados recortada pro normal.
  fm_attack:       { file: 'ui/fight-offensive.png',          emoji: '⚔️' },
  fm_balanced:     { file: 'ui/fight-balanced.png',           emoji: '⚖️' },
  fm_defense:      { file: 'ui/fight-defensive.png',          emoji: '🛡️' },
  // toggles de densidade — nº de alvos: 1 / 2 / 3 cabeças de monstro (ícone do
  // OTClient) — single target / normal / double. Ver assets/sprites/ui/CREDITS.txt.
  dens_solo:       { file: 'ui/dens-solo.png',                emoji: '🎯' },
  dens_normal:     { file: 'ui/dens-normal.png',              emoji: '👥' },
  dens_pack:       { file: 'ui/dens-pack.png',                emoji: '🐝' },

  // labels de conteúdo (Hunt Analyzer etc.)
  kills:           { file: 'items/Demon_Skull.webp',          emoji: '💀' },

  // charms — ÍCONES REAIS do Tibia (OTClient charm_runes, mapeados pelo enum
  // charmRune_t: wound=0, enflame=1, scavenge=13, gut=14, divine=16, vamp=17).
  charm_wound:     { file: 'ui/charm-wound.png',              emoji: '🩸' },
  charm_enflame:   { file: 'ui/charm-enflame.png',            emoji: '🔥' },
  charm_scavenge:  { file: 'ui/charm-scavenge.png',           emoji: '🍀' },
  charm_gut:       { file: 'ui/charm-gut.png',                emoji: '💰' },
  charm_divine:    { file: 'ui/charm-divine.png',             emoji: '⭐' },
  charm_vampiric:  { file: 'ui/charm-vampiric.png',           emoji: '🧛' },
  // bônus de prey — ícones autênticos do Prey do client
  prey_damage:     { file: 'ui/prey-damage.png',              emoji: '⚔️' },
  // Defesa é o 4º bônus de prey do Tibia (ver domain/prey.js). Não temos a
  // sprite própria dele; reusa o escudo da postura defensiva, que é o mesmo
  // ícone de "defesa" do cliente — melhor que apontar pra um arquivo que não
  // existe e tomar 404 a cada render.
  prey_defense:    { file: 'ui/fight-defensive.png',          emoji: '🛡️' },
  prey_xp:         { file: 'ui/prey-xp.png',                  emoji: '⭐' },
  prey_loot:       { file: 'ui/prey-loot.png',                emoji: '🍀' },

  // janela de batalha: título + categorias do log de combate
  battle:          { file: 'items/Sword.webp',                emoji: '⚔️' },
  log_combat:      { file: 'items/Sword.webp',                emoji: '⚔️' },
  log_spells:      { file: 'items/Sudden_Death_Rune.webp',    emoji: '🗣️' }, // magia (runa)
  log_supplies:    { file: 'items/Health_Potion.webp',        emoji: '🧪' }, // suprimentos (poção)
  log_loot:        { file: 'items/Backpack.webp',             emoji: '📦' }, // loot (mochila)
  // Obs.: densidade (solo/normal/pack) usa sprite de item porque não tem objeto
  // nem no client (é mecânica só deste idle); fight-mode já usa o ícone REAL do
  // client (ver acima).

  // botões do topo / barra do personagem
  outfit:          { file: 'items/Doublet.webp',              emoji: '👕' },
  imbue:           { file: 'items/Blue_Gem.webp',             emoji: '🔮' }, // imbuement (gema)
  achievements:    { file: 'items/Crown.webp',                emoji: '🏆' }, // conquistas/prestígio

  // cards de vocação: a arma-assinatura de cada uma (mesma linguagem de item)
  voc_knight:      { file: 'items/Fire_Sword.webp',           emoji: '🛡️' }, // melee
  voc_paladin:     { file: 'items/Bow.webp',                  emoji: '🏹' }, // distância
  voc_sorcerer:    { file: 'items/Wand_of_Inferno.webp',      emoji: '🔮' }, // wand ofensiva
  voc_druid:       { file: 'items/Snakebite_Rod.webp',        emoji: '🌿' }, // rod de suporte
};

// Ícones CUSTOM (SVG desenhado à mão, no estilo do favicon: ouro + contorno
// escuro) pra conceitos que NÃO têm objeto equivalente no Tibia — o jogo
// original não tem "iniciar/parar caçada" (é mecânica de idle), então não há
// sprite pra reaproveitar e o ▶/⏹ do SO destoava. `kind` = 'play' | 'stop'.
export function huntToggleIcon(kind) {
  const gid = kind === 'stop' ? 'htStop' : 'htPlay';
  const shape = kind === 'stop'
    ? `<rect x="5.5" y="5.5" width="13" height="13" rx="2.6" fill="url(#${gid})" stroke="#1c1206" stroke-width="1.7"/>`
    : `<path d="M6.6 3.8 L20.4 12 L6.6 20.2 Z" fill="url(#${gid})" stroke="#1c1206" stroke-width="1.7" stroke-linejoin="round"/>`;
  return `<svg class="ht-icon" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe491"/><stop offset=".55" stop-color="#f3b13a"/><stop offset="1" stop-color="#e2871a"/></linearGradient></defs>${shape}</svg>`;
}

// Conceitos SEM objeto no Tibia que ganham um ícone CUSTOM (SVG à mão, estilo
// favicon) em vez de emoji do SO. `settings`/`admin` = engrenagem — o Tibia não
// tem item de engrenagem, então é desenhado. Fill dourado sólido (sem gradiente)
// de propósito: o ícone aparece em 2+ lugares e ids de gradiente duplicados
// conflitariam. `cls` = classe de contexto (tab-icon/btn-icon) só pra herança.
const CUSTOM_SVG = {
  settings: (cls) => `<svg class="${cls} gear-svg" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#1c1206" stroke-width="1.3" fill="#efb43a"><rect x="10.4" y="1.7" width="3.2" height="4.9" rx="1"/><rect x="10.4" y="17.4" width="3.2" height="4.9" rx="1"/><rect x="1.7" y="10.4" width="4.9" height="3.2" rx="1"/><rect x="17.4" y="10.4" width="4.9" height="3.2" rx="1"/><g transform="rotate(45 12 12)"><rect x="10.4" y="1.7" width="3.2" height="4.9" rx="1"/><rect x="10.4" y="17.4" width="3.2" height="4.9" rx="1"/><rect x="1.7" y="10.4" width="4.9" height="3.2" rx="1"/><rect x="17.4" y="10.4" width="4.9" height="3.2" rx="1"/></g><circle cx="12" cy="12" r="6.7"/></g><circle cx="12" cy="12" r="2.5" fill="#2a1c10"/></svg>`,
};

// Markup do ícone: sprite real + fallback emoji (se a imagem falhar/não existir).
// `cls` é a classe de contexto que dimensiona a imagem (ex.: 'tab-icon').
// Ícone do prêmio de Arena/Battle Pass a partir do descritor da recompensa
// (ver domain/progression.js). Boost usa o ícone do que ele multiplica.
export function rewardIcon(r, cls = '') {
  if (!r) return '';
  const id = r.type === 'boost' ? `rw_${r.boost}` : `rw_${r.type}`;
  return uiIcon(id, cls) || r.icon || '';
}

export function uiIcon(id, cls = '') {
  if (CUSTOM_SVG[id]) return CUSTOM_SVG[id](cls);
  const ic = UI_ICONS[id];
  if (!ic) return '';
  return spriteImgOrFallback(spriteUrl(ic.file), id, ic.emoji, cls);
}

// Injeta o ícone real em todo elemento estático marcado com [data-icon] (as abas
// da navegação no index.html). Idempotente — chamado uma vez no boot (main.js).
// O elemento pode sobrescrever a classe de dimensionamento via [data-icon-class].
export function applyDataIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconApplied) return;
    const html = uiIcon(el.dataset.icon, el.dataset.iconClass || 'tab-icon');
    if (!html) return;
    el.insertAdjacentHTML('afterbegin', html);
    el.dataset.iconApplied = '1';
  });
}
