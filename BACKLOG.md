# Rubinot Idle — Backlog

Backlog priorizado, consolidado de 4 auditorias (sistemas canônicos Tibia/Crystal · UX/onboarding/retenção · economia/progressão · polish/perf/dívida técnica).
Regras permanentes: **nada inventado** (toda regra/valor/efeito rastreável ao Tibia/Crystal em `reference/crystalserver/`) · **prêmios não-materiais** (Arena/BP só dão boost/charm/carta de prey/varinha de treino, nunca gold/RC/equipamento) · combate = fonte de verdade no servidor.

Tamanho: **S** < ½ dia · **M** 1–2 dias · **L** multi-dia. `[server]` = precisa mudar o servidor. `[CANON]` = mudança que é *mais* fiel ao Tibia, não menos.

---

## 📌 Punch-list do Felipe — revisão ao vivo (07-25)
> Regra permanente: **todo pedido do Felipe entra aqui** pra não se perder.

**Estética / cosmético**
- [x] Treino do Knight (melee): dummy no CENTRO, boneco colado, investida que conecta + animação de ataque — `efb3f2ed`
- [x] Sprites de monstro **sumindo** na batalha (só a barra de vida aparecia) — regressão do `loading=lazy`, revertida — `0a7b60eb`
- [x] Fontes escuras demais no tema noturno (nome da vocação / recursos do rail em navy-escuro) — `--navy-*` invertido no dark — `0a7b60eb`
- [x] Boosted: monstros pequenos demais pra ver (24→40px) — `0a7b60eb`
- [x] Dropdown do Market caindo no branco do SO / selects sem tema — `color-scheme` + `<select>` temado — `efb3f2ed`
- [x] Texto da aba SELECIONADA do log invisível no dark (`--cream` não invertia) — `896ff386`
- [x] Ícones da sidebar: Caçada=Map(envelope)→Target_Board; Spells duplicava RTC→Spellbook próprio; RTC→Wand — `896ff386`
- [x] Ícone estranho no Boosted (rótulo CREATURE 🐗) — trocado por 🐾 (combina com o 💀 do Boosted Boss) — `c8db6cb4`
- [x] Cards de **igual altura** independente do texto (Battle Pass + zonas de hunt) — `34e263ce`
- [x] Texto da **aba selecionada** no log invisível no dark — `896ff386`
- [ ] Ícone estranho no Boosted (rótulo CREATURE 🐗) + revisar contraste dark geral (voc name, muted)
- [x] **Cor do painel lateral (sidebar)**: navy mais profundo/premium (escuro + brilho dourado no topo) — `511df44a`
- [x] **Ícones dos custos de Imbuement**: gema-emoji → sprite real do Tibia (1ª fonte astral); fontes astrais já eram sprites reais (verificado no DOM) — `7c2a2a28`
- [ ] **Cores ruins nos botões da Loja** (Premium/Rubini Store/Equipamentos/Artigos Mágicos): cada card com cor destoante/berrante, sem harmonia — retrabalhar a paleta — (screenshot anexada, salvar manualmente)
- [ ] **Loja Premium**: remover o texto "(Dinheiro Real)" do botão — (screenshot anexada, salvar manualmente)
- [ ] **Sprites cortadas ainda** em alguns monstros (ex.: Valkyrie e Smuggler Baron Silvertoe nos cards de Boss Zone) — cabeça/corpo saindo do frame — (screenshot anexada, salvar manualmente)
- [ ] **(auditoria design 07-25) Abas "leves" com viewport vazio**: Worlds/Highscores/Market/Shop deixam ~40% inferior da tela como gradiente azul morto — parece inacabado; preencher/centralizar melhor
- [ ] **(auditoria design 07-25) Letterbox do palco de batalha**: tarjas pretas grossas em cima/embaixo, área jogável pequena e sprites minúsculos — aproveitar melhor o frame
- [ ] **(auditoria design 07-25) Mais "juice" no combate**: dano flutuante, pop de loot, flash de level-up — hoje o feedback vive só num log de texto plano (núcleo do jogo silencioso demais visualmente)
- [ ] **(auditoria design 07-25) Estado "parado" = tela morta**: com hunt Stopped o palco congela sem vida — dar estado de repouso animado / CTA visual forte pra retomar
- [ ] **(auditoria design 07-25) Diferenciar HP/MP/XP no rail**: barras verde/azul/dourado parecidas e minúsculas — num relance não dá pra distinguir vida de experiência
- [ ] **(auditoria design 07-25) Trocar emojis de SO por sprites do tema**: Worlds usa emoji do sistema (arco-íris/sol/espiral/sparkles) e Battle Pass usa ⭐ — destoa do pixel-art autêntico do resto
- [x] **(auditoria design 07-25) Padronizar formatação de número**: barra de XP do palco agora usa o mesmo formato abreviado do rail (105.2K/495.1K · 21%), era número cru — `d24b617a`

