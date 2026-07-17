// Construção de caminhos de sprite. Todas as sprites foram baixadas do
// TibiaWiki e são servidas localmente (assets/sprites/), pra não depender da
// disponibilidade do CDN externo em tempo de jogo — ver .spec/90-regras-de-negocio-gerais.md.
// O nome do arquivo ainda segue a convenção do TibiaWiki (histórico de onde veio),
// mas o conteúdo real baixado é WebP; todo consumidor mantém fallback gracioso
// pro ícone (ver ui/*, o onerror da <img>) pra qualquer sprite que não exista localmente.

const SPRITE_BASE = 'assets/sprites/';

function localName(file) {
  return file.replace(/\.[^.]+$/, '.webp');
}

// bosses exclusivos do RubinOT não existem no Tibia — usam sprites temáticos
export const SPRITE_OVERRIDE = {
  lothlorien: 'Elf_Arcanist.gif',
  executioner: 'Orc_Warlord.gif',
  morgul: 'Spectre.gif',
  corrupted_one: 'Blightwalker.gif',
  nzoth: 'World_Devourer.gif',
};

// ?sv (sprite version) força o navegador a re-baixar quando o CONTEÚDO dos
// sprites de monstro muda mantendo o nome do arquivo (ex.: normalização de
// enquadramento — recorte do transparente + re-quadrado). Bumpe ao reprocessar.
// v2: sprites re-baixados como WebP ANIMADO (preservando os frames de
// caminhada do TibiaWiki) em vez do frame único estático anterior.
// v3: cada sprite recortado no bounding-box real (união de todos os frames,
// não só o primeiro) e recentralizado num canvas 64x64 comum, preenchendo
// ~82% dele — antes o canvas nativo variava (32/64px) e o preenchimento
// real ia de ~31% a ~107%, fazendo bichos de porte igual aparecerem em
// tamanhos bem diferentes lado a lado (cena/Battle List).
// v4: unsharp mask (libvips sharpen) em cada frame — o CDN da Fandom só serve
// WebP animado com compressão COM perda (VP8 lossy; testado até com origin
// MISS e Accept:image/gif, sempre volta webp), o que deixava o pixel art
// borrado comparado ao WebP estático antigo (esse sim lossless/VP8L). Não dá
// pra recuperar detalhe perdido na compressão, só reduzir a sensação de
// borrão — reencodado como WebP lossless pra não perder mais nada por cima.
const MONSTER_SPRITE_VER = 4;
export function monsterSpriteFile(monsterId, monster) {
  const file = SPRITE_OVERRIDE[monsterId] || (monster.name.replace(/ /g, '_') + '.gif');
  return 'monsters/' + localName(file) + '?sv=' + MONSTER_SPRITE_VER;
}

// Itens cujo id não deriva o nome real do arquivo no TibiaWiki (o id ficou
// em inglês mas diferente do nome oficial do item).
const ITEM_SPRITE_OVERRIDE = {
  // O "bag" inicial usa a sprite real da Backpack do Tibia (a mochila), não o
  // ícone genérico de bolsinha — é o container que o jogador abre pra ver o loot.
  bag: 'Backpack.gif',
  worm_dirt: 'Lump_of_Dirt.gif',
  // "Dragon Scale" é uma página de desambiguação no TibiaWiki (não existe um
  // item genérico "Dragon Scale") — a variante correspondente ao drop do
  // Dragon comum é a "Green Dragon Scale".
  dragon_scale: 'Green_Dragon_Scale.gif',
  // "Robe" também não existe como item genérico — só variantes nomeadas
  // (Red Robe, Purple Robe, etc.). Red Robe é a mais antiga/reconhecível.
  robe: 'Red_Robe.gif',
  // Loot exclusivo dos 5 bosses RubinOT — não existem no Tibia real (mesmo
  // caso dos bosses em si, ver SPRITE_OVERRIDE acima), então usam a sprite
  // real de um item temático equivalente em vez de cair no emoji genérico.
  rubini_shard: 'Shard.gif',
  lothlorien_bow: 'Elvish_Bow.gif',
  executioner_axe: 'Headchopper.gif',
  morgul_blade: 'Soulcutter.gif',
  corrupted_heart: 'Rotten_Heart.gif',
  nzoth_tentacle: 'Tentacle_of_the_Deep_Terror.gif',
};

