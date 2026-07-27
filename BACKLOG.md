# Rubinot Idle — Backlog

**Regras permanentes:** nada inventado (regra/valor/efeito/sprite rastreável ao Tibia/Crystal em `reference/crystalserver/`) · prêmios não-materiais (Arena/BP só boost/charm/carta de prey/varinha de treino) · combate = fonte de verdade no servidor · **sprite de monstro só do cliente do Tibia, sem fallback** (Regra 2.1 do spec).

**Legenda:** `S` <½ dia · `M` 1–2 dias · `L` multi-dia · `[server]` muda o servidor · `[CANON]` mais fiel ao Tibia · `[decisão]` precisa o Felipe decidir antes.

> Só o que está **aberto**. Entregas concluídas ficam no `finished.md`.

---

## Decisões pendentes (precisam do Felipe)
- [x] **exori quase não dispara pelo RTC** — DECIDIDO+FEITO: a reserva de mana de cura agora só vale quando a cura é iminente (HP < gatilho); com HP alto o exori (125) dispara livre. Não muda o custo canônico. — `a1463034`
- [x] **Sprites de monstro "cortadas"** (zone picker + boss zone) — DECIDIDO+FEITO: respiro leve (scale .86) nos previews pequenos; criatura aparece inteira e centrada. Palco de batalha mantém o 1:1 nativo. — `20130fc9`

## Estética
- [x] Contraste geral no tema dark (nome da vocação, `muted`, rótulo CREATURE do Boosted) — já satisfeito: inversão navy resolveu o voc-name; `muted` e `boosted-label` medem 9:1 em prod; tudo legível no screenshot dark (verificado, sem mudança)
- [x] Loja Premium: remover o texto "(Dinheiro Real)" do botão — já satisfeito: nenhum botão exibe "(Dinheiro Real)"; aba = "💳 Loja Premium" e o preço mostra "R$ x,xx"
- [x] Abas "leves" (Worlds/Highscores/Market/Shop) deixam ~40% inferior da tela como gradiente morto — `#app` estica as colunas até embaixo (rail navy + aside emolduram a página); gradiente morto abaixo do conteúdo 40%→7% — `0b81c23b`
- [x] Letterbox do palco de batalha — tarjas pretas grossas, área jogável pequena — cena agora preenche 100% da largura (era 560px fixos) — `2ba4e122`
- [x] **Barras de vida/mana overhead estilo cliente Tibia** — barras finas HP verde + Mana azul sobre o boneco, sem número (o valor mora no rail); player mostra só o **nick** (sem nível/vocação); cada monstro no palco ganhou o **nome** sobre a barra de vida. Verificado em prod (nick "ClaudePala", 4 Rats nomeados, labels ocultas, barra 5px) — `2e90298e`

## Funcional / UX
- [x] **HP/Mana em cima do personagem** · M — barra de vida/mana sobre o boneco no palco (estilo cliente) + remover os HP/Mana duplicados dentro do palco — `466e7e22`
- [x] Menu de clique-direito customizado (tema Tibia) no lugar do nativo do navegador — criatura (Atacar/Bestiário) e item da mochila (Examinar/Vender); suprime o nativo nesses alvos — `1a4ddf73`
- [ ] **Imbuir item da MOCHILA** · `[server]` — hoje o imbuement mora por `eq_slot`; imbuir item da mochila exige guardar por instância de item (refactor de dados + persistência). PARADO (risco de save): o `player_inventory` guarda pilhas fungíveis (item_id + qty), sem identidade por instância. Imbuir um item específico da bag exige migrar o inventário de pilhas → instâncias, o que reescreve equip/venda/sell-all/loot/market/auto-sell/drag e MIGRA todo save existente. Alto risco de corromper progresso — merece sessão isolada com migração aditiva/reversível e teste dedicado, não um dreno amplo.
- [ ] **Boss Zone com bosses REAIS** · `[CANON]` · `[server]` — cada zona usa o boss canônico da criatura (nome/sprite/stats/loot). PARADO (economia + escala + sprite): hoje `zone.boss` é uma criatura mais forte da zona (ex.: `wolf_den`→`wolf`), não o boss nomeado real. Trocar por bosses reais em 48 zonas (a) muda **loot = economia** em massa (drop valioso → gold; merece aval do Felipe), (b) exige **sprite do cliente sem fallback** por boss (Regra 2.1) — auditoria de disponibilidade por criatura, e (c) é conteúdo grande (48 bosses canônicos com stats/loot da fonte). Fazer conservador + com o aval do loot.
- [x] **BUG: "Vender todos" ignora o item equipado** — equipar não tira o item de `player_inventory` (só grava em `player_equipment`), então "Vender todos" vendia a cópia equipada e desequipava. Servidor agora exclui as cópias equipadas do total vendável (recusa se for equipado-sem-sobra); cliente conta só a bag (`bagQty`) e esconde os botões de venda quando não há sobra. Verificado em prod: banco mostra toda peça equipada com `inv_qty≥1` após sell-all; probe cliente PASSOU — `478981b2`

