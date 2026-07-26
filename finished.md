# Entregas (finished) — log append-only do `/backlog` e `/fix`

Uma linha por entrega. `/test` lê as linhas sem carimbo, testa, e anexa `✅`/`🐛` no fim.

- 2026-07-26 — fix(loja): comprar munição em lote respeita a quantidade selecionada (era sempre 1) — `fa3ae3ac` — ✅ testado 2026-07-26 (probe-shop-ammo + smoke-prod, 0 erros)
- 2026-07-26 — feat(ux): selo de "resgatável" nas abas Tasks e Battle Pass (P1.5) — `094902a9` — ✅ testado 2026-07-26 (probe-tab-badges + smoke-prod, 0 erros)
- 2026-07-26 — feat(ux): Boosted Creature clicável → abre o zone picker da criatura (P1.5) — `08ad171b` — 🐛 BUG 2026-07-26 (defects.md: inerte pra criatura não-huntável) → corrigido por `673f522f`
- 2026-07-26 — fix(boosted): pool da Boosted Creature restrito a criaturas huntáveis (CTA sempre acha a zona) — `673f522f` — ✅ testado 2026-07-26 (probe-boosted-cta: clicável, abre modal, 0 erros + smoke-prod)
- 2026-07-26 — style(rail): cor de canal por vital (outline colorido HP/MP/XP) — `fb718c4e` — ✅ testado 2026-07-26 (screenshot shot-rail-vitals nos 2 temas: halos vermelho/azul/dourado nítidos)
- 2026-07-26 — style(loja): botões de compra em dourado (era verde, destoava do tema) — `869cebe4` — ✅ testado 2026-07-26 (screenshot shot-shop: Loja coesa navy/dourado + smoke-prod)
- 2026-07-26 — style(item): janela de detalhe temada (botões dourado/bronze/neutro) — `455dd0e5` — ✅ testado 2026-07-26 (screenshot item-modal 2 temas + smoke implícito)
- 2026-07-26 — fix(inventário): Fechar/clique-fora no detalhe do item volta pra Bag (não fecha tudo) + relíquia temada — `fb386e67` — ✅ testado 2026-07-26 (probe-item-close: da Bag→Bag, Bag→fecha, fora→fecha, 0 erros)
- 2026-07-26 — feat(a11y): modais com role=dialog, Escape fecha e gestão de foco — `f6fbaf20` — 🐛 BUG 2026-07-26 (defects.md: Escape double-fire fechava tudo) → corrigido por `11a140ef`
- 2026-07-26 — fix(a11y): Escape usa dismissModal (handler único), remove listener duplicado — `11a140ef` — ✅ testado 2026-07-26 (probe-modal-a11y: role=dialog, Escape fecha, Escape no detalhe→Bag, 0 erros)
- 2026-07-26 — feat(a11y): tablist ARIA nas abas (role tablist/tab/tabpanel + aria-selected) — `eec967be` — ✅ testado 2026-07-26 (probe-tablist-a11y: roles ok, aria-selected troca no clique, 0 erros)
- 2026-07-26 — perf(a11y): decoding=async nos <img> avulsos (helper já tinha) — `97984cd4` — ✅ testado 2026-07-26 (smoke-prod: sobe frio/quente/cache, 0 erros)
- 2026-07-26 — refactor(loja): remove dead-code de outfit no shopPanel — `f9f38733` — ✅ testado 2026-07-26 (probe-shop-ammo + smoke-prod, Loja idêntica, 0 erros)
- 2026-07-26 — feat(bestiário): progresso ao vivo na aba aberta (listener de KILL_COUNTERS) — `b7e50342` — ✅ testado 2026-07-26 (smoke-prod, 0 erros)
- 2026-07-26 — Store dourado no header (abre a Loja) + remoção do botão Imbue do card do personagem — `9706a4c5`
- 2026-07-26 — header + botão Trocar Hunt na mesma navy profunda do painel lateral (#sidebar) — `8afc5392`
- 2026-07-26 — cards de linked-task + botões de nav da Loja retematizados (pergaminho definido, theme-aware) — `5c8df271`
- 2026-07-26 — removido o bob sintético dos monstros no palco (só a animação nativa da sprite) — `04ee0d26`
- 2026-07-26 — highscores marca jogadores online (ponto verde); /online expõe onlineNames + deploy Railway — `376cef2d`
- 2026-07-26 — Hunt Analyzer passa a contabilizar suprimentos pelo preço de compra (poções sell=0 deixavam em 0) — `447bed32`
- 2026-07-26 — imbuements: ícones reais dos 8 (wiki .png→webp) + auditoria (efeitos ligados, valores canônicos vs Crystal) — `8866fa6a`
- 2026-07-26 — janela de imbuing redesenhada no estilo do cliente do Tibia (painel escuro, gems em soquete dourado) — `f6053a9d`
- 2026-07-26 — auto-sell com presets (Desligado/Lixo barato/Lixo comum ≤250) — `b66e5ba8`
- 2026-07-26 — treino UNIFICADO ponta a ponta (servidor rate por contexto live/resume + cliente painel único com outfit fiel no boneco) — `543f9cbe`

## Histórico migrado do BACKLOG (entregas anteriores ao log)

**Economia server-authoritative (exploits fechados)**
- #R1 Rubini gasto reembolsado em daily/BP → `/rubini/spend` no mutex ECON — `3453525a`
- #R2 corrida da carteira (gold delta vs escrita absoluta) → `flushVitals` pega o lock — `5642946d`
- #R3 débito na moeda errada (cliente) → escolhe gold/rubini certo
- #R4 charm points de Arena/BP descartados → `player_charms.state.bonus` — `6bd007c0`
- #R5 `/charm/unlock` sem lock → fechado pelo lock do #R2
- #1 task reward só no cliente → server-authoritative + coleta manual — `0f6e5dcf`
- #3 boosts client-authoritative → server (loja/BP/arena) — `c4bda7f1`
- #6 level-up fantasma no reward de task → resolvido pelo task collect — `0f6e5dcf`

**Combate & conteúdo**
- Cap de level 100 → 2000 (P0.1) — deploy 07-25
- `atk` placeholder = instakill: 363 monstros corrigidos da fonte Crystal
- Flecha fantasma do paladino — `a4b03f6b`
- Arena "melhor de 2" quebrada → melhor de 3, sem empate
- Task reward 2× em multi-kill → guard de reentrância
- Página dedicada de Imbuements + shrine fiel — `3e19d100`/`d858912c`/`4186835a`
- Market recriado fiel ao Tibia — `cedb8c18`
- Janela de morte estilo Tibia — `f324754d`
- P2.6 XP de task já é estático por task (verificado, sem mudança)

**UI / estética / juice**
- Tipografia = stack nativa do rubinot.com.br/news — `fba368ae`
- Ícones = sprites reais do Tibia (Worlds/Achievements/Boosted/Daily/BP/Retomar) — `e8c8488c`/`6bb1e5ed`/`750b2b4b`
- Ícones de custo de Imbuement = sprite real — `7c2a2a28`
- Treino do Knight (melee): dummy central, investida — `efb3f2ed`
- Sprites sumindo na batalha (regressão loading=lazy) revertida — `0a7b60eb`
- Dark: fontes navy invertidas + aba do log — `0a7b60eb`/`896ff386`
- Boosted 24→40px + ícone 🐾/💀 — `0a7b60eb`/`c8db6cb4`
- Dropdown do Market temado — `efb3f2ed`
- Ícones da sidebar corrigidos — `896ff386`
- Cards de igual altura + sidebar navy premium — `34e263ce`/`511df44a`
- Juice no combate (dano flutuante + LEVEL UP + drop raro) — `c8db6cb4`/`b01825fd`/`e9788496`
- Palco parado escurece + CTA "Retomar caçada" — `cd6d8686`
- Número abreviado na barra de XP + labels do rail — `d24b617a`
- Título da aba "(N) Rubinot Idle" — `e0727efa`
- Botão Trocar Hunt só fora da caça — `34e263ce`
- Busca no bestiário — `1edf2a20`

**Infra / quick wins**
- CI com os guards no deploy — `.github/workflows/guards.yml`
- Já existiam: battle list coalesce via rAF · `:focus-visible` · `prefers-reduced-motion` · `window.onunhandledrejection`
- 2026-07-26 — feat(hunt): barra de vida/mana FLUTUANTE sobre o boneco no palco (estilo cliente do Tibia) + remoção dos HP/Mana duplicados abaixo do palco (só XP resta) — `466e7e22` — ✅ testado 2026-07-26 (probe-player-overhead em prod: overhead dentro do palco e acima da sprite, 1160/1160 & 1635/1635, 0 duplicata, 0 erros)
- 2026-07-26 — chore(shop): "(Dinheiro Real)" já não aparece em botão nenhum (verificado; aba = "💳 Loja Premium", preço em R$) — sem mudança de código — ✅ verificado 2026-07-26 (grep: 0 ocorrências em botão)
- 2026-07-26 — fix(hunt): cena do palco preenche 100% da largura (fim do letterbox/tarjas pretas), sem distorcer o pixel art — `2ba4e122` — ✅ testado 2026-07-26 (shot-stage-fill em prod: cena de ponta a ponta, sem tarjas pretas, sem distorção)