**Funcional / UX**
- [x] **Página dedicada de Imbuements** (aba própria, máquina de imbuing do Tibia): seletor de item equipado (arma/elmo/armadura) + imbuements por slot. 5 imbuements novos de proteção (elmo/armadura via `computePlayerAbsorb`), server aplica por slot. VERIFICADO no browser. — `3e19d100`/`d858912c`
- [x] Descrições dos imbuements PT→EN (`imbue.desc.*` i18n) — `3e19d100`
- [~] **auto-sell "não funciona"** — 🔎 **NÃO é bug de código** (auditoria 07-25): client (`setAutoSell`/`setAutoSellMax`) salva + sincroniza (`updateHuntRtc`) e o snapshot de hunt-start manda `autoSell`; server vende no drop (`huntEngine.js:493-516`). O que falha é o **default `maxValue=50` baixo demais**: quase todo junk é `type:misc` com `sell` **55–243** (cyclops_toe=55, wolf_paw=70, minotaur_leather=80, rotten_meat=243) → com teto 50 só bat_wing(50)/≤50 vende, o resto acumula e "parece" desligado. **Decisão do Felipe** (tuning de economia): subir o default (ex.: 250) e/ou trocar o teto raw por presets ("vender lixo comum"), OU vender por valor independe de `type`. Não mexi sozinho por ser balanço de economia.
- [x] Botão **Trocar Hunt** habilitado só quando NÃO está caçando — `34e263ce`
- [x] **Janela de morte estilo Tibia** (OK bloqueante antes de continuar) — `f324754d`
- [ ] Paladino — **flecha fantasma** (BUG) · 🔎 **ROOT-CAUSE achado** (07-25): não é paladino-específico — **toda magia/runa com projétil próprio** dispara o missile no cast (`huntUseCases.js:1234`/`1248`) **e** o `applyServerPack` dispara uma flecha básica **adicional** a partir da mesma queda de HP (`:675`), porque casts com missile não deixam marca pro reconciliador saber que o projétil daquele dano já voou. No paladino a flecha é distinta → o double salta aos olhos ("2ª flecha"). **Fix desenhado:** estender `pendingSpellFx` com flag `hasProjectile` nos dois ramos de missile; em `applyServerPack`, quando a queda de HP é atribuída a esse cast, **suprimir a flecha básica** (mantendo dano/queda de vida). ⚠️ mexe na sincronia HP↔projétil (dois relógios) que já causou vários bugs aqui — **NÃO deployar cego**: precisa de ciclo de verificação visual no browser (regra do projeto). Bloqueado só por isso.
- [x] **Imbuements**: janela recriada fiel ao shrine do Tibia (item no slot, fontes astrais em sprite, tema) — `4186835a`
- [x] **Market recriado do zero** fiel ao Tibia: navegador de itens (busca + sprite) + detalhe com ofertas venda/compra + criar oferta, sem `<select>` nativo — `cedb8c18`
- [ ] **Boss Zone com bosses REAIS, não monstros "promovidos" a boss** (CANON): cada zona de boss tem que usar o boss canônico do Tibia daquela criatura — ex.: **Rotworm Queen** é o boss dos rotworms, não um rotworm com stats inflados. **Rever TODOS os bosses** (nome/sprite/stats/loot do boss real, fonte Crystal/TibiaWiki)
- [ ] **(auditoria design 07-25) Toasts de eventos importantes**: subiu de nível / dropou item raro / task concluída / charm desbloqueado — hoje tudo vira uma linha no log que passa batido; precisa de destaque
- [x] **(auditoria design 07-25) Rotular/clarificar os 3 botões de ação do rail**: os 2 botões só-ícone (Imbuements/Achievements) ganharam label visível (Imbue/Titles) — `d24b617a`
- [x] **Linked Task: tela de COLETAR recompensa** (não creditar automático): ao bater o alvo a task fica "pronta" (botão verde **Coletar Recompensa** no painel, não credita nada); o jogador clica pra coletar — como no Tibia. A coleta é **server-authoritative** (`/task/complete` agora CONCEDE xp/gold/item de fato via `grantTaskRewardsServer`, com recálculo de nível e ressincronia da sessão viva de caçada). **Resolve #1/#6** de vez: antes o cliente creditava local e o reconcile revertia (xp de task, dezenas de milhões, evaporava). taskCoin fica no cliente (não é revertido). Guard de clique único fecha o double-grant. VERIFICADO em prod (probe + Supabase: gold +10K/xp +9K persistem no player_stats, 0 erros) — `0f6e5dcf`
- [x] **Barra de vida do monstro com números** — JÁ EXISTIA: `.monster-hp-label` mostra `hp / maxHp` (huntPanel.js:230)
- [x] **Dano no personagem = número flutuante subindo**: dano recebido salta em vermelho sobre o boneco (COMBAT_DAMAGE onPlayer), verificado no browser — `c8db6cb4`