// Toda entrada de ITEMS usa um id em inglês (mesmo quando o "name" exibido ao
// jogador está em português) — então dá pra derivar o nome de arquivo do
// TibiaWiki diretamente do id, sem precisar de uma tabela manual por item.
// Preposições curtas ficam minúsculas (convenção do wiki: "Boots_of_Haste.gif").
const LOWERCASE_WORDS = new Set(['of', 'the', 'and']);
function idToTibiaFilename(id) {
  return id.split('_')
    .map((word, i) => (i > 0 && LOWERCASE_WORDS.has(word)) ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('_') + '.gif';
}

export function itemSpriteFile(itemId) {
  const file = ITEM_SPRITE_OVERRIDE[itemId] || idToTibiaFilename(itemId);
  return 'items/' + localName(file);
}

export function spriteUrl(file) {
  return SPRITE_BASE + file;
}

// Cache de sprites que já falharam (404/503/etc.) — sem isso, toda vez que um
// painel reabre ou re-renderiza (ex.: o polling de reconciliação do servidor
// de caçada, a cada ~5s), o navegador tenta a MESMA imagem quebrada de novo,
// gerando um "pisca-pisca" entre o ícone quebrado e o emoji de fallback em
// vez de assentar direto no emoji. Chave = URL final do sprite (não o id),
// então serve genericamente pra item/monstro/skill/spell/outfit/etc.
const failedSprites = new Set();
function isSpriteFailed(url) { return failedSprites.has(url); }
export function markSpriteFailed(url) { failedSprites.add(url); }
// Exposto global pra o onerror inline (atributo HTML, roda no escopo global)
// conseguir registrar a falha antes de trocar pelo emoji.
if (typeof window !== 'undefined') window.__markSpriteFailed = markSpriteFailed;

// Monta o par <img onerror=fallback>/<span> comum a todo ícone de conteúdo do
// jogo: se a URL já falhou antes nesta sessão, nem tenta de novo — vai direto
// pro emoji. Senão, tenta a imagem real e registra a falha (pro futuro) se
// ela quebrar. `cls` vai tanto na <img> (+ "tibia-icon") quanto no <span>.
export function spriteImgOrFallback(url, alt, emoji, cls = '') {
  if (isSpriteFailed(url)) return `<span class="${cls}">${emoji}</span>`;
  return `<img src="${url}" alt="${alt}" class="${cls} tibia-icon"
    onerror="window.__markSpriteFailed && window.__markSpriteFailed('${url}'); this.outerHTML='<span class=&quot;${cls}&quot;>${emoji}</span>'" />`;
}

// Ícones de skill: arquivo real do Tibia (nome não deriva do id da skill,
// por isso é uma tabela em vez de convenção — ver domain/character.js).
const SKILL_ICON_FILES = {
  magic: 'Magic_Level_Icon.png',
  fist: 'Fist_Fighting_Icon.png',
  club: 'Club_Fighting_Icon.png',
  sword: 'Sword_Fighting_Icon.png',
  axe: 'Axe_Fighting_Icon.png',
  distance: 'Distance_Fighting_Icon.png',
  shielding: 'Shielding_Icon.png',
};
export function skillIconFile(skillId) {
  return 'skills/' + localName(SKILL_ICON_FILES[skillId]);
}

// Estátua/boneco real de treino do Tibia (Training Dummy) — mostrado na
// escolha de skill do Treino Offline em vez do ícone abstrato da skill,
// igual ao Tibia real (onde cada boneco de treino é um objeto físico no
// depot). O Tibia real não tem um boneco DISTINTO por skill (todas usam o
// mesmo modelo de Training Dummy), então é a mesma sprite pras 7 skills.
export const TRAINING_DUMMY_FILE = 'skills/Training_Dummy.gif';

// Ícone de magia: cada spell tem sua própria sprite no TibiaWiki, nomeada
// pelo nome em inglês da magia (ex.: "Light Healing" -> Light_Healing.gif).
export function spellIconFile(spellName) {
  return 'spells/' + localName(spellName.replace(/ /g, '_') + '.gif');
}

// Vitais do personagem (HP/Mana/XP) — sprites reais da janela de status do Tibia.
export const VITAL_ICON_FILES = {
  hp: 'vitals/Hit_Points_Icon.webp',
  mana: 'vitals/Mana_Icon.webp',
  xp: 'vitals/Experience_Icon.webp',
};

// Sprite REAL de efeito de combate (assets/sprites/effects/<nome>.gif),
// mantido ANIMADO. A UI espalha esse sprite nos tiles ao redor do personagem
// conforme a forma da área da magia (ver ui/huntPanel.js: playAreaEffect e
// domain/combatFx.js pro nome por magia/runa).
const EFFECT_NAMES = new Set(['fire','energy','ice','holy','physical','death','earth','groundshaker','blood','hitarea']);
// ?ev (effect version) força o navegador a re-baixar quando o CONTEÚDO de um
// sprite de efeito muda mantendo o nome (ex.: groundshaker trocado do ícone
// pela animação real do efeito). Bumpe ao reprocessar um efeito.
const EFFECT_SPRITE_VER = 2;
export function effectSpriteFile(name) {
  return name && EFFECT_NAMES.has(name) ? 'effects/' + name + '.gif?ev=' + EFFECT_SPRITE_VER : null;
}

// Sprite REAL de PROJÉTIL/missile do Tibia (assets/sprites/missiles/<nome>.webp):
// a flecha/virote/spear do arco e o "raio" elemental da wand/rod que VOAM do
// personagem até o alvo. A UI anima esse sprite atravessando a cena (ver
// ui/huntPanel.js: playProjectile). Nome derivado da arma/munição/elemento em
// domain/combatFx.js (basicAttackMissile).
// Eram .gif originalmente, mas cada um era na verdade um WEBP ANIMADO de
// vários frames (voo + acúmulo de flechas + explosão de impacto, como no
// client real do Tibia) — como aqui o próprio JS já controla a posição/
// rotação/duração do voo via CSS, deixar o navegador tocar essa animação por
// conta própria ficava fora de sincronia com o voo real, mostrando ora 1
// flecha, ora 2-3 acumuladas, ora o frame de explosão (bug reportado pelo
// Felipe). Substituídos por um frame ÚNICO estático (o frame 0, recortado
// sem a margem transparente) — sempre a mesma imagem de "1 flecha" em
// qualquer ataque.
const MISSILE_NAMES = new Set(['arrow', 'bolt', 'spear', 'energy', 'fire', 'ice', 'earth', 'death', 'holy']);
const MISSILE_SPRITE_VER = 1;
export function missileSpriteFile(name) {
  return name && MISSILE_NAMES.has(name) ? 'missiles/' + name + '.webp?mv=' + MISSILE_SPRITE_VER : null;
}

// Moedas: Gold Coin é item real (ver domain/items.js: gold_coin). Rubini Coin
// é moeda premium exclusiva deste jogo idle — não existe em Tibia/RubinOT,
// então usa a sprite real mais próxima em conceito (Tibia Coin, a moeda
// premium oficial) em vez de um emoji genérico.
export const RUBINI_COIN_FILE = 'currency/Tibia_Coin.webp';

// Charm Points: símbolo roxo real do Tibia (o mesmo ícone da barra de status
// do cliente), em vez da sigla genérica "CP".
export const CHARM_POINTS_ICON_FILE = 'currency/Charm_Points_Icon.gif';

// Task Coin: moeda das Linked Tasks (RubinOT). Não existe página "Task Coin"/
// "Task Point" no TibiaWiki (é uma moeda exclusiva de servidor OT, não do
// Tibia oficial) — usa como fallback razoável a arte do Gold Token real do
// Tibia (mesmo conceito visual: ficha/token dourado de recompensa de conteúdo
// endgame), em vez de cair no emoji genérico.
export const TASK_COIN_FILE = 'currency/Task_Coin.webp';
