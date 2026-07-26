# Rubinot Idle — Backlog

**Regras permanentes:** nada inventado (regra/valor/efeito rastreável ao Tibia/Crystal em `reference/crystalserver/`) · prêmios não-materiais (Arena/BP só dão boost/charm/carta de prey/varinha de treino) · combate = fonte de verdade no servidor.

**Legenda:** `S` <½ dia · `M` 1–2 dias · `L` multi-dia · `[server]` precisa mudar o servidor · `[CANON]` mais fiel ao Tibia.

> Registro do que já foi entregue fica no fim (`✅ Concluído`). Aqui em cima é só o que está **aberto**.

---

## 📌 Punch-list do Felipe (revisão ao vivo)

**Estética**
- [ ] Contraste geral no tema dark (nome da vocação, `muted`, rótulo CREATURE do Boosted)
- [x] Cores dos botões da Loja — o único elemento berrante eram os botões "Buy" em verde saturado sobre o parchment navy/dourado; retematizados pra dourado/âmbar (combina com a aba ativa + tema de tesouro), escopado à Loja (Skills/zonas seguem verdes). Verificado em prod (screenshot). — `869cebe4`
- [ ] Loja Premium: remover o texto "(Dinheiro Real)" do botão
- [ ] Sprites cortadas em alguns monstros (ex.: Valkyrie, Smuggler Baron Silvertoe nos cards de Boss Zone)
- [x] Janela de detalhe do item — botões temados com hierarquia (Equipar/Usar dourado, Vender/Vender Todos bronze, Desequipar/Close neutro), no lugar das cores inline soltas (azul/laranja/verde). Verificado em prod nos 2 temas (screenshot). — `455dd0e5`
- [ ] Abas "leves" (Worlds/Highscores/Market/Shop) deixam ~40% inferior da tela como gradiente morto
- [ ] Letterbox do palco de batalha — tarjas pretas grossas, área jogável pequena
- [x] Diferenciar HP/MP/XP no rail — cor de canal por vital (outline + glow: HP vermelho, MP azul, XP dourado) POR CIMA do track, somada ao ícone real + fill + valor que já existiam. Resolve a confusão HP-mid(laranja)/XP(dourado). Verificado em prod nos 2 temas (screenshot). — `fb718c4e`

**Funcional / UX**
- [ ] **Boss Zone com bosses REAIS** `[CANON]` — cada zona usa o boss canônico da criatura (ex.: Rotworm Queen, não rotworm inflado); rever nome/sprite/stats/loot de todos
- [ ] HP/Mana do personagem no estilo do cliente do Tibia + remover HP/Mana duplicados dentro do palco
- [x] Fechar o detalhe do item VOLTA pra mochila (não fecha tudo) — `openModal` ganhou um `onClose`; o Close estático + clique-fora chamam `dismissModal()` que usa o handler (detalhe da Bag → volta pra Bag via `handleItemModalDone`; demais modais fecham normal). Verificado (probe-item-close: da Bag→Bag, Bag→fecha, fora→fecha, 0 erros). — `fb386e67`
- [ ] Menu de clique-direito customizado (tema Tibia) no lugar do nativo do navegador
- [x] **BUG: comprar munição em lote na Loja de Equipamentos compra só 1** — `confirmBuyShopItem` só multiplicava pra poção/runa; incluído `ammo` no cálculo de `count`. Verificado em prod (probe-shop-ammo: ammo qty 7 → compra 7, equipamento fica 1, 0 erros). — `fa3ae3ac`
- [ ] **auto-sell** — não é bug: default `maxValue=50` baixo demais (junk vale 55–243). Decisão de economia do Felipe: subir default / presets ("vender lixo comum") / vender por valor ignorando `type`

### 🔴 Revisão ao vivo 26/07 — Bugs
- [ ] **exori (Berserk) quase não dispara pelo RTC** `[server]` `[balanço]` — **DIAGNOSTICADO**: não é filtro (o `orderByPackSize` só reordena, não descarta — `rtcConfig.js:148`). É **mana**: knight lvl 35 tem maxMana ≈235; o motor exige `mana − reservaCura(exura_ico=40) ≥ exori(125)` → **mana ≥ 165 (70% do pool)** (`server/src/huntEngine.js:747`), e em alvo único a área é despriorizada. Num knight que se cura, a mana raramente chega a 165 → exori quase nunca sai. **Decisão de balanço do Felipe** (não deployo sozinho): opções — subir mana base do knight / não reservar cura contra a única spell armada / recomendar mana potion no RTC. ⚠️ **NÃO baixar o custo pra 115**: `berserk.lua` do Crystal marca `mana(125)` explicitamente ("Phase A rebalance: 115→125") — 125 é o valor canônico atual, 115 é o antigo. Nosso modelo (lvl35/125/cd4/SQUARE1X1) já bate com a fonte
- [ ] **BUG: imbuement só funciona em item EQUIPADO** — deveria aceitar item da mochila também. `src/application/imbuementUseCases.js` / `src/ui/imbuementPanel.js`
- [ ] **BUG: Hunt Analyze não contabiliza suprimentos** — consumo de mana/health potion não entra no gasto/waste da sessão
- [ ] Sprites de monstro ainda **cortadas** no card do Boosted (ex.: Valkyrie) — container recorta a sprite 64×64; ajustar `object-fit`/altura de `.boosted-sprite`