---

## 🐛 Loop "procure e ajuste bugs" (07-25) — corrigidos e deployados

- [x] **Monstros com `atk` placeholder gigante = INSTAKILL** (BUG severo). O `atk` do jogo é o dano MÁX por golpe (`normalRandom(0,atk)`). Um placeholder inflou o atk de centenas de monstros — de tier alto (Soul War/Podzilla/Darklight/Rotten Blood, **85106–273171**) até comuns de nível baixo/médio (black_cobra **2706**, nagas **2463**, librarian **2971**). Melee de dezenas de milhares = morte instantânea; zonas normais, task-rooms #85–94 e bosses ficavam injogáveis. **Fix (nada inventado):** `scripts/audit-monster-atk.mjs` casa cada monstro ao seu `.lua` no `reference/crystalserver` e deriva o dano real: melee com `maxDamage` → |maxDamage|; melee com `skill`/`attack` → fórmula real do Crystal `getMaxMeleeDamage = ceil(skill·attack·0.05 + attack·0.5)` (`weapons.cpp:107`); caster/distance sem melee → maior dano dos ataques `combat`. Ignora ataques comentados no `.lua`. **363 monstros corrigidos da fonte** (branchy 85106→950, oozing_carcass 181934→600, morshabaal 273171→2625, black_cobra 2706→150, nagas→300–430). Guard novo pra não regredir (`--thresh=N` configurável).
  - ⏳ **Restam ~119** com `atk>1500`: **custom/evento RubinOT que NÃO existem no Crystal** (`*_creature`, `*_antibotter`, `timedisplaced_anomaly_*`, `radiant_*`, `harbinger_of_darkness`, `worker_imp`, grupos placeholder tipo crultor/despor/vengar=13750…) + 8 casters sem melee nem combat tabelado. Precisam de **TibiaWiki** (fora do Crystal) — é a auditoria-valores-monstros manual, não sourceável automático. `node scripts/audit-monster-atk.mjs --thresh=1500` lista.
  - 📌 Gap de conteúdo relacionado: a maioria desses monstros **não tem `spells`** no jogo (só o knob `atk`) — perderam as magias elementais do Tibia. Follow-up: importar os `combat`/spells dos `.lua`.
  - 📌 **Mesmo padrão placeholder existe em HP** (auditoria 07-25): ~136 monstros com `hp` maior que o `maxHealth` real do Crystal (ex.: stalking_stalk/sulphur_spouter/nighthunter/undertaker **1.870.062 vs ~17–20k real ≈ 100×**; headpecker 1.647.637 vs 16.300). **NÃO é instakill** (só deixa o monstro tanky demais e distorce XP/h) → é **balanceamento**, não bug urgente, e mexe em economia/progressão (ligado à sessão paralela). Método pronto pra corrigir (comparar `hp` do jogo vs `maxHealth` do `.lua`), mas precisa de decisão de balanceamento (baixar hp sem rebalancear xp dispara XP/h). Deixado de fora deste loop de propósito.
- [x] **Arena "melhor de 2" quebrada** (BUG) — vencer o round 2 depois de perder o 1 dava 1-1 e `won = wins>losses` caía como **derrota** (round 2 era decorativo); e 2 rounds sem KO (0-0) também contava derrota. **Fix:** virou **melhor de 3** (1º a 2 rounds), round sem KO em 30 ticks decide por % de vida restante → nenhum empate, resultado sempre decisivo (2-0/2-1 vitória, 0-2/1-2 derrota). Verificado com sim de 100k (winrate 49.8% em odds 50/50, zero estados inválidos). `arenaUseCases.js`.
- [x] **Task: recompensa concedida 2× num tick multi-kill** (BUG) — `MONSTER_KILLED` dispara em loop síncrono; `checkTaskProgress` (async) suspendia no `await` com `activeTask` ainda setado → 2ª entrada reconclui. XP/gold/inv voltam no reconcile, mas **taskCoins NÃO** (fora de `ECONOMY_FIELDS`) → dobravam de vez. **Fix:** guard de reentrância `completingTask`. `taskUseCases.js`.

