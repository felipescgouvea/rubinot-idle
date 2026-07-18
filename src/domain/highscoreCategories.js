// Categorias do ranking global (Highscores): nível do personagem, cada uma
// das 7 skills reais do Tibia (ver domain/character.js: TIBIA_SKILLS) e o
// progresso no bestiário. `column` é a coluna do Supabase que ordena aquela
// categoria (ver server/src/index.js: GET /highscores) —
// mesma tabela rubinot_idle_scores pra todas, só muda o ORDER BY.
export const HIGHSCORE_CATEGORIES = [
  { key: 'level',     column: 'level',           icon: '⭐', labelKey: 'highscores.catLevel' },
  { key: 'magic',     column: 'skill_magic',     icon: '🔮', labelKey: 'highscores.catMagic' },
  { key: 'fist',      column: 'skill_fist',      icon: '👊', labelKey: 'highscores.catFist' },
  { key: 'club',      column: 'skill_club',      icon: '🏏', labelKey: 'highscores.catClub' },
  { key: 'sword',     column: 'skill_sword',     icon: '⚔️', labelKey: 'highscores.catSword' },
  { key: 'axe',       column: 'skill_axe',       icon: '🪓', labelKey: 'highscores.catAxe' },
  { key: 'distance',  column: 'skill_distance',  icon: '🏹', labelKey: 'highscores.catDistance' },
  { key: 'shielding', column: 'skill_shielding', icon: '🛡️', labelKey: 'highscores.catShielding' },
  { key: 'bestiary',  column: 'bestiary_count',  icon: '📖', labelKey: 'highscores.catBestiary' },
];

export function highscoreCategory(key) {
  return HIGHSCORE_CATEGORIES.find(c => c.key === key) || HIGHSCORE_CATEGORIES[0];
}