### 🎨 Revisão ao vivo 26/07 — Estética
- [ ] Fundo dos cards de **linked task** feio + botões de navegação da Loja (Rubini Store / Equipamentos / Artigos Mágicos) com fundo ruim — retematizar
- [x] **Cor do header + botão "Trocar Hunt"** = navy profunda do painel lateral esquerdo (`#sidebar`). Verificado em prod (shot-header-navy: mesmo gradiente do sidebar). — `8afc5392`
- [ ] Sprite dos **imbuements** infiel — usar o ícone real do Tibia
- [ ] Remover **animação extra** dos monstros no palco de batalha — deixar só a animação original de andar (passos)

### 🧩 Revisão ao vivo 26/07 — Features / reformas
- [x] Remover o botão **Imbue** do card do personagem (redundante com a aba/página de Imbuements). Verificado em prod (probe-store-header: Imbue fora do card, 0 erros). — `9706a4c5`
- [x] **Botão Store no header** — botão "Store" dourado estilo Tibia no topbar; abre a aba Shop (Loja Premium é a 1ª). Verificado em prod (probe-store-header: existe, rótulo "Store", abre a aba, 0 erros). — `9706a4c5`
- [ ] **Highscores: indicar quem está online** — marcar jogadores online no ranking (já existe `/online` no servidor com contagem + topo)
- [ ] **Treino unificado** · M — remover o treino offline separado; **1 treino só** rodando **online E offline ao mesmo tempo**; janela maior/melhor; **outfit fiel ao do personagem**. Editar `.spec/23-training.md` antes do código
- [ ] **HP/Mana em cima do personagem** · M — barra de vida/mana sobre o boneco no palco (estilo cliente Tibia), tirar da janela de combate (consolidar com o item aberto de HP/Mana estilo cliente)
- [ ] **Prey fiel ao Tibia** · M · `[server]` — reformar mecânica + sprites do Prey pra bater com o original. Fonte: `reference/crystalserver/.../ioprey.cpp`
- [ ] **Sistema de Quests (raids com prêmio real)** · L — cada quest = raid com começo/meio/fim; premiação **REAL de quest do Tibia** (item/acesso — NÃO inventar) entregue ao finalizar; **1 prêmio por quest** (não repetível). Editar `.spec/` antes. Exceção documentada à regra de prêmio não-material (quests reais do Tibia dão item)

---

## 🎯 Estratégico — por que o jogo "acaba"

1. **O número central congela no 100** — já resolvido (cap subido pra 2000, ver Concluído).
2. **Não existe sink infinito** — gold/charm/XP transbordam sem escoadouro; loot duplicado empilha sem propósito.

A resposta canônica pra (2) é adicionar o endgame que transforma XP/loot/kills em metas infinitas (Wheel, Forge, Bosstiary) — é o P0 abaixo.

## P0 — Define a próxima fase (encampar 1–2)

- [ ] **P0.2 Wheel of Destiny** · L · `[server]` — grade de talentos pós-max; acumula e gasta pontos em stat/spell por vocação (+ wheel gems). Melhor encaixe idle: sink de pontos infinito. Fonte: `src/creatures/players/wheel/`, `src/io/io_wheel.cpp`
- [ ] **P0.3 Forge + Item Tier** · L · `[server]` — funde equipamento duplicado → tier 1–10 com procs; consome dust + cores + muito gold. Dá propósito ao loot do AFK *e* é o sink de gold que escala com riqueza. Fonte: `data/scripts/systems/item_tiers.lua`

## P1 — Alto valor