## Features
- [x] **Sistema de Quests (raids com prêmio real)** · L — spec + 3 quests reais (ondas → chefe → prêmio real do Tibia, não-repetível); aba Quests; servidor concede o prêmio server-authoritative + rastreia conclusão (coluna completed_quests) — `d0578cbd` — ✅ e2e prod: raid roda, chefe cai, Knight Armor concedido, completed_quests=[orc_fortress]
- [ ] `[decisão]` **Prey fiel ao Tibia** · M — AUDITADO 2026-07-26: a MECÂNICA já bate exatamente o `ioprey.cpp` (bônus damage 2r+5 / defense 2r+10 / xp+loot 3r+10; raridade `uniform_random(r+1,10)`; reroll de tipo na raridade 10) e os ícones usam sprites reais. A única divergência é a SELEÇÃO: Tibia dá uma lista aleatória de monstros por slot; aqui é escolha livre (simplificação idle). Decisão do Felipe: manter a escolha livre (recomendado, mais idle-friendly) OU adotar a lista aleatória do Tibia?

## Endgame — sink infinito (P0/P1)
- [ ] **Wheel of Destiny** · L · `[server]` — grade de talentos pós-max; sink de pontos infinito (fonte `io_wheel.cpp`)
- [ ] **Forge + Item Tier** · L · `[server]` — funde equipamento duplicado → tier 1–10; sink de gold que escala (fonte `item_tiers.lua`)
- [x] **Cyclopedia (Hunt/Loot/XP Analyser)** · M — painel de throughput (XP/h, gold/h, loot vs waste); dado quase todo já existe — Hunt Analyzer já tinha XP/h e gold/h; adicionadas taxas loot/h e suprimentos/h (loot vs desperdício) — `328cf405`
- [ ] **Bosstiary** · M · `[server]` — kills de boss → boss points → slots/prowess (fonte `io_bosstiary.cpp`)
- [x] **Onboarding do 1º minuto** · M — coach-mark de 3 passos (caçar → loot → gastar) com spotlight, mostrado 1x, skip + persistência — `f9df3a10`
- [ ] **Nível recomendado por zona + agrupar abas** · M · `[decisão]`/dados — hint de nível no zone picker; agrupar/travar abas até o unlock. PARADO: (1) "nível recomendado" numérico não tem fonte canônica — os monstros só têm hp/atk/def/xp, sem nível; exigiria auditoria manual dos níveis sugeridos por zona na TibiaWiki (vira pendência de dados). (2) "travar abas até o unlock" é decisão de produto (quais abas, quando) que muda o fluxo — precisa do Felipe. Zone picker já poderia mostrar o gate real (`requiresBossOf`/`worldReq`) como hint factual.
- [x] **Celebrar marcos: badges de charm/promoção** — selo na aba Bestiário quando há charm point pra desbloquear um charm (atualiza com a aba fechada); promoção já sinaliza pelo botão habilitado no card — `342b1000`

## Profundidade / conteúdo (P2)
- [ ] **Tiers de charm (Minor/Major) + expansão** · M · `[server]` — categorias + Charm Expansion (fonte `bestiary_charms.lua`)
- [x] **Tiers de imbuement (Basic/Intricate/Powerful)** · `[server]` — valores canônicos do Crystal (Vampirism 5/10/25%, Scorch 10/25/50%, proteções 3/8/15%, Lich 2/5/10%); UI escolhe o tier (efeito%+custo escalado), servidor valida+grava, combate lê; RETROCOMPAT (imbuement sem tier = valor antigo) — `ac3aae7e`
- [ ] **Prey Wildcards + Concoctions** · S–M · `[server]` — wildcards pra rerolar/travar; concoctions = buffs temporizados
- [ ] **Sink de gold que escala** · M · `[server]` · `[CANON]` — Exercise Weapons na loja e/ou house rent (se o Forge entrar, ele já é o sink)
- [ ] **Aprofundar o sink de Rubini** · M — boosts mais longos, packs de wildcard, tentativas de arena, cosméticos
- [x] **Streak de daily + cadência semanal** · S — streak longo de dias consecutivos; marco de 30 dias dá boost de XP 2h (não-material); banner de progresso no modal; server-authoritative (coluna long_streak) — `f63c755e`
- [ ] **Funil de recompensa pras ladders infinitas** · M — Boss Rush/skill/bestiário dão payoff nos marcos (charm/imbue/wildcard)

