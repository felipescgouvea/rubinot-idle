// Cidades de Tibia — o eixo de navegação das caçadas. Cada zona (hunt) pertence
// a uma cidade (ver domain/bestiary.js: ZONES[id].city). O jogador escolhe a
// cidade e vê as hunts dela (ver ui/zonePicker.js). Os "mundos" (domain/
// progression.js) deixaram de organizar as hunts e viraram só um bônus de fundo.
// A ordem aqui é a ordem de exibição (progressão aproximada por nível).
export const CITIES = [
  { id: 'rookgaard',  name: 'Rookgaard',            icon: '🏝️', blurb: 'A ilha dos novatos — as primeiras criaturas.' },
  { id: 'thais',      name: 'Thais',                icon: '🏰', blurb: 'A capital do reino e seus arredores.' },
  { id: 'abdendriel', name: "Ab'Dendriel",          icon: '🌳', blurb: 'A cidade élfica escondida na floresta.' },
  { id: 'carlin',     name: 'Carlin',               icon: '🏹', blurb: 'A cidade do norte — amazonas e bandidos.' },
  { id: 'ankrahmun',  name: 'Ankrahmun',            icon: '⚱️', blurb: 'A cidade das tumbas, no deserto.' },
  { id: 'venore',     name: 'Venore',               icon: '🕷️', blurb: 'A cidade mercante cercada de pântano.' },
  { id: 'darashia',   name: 'Darashia',             icon: '🐉', blurb: 'O oásis no deserto de Darama.' },
  { id: 'svargrond',  name: 'Svargrond',            icon: '🧊', blurb: 'O posto avançado no gelo eterno.' },
  { id: 'porthope',   name: 'Port Hope',            icon: '🌴', blurb: 'O porto na selva de Tiquanda.' },
  { id: 'edron',      name: 'Edron',                icon: '☠️', blurb: 'O castelo cercado de mortos-vivos.' },
  { id: 'cormaya',    name: 'Cormaya',              icon: '😈', blurb: 'A ilha vulcânica dos demônios.' },
  { id: 'yalahar',    name: 'Yalahar',              icon: '🦞', blurb: 'A cidade antiga cheia de horrores.' },
  { id: 'roshamuul',  name: 'Roshamuul',            icon: '🔥', blurb: 'A prisão que segura os demônios.' },
  { id: 'zao',        name: 'Zao',                  icon: '🐲', blurb: 'As terras selvagens dos draken.' },
  { id: 'ferumbras',  name: 'Cidadela de Ferumbras', icon: '👑', blurb: 'O covil do arquimago — o fim do mundo.' },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

export function cityName(cityId) {
  const c = CITY_BY_ID[cityId];
  return c ? c.name : cityId;
}
