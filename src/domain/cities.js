// Cidades de Tibia — o eixo de navegação das caçadas. Cada zona (hunt) pertence
// a uma cidade (ver domain/bestiary.js: ZONES[id].city). O jogador escolhe a
// cidade e vê as hunts dela (ver ui/zonePicker.js). Os "mundos" (domain/
// progression.js) deixaram de organizar as hunts e viraram só um bônus de fundo.
// A ordem aqui é a ordem de exibição (progressão aproximada por nível).
// `name` é o nome real de Tibia — não muda por idioma (mesmo em português os
// jogadores dizem "Thais", "Carlin" etc). `blurb` é texto original deste jogo
// (não é canônico de Tibia), então vira chave de tradução (ver ui/zonePicker.js
// e i18n/locales/*.js: city.<id>) em vez de string literal.
export const CITIES = [
  { id: 'rookgaard',  name: 'Rookgaard',            icon: '🏝️', blurb: 'city.rookgaard' },
  { id: 'dawnport',   name: 'Dawnport',              icon: '🌅', blurb: 'city.dawnport' },
  { id: 'thais',      name: 'Thais',                icon: '🏰', blurb: 'city.thais' },
  { id: 'abdendriel', name: "Ab'Dendriel",          icon: '🌳', blurb: 'city.abdendriel' },
  { id: 'carlin',     name: 'Carlin',               icon: '🏹', blurb: 'city.carlin' },
  { id: 'ankrahmun',  name: 'Ankrahmun',            icon: '⚱️', blurb: 'city.ankrahmun' },
  { id: 'venore',     name: 'Venore',               icon: '🕷️', blurb: 'city.venore' },
  { id: 'darashia',   name: 'Darashia',             icon: '🐉', blurb: 'city.darashia' },
  { id: 'svargrond',  name: 'Svargrond',            icon: '🧊', blurb: 'city.svargrond' },
  { id: 'porthope',   name: 'Port Hope',            icon: '🌴', blurb: 'city.porthope' },
  { id: 'edron',      name: 'Edron',                icon: '☠️', blurb: 'city.edron' },
  { id: 'cormaya',    name: 'Cormaya',              icon: '😈', blurb: 'city.cormaya' },
  { id: 'yalahar',    name: 'Yalahar',              icon: '🦞', blurb: 'city.yalahar' },
  { id: 'roshamuul',  name: 'Roshamuul',            icon: '🔥', blurb: 'city.roshamuul' },
  { id: 'zao',        name: 'Zao',                  icon: '🐲', blurb: 'city.zao' },
  { id: 'ferumbras',  name: 'Ferumbras Citadel',    icon: '👑', blurb: 'city.ferumbras' },
];

const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

export function cityName(cityId) {
  const c = CITY_BY_ID[cityId];
  return c ? c.name : cityId;
}

// Fiel ao Tibia global: personagem novo fica preso na ilha inicial (Rookgaard)
// até nível 8 — só então pode viajar pro mainland (ver ui/zonePicker.js: cityCard).
export const ROOKGAARD_LEVEL_CAP = 8;

export function isCityUnlocked(cityId, level) {
  return cityId === 'rookgaard' || level >= ROOKGAARD_LEVEL_CAP;
}
