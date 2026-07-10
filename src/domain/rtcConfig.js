// Configuração do RTC (Rubinot Custom Client) — automação de combate, baseada
// no RTCaster real do RubinOT: uma forma de ataque automático (spell OU
// runa) e cura automática por spell E por poção, cada uma com seu próprio
// gatilho de % de HP (mesma estrutura das abas "RTCaster"/"Healing" do
// client real — ver .spec/14-spells-e-rtc.md).
export function createDefaultRtc() {
  return {
    attackType: null,        // 'spell' | 'rune' | null
    attackSpell: null,
    attackRune: null,
    healSpell: null,         // null = usa exura (cura básica) como padrão
    healSpellThreshold: 40,  // % de HP pra castar a spell de cura
    healPotion: null,
    healPotionThreshold: 25, // % de HP pra beber a poção (mais tardia, de emergência)
  };
}
