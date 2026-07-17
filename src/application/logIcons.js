// Ícone inline (sprite real, emoji só se a imagem falhar) pro log de combate
// — usado por huntUseCases.js e inventoryUseCases.js. Extraído aqui porque
// as duas tinham CÓPIAS idênticas desta função (a application não pode
// importar de ui/*.js, então não dá pra reusar ui/shared.js: itemIconImg,
// mas as duas application/*.js podem compartilhar um helper entre si).
import { ITEMS } from '../domain/items.js?v=138';
import { MONSTERS } from '../domain/bestiary.js?v=138';
import { itemSpriteFile, monsterSpriteFile, spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=129';

export function itemLogIcon(itemId) {
  const item = ITEMS[itemId];
  return spriteImgOrFallback(spriteUrl(itemSpriteFile(itemId)), item.name, item.icon, 'inline-icon');
}

export function monsterLogIcon(monsterId) {
  const m = MONSTERS[monsterId];
  return spriteImgOrFallback(spriteUrl(monsterSpriteFile(monsterId, m)), m.name, m.icon, 'inline-icon');
}
