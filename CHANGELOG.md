# Changelog

Registro das releases feitas nesta sessão, mais recente primeiro. Cada linha tem o commit correspondente pra referência.

## 2026-07-14

- **fix** — Vender/equipar/desequipar/usar item dentro do modal da Bag fechava a Bag inteira junto; agora volta pra Bag em vez de fechar tudo (`8a24354`)
- **feat** — Linked Tasks reconstruído com as 94 tasks reais do RubinOT nas 5 salas (Lothlorien/Executioner/Morgul/Corrupted/N'Zoth): moeda Task Coin, 265 criaturas novas, 46 itens novos de recompensa, recompensa dupla (1ª vez + repetição). Salas 1 e 2 (tasks #1-40) com todas as criaturas caçáveis em zona; Salas 3-5 ainda pendentes de spawn (`87a95d3`)
- **feat** — Treino Offline mostra a estátua real de treino (Training Dummy) na escolha de skill, em vez do ícone abstrato sozinho (`571dcc5`)
- **feat** — Boss Zone: 19 zonas ganharam boss real do Tibia (confirmado via TibiaWiki) no lugar do monstro comum reaproveitado; lista ordenada por força (`af2bd83`)
- **feat** — Bag abre num modal em vez de painel fixo ao lado do Equipamento (`2f8c811`)
- **feat** — Charm Points usa o símbolo roxo real do Tibia em vez da sigla "CP"; só paga ao completar os 3 estágios do bestiário da criatura, não mais parcial (`3599ce7`)
- **fix** — Relíquia de raridade só cai no Boss Rush, nunca em caçada comum (bug: Wolf conseguia dropar Demon Shield numa hunt normal); fallback de item sem loot próprio agora tem teto de preço por tier do monstro (`6cb1e49`)
- **fix** — Botão "Ver Hunt" sempre habilitado, mesmo sem caçar (`8b5392b`)
- **fix** — Troca emoji genérico por sprite real do Tibia nos painéis restantes (Admin, Highscores, Daily Reward) (`eb02233`)
- **feat** — Botão de status da hunt dividido em "Ver Hunt" + "Trocar de Hunt" lado a lado (`3a8e5bc`)
- **feat** — Remove multiplicador de gold/xp por zona (ficava fora do padrão Tibia); corrige femor_hills (só goblins) e divide Orc Fortress em 2 hunts por força (`68a3bb1`)
- **fix** — Remove botão Close duplicado no picker do RTC; adiciona as magias de Dawnport (Buzz, Scorch, Mud Attack, Chill Out) (`2ef517d`)
- **feat** — Prioridade de ataque do RTC vira 4 caixinhas com modal, em vez de lista que crescia sem limite (`afcc3e4`)

### Acervo de sprites (sem release de código — assets)
- Scraping completo do TibiaWiki: acervo de sprites de item (`assets/item-catalog/`, categorizado por tipo) e de criatura (`assets/creature-catalog/`)
- Tentativa de extração direta do cliente RubinOT abandonada (arquivos `.spr`/`.dat` e `appearances.dat` criptografados, sem chave acessível)

## Pendências conhecidas
- Linked Tasks — Salas 3-5 (tasks #41-94): dados e recompensas corretos, mas boa parte das criaturas ainda não está em nenhuma zona de caçada (conteúdo bem endgame do Tibia — Warzone, Prison, Kilmaresh, Libraries — não implementado neste jogo)