- [ ] **P1.1 Cyclopedia (Hunt/Loot/XP Analyser)** · M — painel de throughput (XP/h, gold/h, loot vs waste, sessão vs offline). Melhor valor:esforço; dado quase todo já existe
- [ ] **P1.2 Bosstiary** · M · `[server]` — kills de boss → boss points → slots/prowess; reaproveita as kills do Boss Rush. Fonte: `src/io/io_bosstiary.cpp`
- [ ] **P1.3 Onboarding do 1º minuto** · M — coach-mark de 3 passos (caçar → ver loot → gastar) + one-liner nas abas avançadas. Maior alavanca de retenção de jogador novo
- [ ] **P1.4 Nível recomendado por zona + agrupar abas** · M — hint de nível no zone picker (derivável de HP/atk/xp); agrupar abas por seção e travar até o unlock. Reduz o cliff do level 8
- [ ] **P1.5 Celebrar marcos** · M
  - [x] Badges de "resgatável" nas abas **Tasks e Battle Pass** — ponto verde pulsante dirigido pelos mesmos sinais de claimable do `notifyTitle` (`setTabBadge`). Verificado em prod (probe-tab-badges: aparece/some, 0 erros). — `094902a9` · (charm/promoção ficam como follow-up: mesmo `setTabBadge`, falta o sinal de claimable de cada um)
  - [x] Boosted-of-the-day CTA — card da criatura clicável abre o zone picker na cidade da 1ª zona dela (`08ad171b`). O `/test` pegou que o card ficava inerte pra ~63% das criaturas (pool incluía não-huntáveis); o `/fix` restringiu o pool de boosted a criaturas huntáveis (`673f522f`) → CTA 100%. Verificado (probe-boosted-cta: clicável, abre modal, 0 erros).

## P2 — Profundidade / conteúdo

- [ ] **P2.1 Tiers de charm (Minor/Major) + expansão** · M · `[server]` — hoje 6 flat / 3 slots com set ótimo fixo; Crystal tem categorias + expansion. Absorve a inflação de charm points. Fonte: `bestiary_charms.lua`
- [ ] **P2.2 Tiers de imbuement + armadura/skill** · M · `[server]` — hoje 3, weapon-only, 1 tier; Tibia tem ~14 em 3 tiers. Slot de armadura/helm + resistências = 1ª decisão defensivo-vs-ofensivo
- [ ] **P2.3 Prey Wildcards + Concoctions** · S–M · `[server]` — wildcards pra rerolar/travar prey; concoctions = buffs temporizados com cooldown (gancho de re-log). Fonte: `ioprey.cpp`, `concoctions.lua`
- [ ] **P2.4 Sink de gold que escala** · M · `[server]` `[CANON]` — Exercise Weapons na loja e/ou house rent. (Se o Forge entrar, ele já é o sink)
- [ ] **P2.5 Aprofundar o sink de Rubini** · M — boosts mais longos, packs de wildcard, tentativas de arena, cosméticos. Premium compra velocidade, não poder
- [ ] **P2.6 Rebalancear XP de task vs curva de level** · M — tasks pagam até 30M; total até o cap antigo era 15,69M. Amarrar à decisão do cap (cauda longa vs reescalar)
- [ ] **P2.7 Streak de daily + cadência semanal** · S — ciclo de 7 dias raso; adicionar marco de streak longo (30 dias). Recompensa não-material
- [ ] **P2.8 Funil de recompensa pras ladders infinitas** · M — Boss Rush/skill/bestiário são infinitos mas mal recompensados; dar payoff aos marcos (charm/imbue/wildcard). Ligado a P0.2 e P2.1

## P3 — Quick wins

- [x] **[a11y/perf] Sprites: `decoding="async"` + `alt`** — o helper compartilhado já tinha os dois; adicionado `decoding="async"` também nos <img> avulsos (logo/ghost/outfit/treino/morte), que já tinham `alt`. NUNCA `loading=lazy`. Smoke OK. — `97984cd4`
- [x] **[UX] #5 `KILL_COUNTERS` sem listener** — adicionado listener que re-renderiza o bestiário ao vivo, gated na aba Bestiário aberta (sem render à toa quando fechada). Smoke OK. — `b7e50342`
- [x] **[dívida] Código de outfit morto na Loja** removido — os branches owned/wearing (incl. o `#fdf4d7` hardcoded) nunca executavam (sem outfit no catálogo); caminhos vivos idênticos. Verificado (probe-shop-ammo + smoke). — `f9f38733`

## P4 — Safety net / a11y / mobile

- [ ] **[test]** CI rodando o smoke set dos probes (`probe-smoke`/`probe-kill`/`audit:static`) pra gatear deploy · M
- [ ] **[test]** Unit test das fórmulas de combate (monstro+gear conhecidos → dano conhecido) · M
- [x] **[a11y]** Modais com `role="dialog"` + `aria-modal`, Escape fecha/dispensa (handler único), foco na caixa ao abrir e retorno ao opener ao fechar. Verificado (probe-modal-a11y). — `f6fbaf20`/`11a140ef` · (focus-trap completo fica como refino futuro)
- [x] **[a11y]** Tablist ARIA nas abas: role tablist/tab/tabpanel + aria-controls/aria-labelledby + aria-selected que troca no clique (setado em JS no wireTabs). Verificado (probe-tablist-a11y). — `eec967be`
- [ ] **[mobile]** Breakpoint único (900px) + fonte base 12px + alvos de toque não auditados · M–L
- [ ] **[obs]** Log estruturado no servidor (wrapper level/ts/sessionId/event) · S–M