## Infra / a11y / mobile (P4)
- [ ] **CI rodando os guards no push/PR** · M · `[test]` — PRONTO, falta só o Felipe pushar: o workflow `.github/workflows/guards.yml` já está escrito (roda check-import-versions + check-imports-faltando + i18n-check + audit-static) e **os 4 guards passam hoje** (CI nasceria verde). Bloqueio ÚNICO: o token desta sessão não tem o `workflow` scope do GitHub, então não consigo commitar/pushar arquivos em `.github/workflows/`. AÇÃO DO FELIPE: `git add .github/workflows/guards.yml && git commit && git push` da sua máquina (auth normal) — pronto. (O smoke-set completo dos probes de browser pode entrar depois num 2º job, mas exige runner com Playwright.)
- [x] **Unit test das fórmulas de combate** (gear+monstro conhecidos → dano conhecido) · M · `[test]` — scripts/test-combat-formulas.mjs, 18 asserts determinísticos (getMaxWeaponDamage/melee, reduceElemental+cap 80, reducePhysical bordas, fight modes, mana) — `6007b9df`
- [x] **Mobile:** eliminada a rolagem lateral (char-skills estourava) + alvos de toque ≥40px (topbar/fight-mode/log) + fonte base já 12px; layout single-column ≤900px verificado em 390px — `a4d9c457`
- [x] **Log estruturado no servidor** (JSON level/ts/event/campos) — logger slog() em startup, listen e erro não-tratado (com method/path); grepável no railway logs — `e31ce9e2`

## Pendências de dados (manual, TibiaWiki — não sourceável automático)
- [x] **404 na aba Spells**: `destroy_field_rune` sem sprite → 404. Convertida a canônica do item-catalog pra items/Destroy_Field_Rune.webp — `63dc23c0`
- [x] ~~monstros com `atk>1500`~~ — INVESTIGADO 2026-07-27: **não é bug de gameplay**. Dos 171 com atk>1500, **167 são dados mortos** (não estão em zona nenhuma → não afetam jogo). Dos **4 alcançáveis**, 3 (mycobiontic_beetle/oozing_corpus/sopping_corpus) têm `atk=1600` = **exatamente o melee maxDamage canônico do Crystal** (endgame real, hp 28-33k); o venerable_foam_stalker (atk 1554) é variante forte fora do Crystal (plausível). Nenhum placeholder instakill alcançável. Dado morto pode ser limpo depois, mas é inócuo. — `014bd3ef`
- [ ] ~136 monstros com `hp` placeholder (até ~100× o real) — baixar hp exige rebalancear XP junto
- [ ] Maioria dos monstros custom sem `spells` — importar os `combat` dos `.lua`

## Noutra frente
- [ ] **Monk — 5ª vocação (do zero)** · L · `[server]` · `[decisão]` — CORRIGIDO 2026-07-27: não existe "fase 1"; `VOCATIONS` só tem knight/paladin/sorcerer/druid e não há magias de Monk. É a vocação INTEIRA: stats/regen/skill-mults/mana-mult + Fist Fighting como skill de ataque + magias (Tiger Clash `exori infir nia`, Double Jab `exori pug`, Sweeping Takedown `exori mas nia`, +greater) + **Harmony** (builder `addHarmony(1)` no Double Jab / spender `harmony(true)` no Tiger Clash, dano via `calculateMonkSpellDamage`) no motor server-authoritative + UI de barra de recurso. GATES: (a) `[decisão]` — **Virtue** é mecânica de GRUPO (cura o membro do grupo com menor %HP); num idle SOLO não traduz direto → como o Monk joga solo (bruiser puro? Virtue vira auto-sustain?) é decisão do Felipe que remodela a vocação e o balanço; (b) Regra 2.1 — precisa auditar sprite do outfit Monk + fists + efeitos (307/308) no cliente, sem fallback. Fonte: `reference/crystalserver` (spells/attack/*.lua, src/creatures) + `scripts/monk-reference.md`.
