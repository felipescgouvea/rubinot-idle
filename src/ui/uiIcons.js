// Ícones do "chrome" da UI (abas, cabeçalhos, botões) — sprites pixel-art reais
// do TibiaWiki, a MESMA linguagem visual do conteúdo do jogo (itens/monstros/
// vitais), em vez de emoji do sistema operacional. Emoji muda de desenho por SO
// (Segoe no Windows, Apple no Mac...) e destoa do pixel art ao lado — dando o ar
// "genérico" que a gente quer evitar. Aqui fica a FONTE ÚNICA das escolhas de
// ícone do chrome: mudar o sprite de um conceito num lugar só reflete em toda a
// UI que usa uiIcon()/data-icon. O emoji continua como fallback gracioso (mesmo
// mecanismo de spriteImgOrFallback dos ícones de conteúdo — ver tibiaSprites.js).
import { spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=142';

// conceito do chrome -> { sprite real do TibiaWiki, emoji de fallback }
// Escolhas: objeto canônico do Tibia que melhor representa cada área.
export const UI_ICONS = {
  hunt:       { file: 'items/Map.webp',                  emoji: '🗺️' }, // mapa das hunts
  rtc:        { file: 'items/Spellbook.webp',            emoji: '🖥️' }, // config de auto-cast
  tasks:      { file: 'items/Scroll.webp',               emoji: '📜' }, // pergaminho de tarefa
  skills:     { file: 'skills/Sword_Fighting_Icon.webp', emoji: '⚡' },
  training:   { file: 'skills/Training_Dummy.gif',       emoji: '🏋️' }, // boneco de treino real
  bestiary:   { file: 'items/Book_Brown.webp',           emoji: '📖' }, // tomo de criaturas
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

  // janela de batalha: título + categorias do log de combate
  battle:          { file: 'items/Sword.webp',                emoji: '⚔️' },
  log_combat:      { file: 'items/Sword.webp',                emoji: '⚔️' },
  log_spells:      { file: 'items/Sudden_Death_Rune.webp',    emoji: '🗣️' }, // magia (runa)
  log_supplies:    { file: 'items/Health_Potion.webp',        emoji: '🧪' }, // suprimentos (poção)
  log_loot:        { file: 'items/Backpack.webp',             emoji: '📦' }, // loot (mochila)
  // Obs.: os toggles de estilo de luta (ofensivo/equilibrado/defensivo) e de
  // densidade (solo/normal/pack) seguem com emoji de propósito — são conceitos
  // de mecânica abstratos, sem objeto canônico no Tibia; um sprite ali seria
  // inventado e menos legível como botão de alternância.

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

// Markup do ícone: sprite real + fallback emoji (se a imagem falhar/não existir).
// `cls` é a classe de contexto que dimensiona a imagem (ex.: 'tab-icon').
export function uiIcon(id, cls = '') {
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