## 🧮 Pendências de dados (auditoria manual, não sourceável automático)

- [ ] ~119 monstros custom/evento RubinOT com `atk>1500` (não existem no Crystal) — precisam de TibiaWiki. `node scripts/audit-monster-atk.mjs --thresh=1500`
- [ ] ~136 monstros com `hp` placeholder (até ~100× o real) — balanceamento (baixar hp sem rebalancear XP dispara XP/h); ligado à economia/sessão paralela
- [ ] Maioria dos monstros custom sem `spells` — perderam as magias elementais; importar os `combat` dos `.lua`

## 🩹 Noutra frente (não encostar)

- [ ] Monk Harmony/Virtue (fase 2) — 5ª vocação, mecânica avançada (`fonte-monk-crystalserver`)

---

## ✅ Concluído

**Economia server-authoritative (exploits fechados)**
- #R1 Rubini gasto era reembolsado em daily/BP → `/rubini/spend` no mutex ECON — `3453525a`
- #R2 corrida da carteira (gold delta vs escrita absoluta) → `flushVitals` pega o lock — `5642946d`
- #R3 débito na moeda errada (cliente) → escolhe gold/rubini certo
- #R4 charm points de Arena/BP eram descartados → `player_charms.state.bonus` — `6bd007c0`
- #R5 `/charm/unlock` sem lock → fechado pelo lock do #R2
- #1 task reward só no cliente → server-authoritative + coleta manual — `0f6e5dcf`
- #3 boosts client-authoritative → server (loja/BP/arena) — `c4bda7f1`
- #6 level-up fantasma no reward de task → resolvido pelo task collect — `0f6e5dcf`

**Combate & conteúdo**
- Cap de level 100 → 2000 (P0.1) — deploy 07-25
- `atk` placeholder = instakill: 363 monstros corrigidos da fonte Crystal (`scripts/audit-monster-atk.mjs`)
- Flecha fantasma do paladino (magia com projétil disparava flecha básica extra) — `a4b03f6b`
- Arena "melhor de 2" quebrada → melhor de 3, sem empate
- Task reward concedida 2× em multi-kill → guard de reentrância
- Página dedicada de Imbuements + shrine fiel ao Tibia — `3e19d100`/`d858912c`/`4186835a`
- Market recriado fiel ao Tibia (busca + ofertas, sem `<select>` nativo) — `cedb8c18`
- Janela de morte estilo Tibia (OK bloqueante) — `f324754d`

**UI / estética / juice**
- Tipografia = stack nativa do site oficial `rubinot.com.br/news` — `fba368ae`
- Ícones = sprites reais do Tibia (Worlds/Achievements/Boosted/Daily/BP/Retomar), emojis trocados — `e8c8488c`/`6bb1e5ed`/`750b2b4b`
- Ícones de custo de Imbuement = sprite real — `7c2a2a28`
- Treino do Knight (melee): dummy central, investida que conecta — `efb3f2ed`
- Sprites sumindo na batalha (regressão do `loading=lazy`) revertida — `0a7b60eb`
- Dark: fontes navy invertidas + texto da aba selecionada do log — `0a7b60eb`/`896ff386`
- Boosted 24→40px + ícone 🐾/💀 — `0a7b60eb`/`c8db6cb4`
- Dropdown do Market temado (`color-scheme` + `<select>`) — `efb3f2ed`
- Ícones da sidebar corrigidos (Caçada/Spells/RTC) — `896ff386`
- Cards de igual altura (Battle Pass + zonas) + sidebar navy premium — `34e263ce`/`511df44a`
- Juice no combate: dano flutuante no player + flash de LEVEL UP + pop de drop raro — `c8db6cb4`/`b01825fd`/`e9788496`
- Palco parado escurece + CTA "▶ Retomar caçada" — `cd6d8686`
- Formato de número abreviado na barra de XP + labels nos botões do rail — `d24b617a`
- Título da aba "(N) Rubinot Idle" (re-engajamento) — `e0727efa`
- Botão Trocar Hunt só fora da caça — `34e263ce`
- Busca no bestiário — `1edf2a20`

**Infra / quick wins**
- CI com os guards no deploy (import-versions, imports-faltando, paridade i18n en/pt) — `.github/workflows/guards.yml`
- Já existiam (backlog desatualizado): battle list coalesce via rAF · `:focus-visible` global · `prefers-reduced-motion` · `window.onunhandledrejection`