**Achados do bug-hunt entregues a outra frente (não encostar aqui — servidor/economia):**
- [x] ~~**#R1 Rubini gasto é REEMBOLSADO em toda daily/BP claim**~~ ✅ **FEITO + VERIFICADO em prod** (`3453525a`): gasto de Rubini (boost/outfit) virou server-authoritative via `/rubini/spend` (mutex ECON) — debita `player_stats.rubini` e devolve o saldo real; boost/outfit aplicam `res.rubini`; BP tier de rubini aplica `res.rubini` do `/bp/claim`. Probe: 50→48→47 (gasto persiste no servidor, daily/BP não reembolsa). Feito a versão "gastos server-side" (fecha o sangramento); migração completa da FONTE (player_stats no boot/reconcile + tirar rubini do save, pra blindar multi-dispositivo) fica como follow-up. Descrição original abaixo. — Rubini é debitado **só no cliente** (`shopUseCases.js:67` boosts, `outfitUseCases.js:37` outfits) e nunca comunicado ao servidor; `player_stats.rubini` só sobe (daily/BP) ou desce por BP-premium, nunca por boost/outfit. Aí `dailyRewardUseCases.js:39` (`if (result.rubini != null) G.rubini = result.rubini`) e `battlePassUseCases.js:132` **sobrescrevem `G.rubini`** com o valor stale do servidor. **Repro:** 100 RC → compra outfit de 100 (`G.rubini=0`, nuvem=0, mas `player_stats.rubini=100`) → claim de **qualquer** daily (até dia de gold; server sempre devolve `rubini`, `index.js:1850/1881`) → `G.rubini=100`. Outfit/boost sai **de graça**. Mesma raiz zera boost comprado (`dailyRewardUseCases.js:42` `G.boosts=result.boosts`). **Defeito de fundo:** Rubini/boosts são client-authoritative pra GASTO mas server-authoritative pra GANHO, sem ponte.
  - 🔧 **Design da solução (validar com Felipe — economia sensível, NÃO deployar sozinho no loop autônomo):** tornar `player_stats.rubini` a ÚNICA fonte de verdade (server-authoritative pleno), espelhando o que já foi feito com gold/inventário (`invItem`). Passos: (1) **servidor** — endpoint `/rubini/spend {slot, amount}` dentro do mesmo **mutex ECON** dos outros endpoints (senão cai no #R2), valida `rubini >= amount`, debita, devolve o novo saldo; (2) **cliente** — `shopUseCases` (boost) e `outfitUseCases` (outfit) chamam `/rubini/spend` e aplicam `res.rubini` em vez de `G.rubini -= total`; (3) **migração de fonte** — no boot/reconcile, `G.rubini` passa a vir de `player_stats.rubini` (hoje vem do save); precisa de um **seed único** do valor do save→`player_stats` pra jogadores existentes não perderem/duplicarem saldo. ⚠️ o passo 3 é o delicado (migração de dado de moeda) — exige o Felipe presente. **Meia-correção (só cliente, delta) NÃO serve:** fecha o daily mas deixa o BP-premium inconsistente (valida saldo contra `player_stats` stale). → o mesmo endpoint resolve `#3 boosts` se estender pra debitar/creditar boost server-side.
- [x] ~~🟠 **#R2 Perda silenciosa de gold: endpoints de economia escrevem gold absoluto sem serializar com o flush de hunt (delta)**~~ ✅ **FEITO + VERIFICADO em prod** (`5642946d`): o mutex por usuário virou módulo compartilhado (`server/src/econLock.js`) e o `flushVitals` da caçada passou a PEGAR o lock antes de gravar — agora serializa com as escritas absolutas de gold das rotas de economia, então o `+d_gold` da caça não some mais na janela do flush. Sem deadlock (o `/task/complete` e o `useItem` que já seguram o lock chamam `flushVitals(session, true)`). Diagnóstico em prod: gold sobe caçando (225.4K→225.5K), 0 erros. Descrição original abaixo. — `huntEngine.js` faz flush do gold de caça como **delta** (`gold = gold + d_gold`) num timer que ANTES rodava FORA do mutex ECON; todo endpoint (`/shop/buy`, `/imbue`, `/market/deposit`, `/daily-reward/claim`, `/buy-blessing`, `/promote`, `/prey/reroll`, `/bp/claim`, `/market/withdraw`) faz `gold = Number(stats.gold)` e upserta `gold - cost` **absoluto**. Se um `flushVitals` caía entre o `select` e o `upsert`, o `+d_gold` sumia. **É a "corrida da carteira" da auditoria noturna** — server, sessão de economia.
- [x] ~~**#R4 Charm Points de Arena/Battle Pass são concedidos no cliente e DESCARTADOS**~~ ✅ **FEITO + VERIFICADO em prod** (`6bd007c0`): server-authoritative via `player_charms.state.bonus` (sem migration) — `/bp/claim` concede atômico, `/charm/grant-bonus` (Arena) no mutex ECON, cálculo soma o bonus, `/charm/unlock` preserva o state. Probe: bonus creditou (+1) e PERSISTIU após o sync (antes sumia). Descrição original abaixo. — charm points viraram server-derived (`server/src/index.js:1089-1098`: `charmPointsAvailable = Σ charmPointsForKills(kills) − Σ custo`); o cliente `G.charmPoints` é espelho puro (`bestiaryUseCases.js:31` `G.charmPoints = res.points` a cada `MONSTER_KILLED`, throttle 5s). Mas **Arena** (`arenaUseCases.js:143`, 25+ por vitória) e **Battle Pass** (`rewardGrants.js:36`, tiers 5/12 free + 3/12 premium) ainda creditam charm **localmente**; o servidor nunca soube. **Repro:** resgata BP tier com charm (ou ganha arena) → notifica "🎁 25 charm points", `G.charmPoints` sobe → **próxima morte de monstro (≤5s)** → `syncCharmState` sobrescreve → some. E nem dá pra gastar antes: `unlockCharm` valida contra o derivado no servidor → "insuficientes". O prêmio é marcado resgatado (consumido, não re-resgatável) mas o benefício evapora. **Mesmo padrão do #R1** (2 fontes, ganho local sem ponte pro servidor). **Fix (server-authoritative, validar c/ Felipe):** coluna `charm_bonus` em `player_stats` (default 0, aditiva — SEM migração de fonte, mais simples que o #R1), endpoint `/charm/grant-bonus {slot,amount}` com mutex ECON, somar `+ charm_bonus` no cálculo de `charmPointsAvailable`; cliente Arena/BP chamam o endpoint em vez de `G.charmPoints += local`. Prêmio de charm é não-material (regra OK, ver [[premios-nao-materiais]]).
- [x] ~~🟡 **#R5 `/charm/unlock` read-modify-write sem lock**~~ ✅ **JÁ RESOLVIDO**: `/charm/unlock` está no `ECON_PATHS` e o ECON lock (index.js:300-306) envolve todo request de ECON_PATHS — unlocks concorrentes do mesmo user serializam. Fechado pelo lock do #R2.
- [x] ~~**#R3 (latent, cliente) `shopUseCases.js` debita Rubini pra qualquer compra não-gold-item**~~ — ✅ **FEITO**: o débito agora escolhe a moeda certa (`if currency==='rubini' G.rubini -= total; else G.gold -= total`). Hoje idêntico (só boost em rubini chega ali), mas fecha o footgun de um boost/outfit precificado em gold cobrar Rubini. (quando o #R1 reescrever pra server-authoritative, isso é substituído)
- [x] ~~**#1 Recompensa de task (xp/gold/item) só concedida no cliente**~~ ✅ **FEITO + VERIFICADO em prod** (`0f6e5dcf`): server-authoritative + coleta MANUAL (ver o item marcado na punch-list do Felipe). O `/task/complete` concede xp/gold/item de fato (`grantTaskRewardsServer`); probe + Supabase confirmam que o reward persiste no `player_stats` (não evapora no reconcile).

- [x] ~~🟠 **#3 Boosts client-authoritative (exploit + UX)**~~ ✅ **FEITO + VERIFICADO em prod** (`c4bda7f1`): boosts viraram server-authoritative como prey/charms. Núcleo `grantBoostServer` (huntEngine) grava `player_stats.boosts` (acumula) + atualiza a sessão viva (boost vale NA HORA, sem rezonar). `/hunt/start` LÊ `player_stats.boosts` e ignora `body.boosts` (fecha o +50% permanente forjado; o cliente nem manda mais boosts no snapshot). 3 fontes migradas: **loja** `/shop/buy-boost` (valida SHOP_ITEMS, debita Rubini, concede atômico no mutex ECON — não forjável), **BP** `/bp/claim` (concede boost/trainWand server-side, como o charm no #R4), **arena** `/boost/grant` (client-trusted mas validado: 4 tipos, cap 120min). Cliente espelha `res.boosts`; `rewardGrants` não credita boost local. **Verificado:** probe+Supabase — loja debita Rubini 100→50 e grava `boosts.xp` em player_stats (ativo); `/boost/grant` concede loot E rejeita forja de 999999min e tipo inválido (400). daily já era server-authoritative. Fraqueza residual documentada: boost de arena/BP spammável (mesma classe do `/charm/grant-bonus`, já existente).
- [x] ~~**#3 Boosts comprados no meio da caça não valem**~~ ✅ **RESOLVIDO** no #3 (`c4bda7f1`): `grantBoostServer` atualiza a sessão viva, o boost vale na hora.
- [ ] **#5 `KILL_COUNTERS` emitido sem listener** (`huntUseCases.js:824`) — progresso de bestiário/charm não atualiza ao vivo, só ao reabrir a aba. Cosmético. (não toquei: precisa definir o refresh certo do painel)
- [x] ~~**#6 Level-up "fantasma" durante reward de task**~~ ✅ **RESOLVIDO** pelo task collect (`0f6e5dcf`): sem `gainXp` local; aplica o level/xp autoritativo do `/task/complete`.

---

## 🎯 A grande virada estratégica (o "porquê" do P0)

Duas descobertas convergentes explicam por que o jogo "acaba":

1. **O número central congela no level 100.** `huntEngine.js:445/830` travam em `< 100`; `XP_TABLE` tem 100 entradas (≈15,69M XP total). Depois disso a XP cai mas nunca converte — o principal medidor de progresso morre, e o leaderboard de level satura (todo mundo empata em 100).
2. **Não existe sink infinito.** Gold, charm points e a própria XP transbordam sem escoadouro de longo prazo. Loot duplicado empilha sem propósito.

A resposta canônica do Tibia/Crystal para os dois é a mesma: **subir o teto + adicionar os sistemas de endgame que transformam XP/loot/kills offline em metas infinitas** (Wheel, Forge, Bosstiary, Cyclopedia). É por isso que eles são P0.

---

## P0 — Estratégico (define a próxima fase; escolher 1–2 pra encampar)

### P0.1 — Subir/remover o cap de level 100 · S (código) · `[server]` `[CANON]` · ✅ FEITO (cap 2000, deploy 07-25)
`tibiaTotalExp(level)` já produz valores corretos pra qualquer nível. Estender `XP_TABLE` (ex.: 500) e tirar o clamp `< 100` do loop de level-up e do loop de de-level na morte (`huntEngine.js:445,830`; `character.js:175`). **Maior alavanca do backlog por custo:** restaura curva canônica infinita, dessatura o leaderboard, e transforma o excesso de XP de task (P2.6) numa cauda longa saudável em vez de um desbalanceamento.

### P0.2 — Wheel of Destiny · L · `[server]`
Grade de talentos pós-max: acumula pontos e gasta em fatias de stat/spell por vocação; Crystal adiciona **wheel gems** (lesser/greater/regular) pra modificadores extras. Fonte: `reference/crystalserver/src/creatures/players/wheel/`, `src/io/io_wheel.cpp`. **A resposta canônica pra "o que faço depois do level máximo"** — sink de pontos infinito que mantém a XP offline relevante muito depois da curva achatar. Melhor encaixe idle do catálogo inteiro.

### P0.3 — Forge (exaltation/fusion/transfer) + Item Tier · L · `[server]`
Combina equipamento duplicado pra dar **tier 1–10** com procs (damage/onslaught/ruse); consome dust + exalted cores + **muito gold**. Fonte: `reference/crystalserver/data/scripts/systems/item_tiers.lua`. **Faz dois trabalhos:** dá propósito à enxurrada de loot duplicado do AFK *e* é o sink de gold que escala com riqueza (resolve P2.7).

---

## P1 — Features de alto valor

### P1.1 — Cyclopedia: Hunt/Loot/XP Analyser · M · (quase todo client)
Painel de throughput: XP/h, gold/h, loot vs waste, sessão atual vs offline. **Jogador idle é obcecado por número de rendimento** — é exatamente a dopamina do gênero, e a maior parte do dado já existe no servidor. Melhor valor:esforço do P1.

### P1.2 — Bosstiary · M · `[server]`
Contador de kills de boss paralelo ao bestiário → **boss points** → slots/prowess. Fonte: `reference/crystalserver/src/io/io_bosstiary.cpp`. Reaproveita as kills do Boss Rush que já existem; segunda grind infinita em cima de conteúdo pronto.

### P1.3 — Onboarding do 1º minuto · M
Depois de `createCharacter()` o jogador cai na Hunt com 15 abas opacas e ninguém diz "aperte Start Hunt". Adicionar: coach-mark de 3 passos (caçar → ver loot entrar → gastar em gear/skill) + one-liner nas abas avançadas. **Maior alavanca de retenção de jogador novo** (o jogo se ganha ou perde nos primeiros 5 min).

### P1.4 — Nível recomendado por zona + agrupar/esconder abas · M
Level 8 libera ~90 zonas de 20 cidades de uma vez (`cities.js:66`), sem `reqLevel` e sem dica de dificuldade — o caminho "certo" é invisível (monstros não escalam). Adicionar hint de **nível recomendado** (derivável de HP/atk/xp do monstro) no zone picker; agrupar abas por seção (Combate/Progressão/Economia/Social) e travar features até o nível de unlock. Reduz o "cliff" do level 8 e o overwhelm.

### P1.5 — Celebrar marcos + badges de "tem coisa pra pegar" · M
- **Level-up passa quase mudo** (só toast + log) — o beat de dopamina nº1 do RPG merece burst na tela + "HP/MP restaurados". Combate já é juicy; a meta-progressão não.
- **Zero badge nas 15 abas** (só Daily tem "!"). Tier de BP resgatável, task completa, charm agora acessível, promoção disponível — tudo invisível até abrir a aba. Adicionar badge de "resgatável".
- **Boosted-of-the-day sem CTA**: card mostra a criatura 2× XP mas não leva pra zona dela. Fazer clicar → zone picker filtrado.
- **Título da aba do browser** ("(1) Rubinot Idle") quando há algo pra resgatar — gancho de re-engajamento mais barato sem push.

---

## P2 — Profundidade / conteúdo (escolha de build + cadência)

### P2.1 — Tiers de charm (Minor/Major) + expansão · M · `[server]`
Hoje 6 charms flat / 3 slots, e 3 deles são econômicos (scavenge/gut/divine), então o set ótimo de farm é fixo. Crystal tem categorias **CHARM_MINOR/MAJOR** + offensive/defensive + "charm expansion". Fonte: `reference/crystalserver/data/scripts/systems/bestiary_charms.lua`. Também **absorve a inflação de charm points** (P2.8).

### P2.2 — Tiers de imbuement + armadura/skill · M · `[server]`
Só 3 imbuements, weapon-only, um tier — você sempre slota o único que ajuda, sem tradeoff. Tibia tem ~14 tipos em 3 tiers (basic/intricate/powerful): skill, resistência elemental, speed, capacity, leech. Adicionar slot de armadura/helm + 2–3 resistências já cria **a primeira decisão defensivo-vs-ofensivo** real.

### P2.3 — Prey Wildcards + Concoctions · S–M · `[server]`
- **Wildcards**: moeda de bestiário/task pra rerolar a *lista* de prey ou travar o bônus. Base de prey já é fiel (`ioprey.cpp`).
- **Concoctions**: buffs temporizados com cooldown (extensão de stamina, XP boost, `BestiaryBetterment` 2×). Fonte: `concoctions.lua`. **Gancho de re-engajamento clássico** — recompensa logar pra reativar.

### P2.4 — Sink de gold que escala com riqueza · M · `[server]`
Com autosell + charm Gut + boost, a renda supera todo sink recorrente → gold vira hoarding sem sentido. Duas opções **[CANON]** já latentes no código: (a) **vender Exercise Weapons na loja** (consumíveis, já existem como reward de task); (b) **house rent** (sink recorrente canônico). *Nota: se o Forge (P0.3) entrar, ele já é o grande sink de gold.*

### P2.5 — Aprofundar o sink de Rubini · M
Rubini só se gasta em boost de 30 min e unlock de BP (250). Pra moeda vendida por dinheiro real, o menu é raso. Adicionar sinks de conveniência (boosts mais longos, packs de wildcard, tentativas extra de arena, outfits/mounts cosméticos) — dentro da regra "premium compra velocidade, não poder".

### P2.6 — Rebalancear XP de task vs curva de level · M
Tasks repetíveis pagam até **30M XP** (rooms #91–94); total até o cap é 15,69M. Uma entrega vaulta o jogador quase até o teto → leveling é incidental. Amarrar à decisão do P0.1: com cap alto viram cauda longa; senão, reescalar. *(Os números de XP são dado do RubinOT, não canon de servidor — reescalar é legítimo.)*

### P2.7 — Streak de daily + cadência semanal · S
Daily reward tem só 7 entradas rasas que repetem pra sempre; sem milestone de streak longo. Alongar o ciclo / adicionar marco de 30 dias. Recompensas não-materiais mantêm a regra.

### P2.8 — Funil de recompensa pras ladders infinitas · M
Boss Rush tier, skill grind e bestiário são infinitos mas mal recompensados (só prestige/vanity, e bestiário satura em 6 charms). Dar payoff aos marcos (charm points / unlock de imbuement / wildcards — tudo dentro da regra não-material). Converte "o jogo acaba no 100" em "sempre tem um tier/skill/bestiário pra hoje". *Fortemente ligado a P0.2, P2.1.*

---

## P3 — Quick wins (baixo risco, dá pra batelar já)

- [x] ~~**[perf] Battle list re-renderiza 2× por evento de combate**~~ — ✅ **JÁ RESOLVIDO**: `renderBattleList()` (`huntPanel.js:435`) coalesce via `requestAnimationFrame` + guard `_battleListScheduled`, então 2 chamadas = 1 render/frame. Backlog estava desatualizado.
- [x] ~~**[a11y] Foco de teclado invisível**~~ — ✅ **JÁ FEITO**: `:focus-visible` global já existe no `style.css` (2 regras). Backlog desatualizado.
- **[a11y/perf] Sprites sem `loading`/`decoding`/`alt`** — `tibiaSprites.js:149`. ⚠️ **CUIDADO**: `loading="lazy"` já causou o bug de sprites sumindo na batalha (revertido, ver `0a7b60eb` / memory). Só adicionar `decoding="async"` + `alt`, **nunca lazy** no helper compartilhado. · S
- [x] ~~**[a11y] Reduced-motion abrangente**~~ — ✅ **JÁ FEITO**: `style.css` tem 10 regras `prefers-reduced-motion`. Backlog desatualizado.
- [x] ~~**[robustez] `window.onunhandledrejection`**~~ — ✅ **JÁ FEITO**: `index.html:631` captura TODA promise rejeitada (cura se for módulo, senão `console.error('[unhandledrejection]', msg)` com contexto). Backlog desatualizado.
- [x] ~~**[i18n] Sobras de PT num jogo default-EN**~~ — ✅ **JÁ FEITO**: welcome usa `t('log.welcome')` (`main.js:199`); os "Missões Semanais/SEMANAIS" restantes são **comentários de código** (PT é ok em comentário), não string visível. Guard de paridade en/pt agora no CI (abaixo).
- [x] ~~**[correção] Comentário mentiroso** — `bestiary.js:2649`~~ — ✅ **JÁ RESOLVIDO**: o comentário agora diz corretamente que as criaturas NÃO escalam com o nível (bate com `combatFormulas.js`).
- [x] ~~**[UX] Busca no market e no bestiário**~~ — ✅ **FEITO**: market já tinha typeahead; bestiário agora tem campo de busca por nome (`#bestiary-search` + `bestiarySearchInput`, verificado no browser: 3→2 no match, 0 no não-match, restaura ao limpar). `1edf2a20`.
- [x] ~~**[CI] Enforçar os guards no deploy**~~ — ✅ **FEITO**: `.github/workflows/guards.yml` roda `check-import-versions` + `check-imports-faltando` + `i18n-check` (paridade en/pt, agora com exit 1) em cada push/PR.

---

## P4 — Safety net / acessibilidade / mobile (passe de polish)

- **[test] CI rodando o smoke set dos ~130 probes** — `scripts/probe-*.mjs`/`audit-*.mjs` só rodam manualmente contra prod. Gatear deploy no set crítico (`probe-smoke`, `probe-kill`, `audit:static`). Hoje regressão só aparece se o Felipe reroda. · M
- **[test] Unit test das fórmulas de combate** — `stats.js` + `huntEngine` só são exercitados por Playwright contra prod. Umas asserções puras (monstro+gear conhecidos → dano conhecido) pegam regressão em segundos. Memory exige TFS/Crystal exato. · M
- **[a11y] Semântica de dialog nos modais** — 1 atributo aria no `index.html` inteiro. Modais sem `role="dialog"`, focus trap, Escape consistente, retorno de foco ao opener. · M
- **[a11y] ARIA de tablist nas abas** — botões focáveis (bom) mas sem `role="tab"/tablist"`, `aria-selected`. · M
- **[mobile] Breakpoint único + fonte base 12px** — shell de 3 colunas colapsa num breakpoint só (900px); `font-size:12px` é pequeno pra celular; alvos de toque não auditados. Idle pega muito tráfego mobile. · M–L
- **[obs] Log estruturado no servidor** — ~13 `console.error` free-form só com `session.id`. Wrapper fino (level/ts/sessionId/event) paga na próxima incidência. · S–M

---

## 🩹 Já mapeado noutra frente (não encostar aqui)

- **Segurança de economia** (sessão paralela): boosts client-authoritative → servidor, rubini 2 fontes de verdade, gold → delta atômico.
- **`/task/complete` registra mas NÃO concede a recompensa server-side** — flag pra outra sessão.
- **Monk Harmony/Virtue (fase 2)** — 5ª vocação, mecânica avançada pendente (`fonte-monk-crystalserver`).

---

