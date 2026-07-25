// Ícone inline (sprite real, emoji só se a imagem falhar) pro log de combate
// — usado por huntUseCases.js e inventoryUseCases.js. Extraído aqui porque
// as duas tinham CÓPIAS idênticas desta função (a application não pode
// importar de ui/*.js, então não dá pra reusar ui/shared.js: itemIconImg,
// mas as duas application/*.js podem compartilhar um helper entre si).
import { ITEMS } from '../domain/items.js?v=284';
import { MONSTERS } from '../domain/bestiary.js?v=291';
import { itemSpriteFile, monsterSpriteFile, spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=274';

// alt VAZIO de propósito: no log o ícone vem sempre colado ao nome do item
// ("<ícone> Lump of Dirt"). Com alt="<nome>", o nome saía DUAS vezes ao copiar
// o texto do log — foi o que o Felipe colou: "Lump of Dirt Lump of Dirt". Um
// ícone puramente decorativo, ao lado do próprio rótulo, deve ter alt vazio.
export function itemLogIcon(itemId) {
  const item = ITEMS[itemId];
  return spriteImgOrFallback(spriteUrl(itemSpriteFile(itemId)), '', item.icon, 'inline-icon');
}

export function monsterLogIcon(monsterId) {
  const m = MONSTERS[monsterId];
  return spriteImgOrFallback(spriteUrl(monsterSpriteFile(monsterId, m)), '', m.icon, 'inline-icon');
}
