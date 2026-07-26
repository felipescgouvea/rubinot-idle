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
- [ ] **Barras de vida/mana overhead estilo cliente Tibia** — deixar as barras sobre o personagem iguais à screenshot (HP verde + Mana azul finas); mostrar só o **nick** do personagem (sem nível nem vocação); nos **monstros**, só barra de vida + nome — (screenshot anexada, salvar manualmente)

## Funcional / UX
- [x] **HP/Mana em cima do personagem** · M — barra de vida/mana sobre o boneco no palco (estilo cliente) + remover os HP/Mana duplicados dentro do palco — `466e7e22`
- [x] Menu de clique-direito customizado (tema Tibia) no lugar do nativo do navegador — criatura (Atacar/Bestiário) e item da mochila (Examinar/Vender); suprime o nativo nesses alvos — `1a4ddf73`
- [ ] **Imbuir item da MOCHILA** · `[server]` — hoje o imbuement mora por `eq_slot`; imbuir item da mochila exige guardar por instância de item (refactor de dados + persistência)
- [ ] **Boss Zone com bosses REAIS** · `[CANON]` — cada zona usa o boss canônico da criatura (nome/sprite/stats/loot)

## Features
- [ ] **Sistema de Quests (raids com prêmio real)** · L — começar por quests simples (não-alavanca); cada quest = raid com começo/meio/fim; **1 prêmio real de quest do Tibia por quest** (não repetível). Editar `.spec/` antes
- [ ] `[decisão]` **Prey fiel ao Tibia** · M — AUDITADO 2026-07-26: a MECÂNICA já bate exatamente o `ioprey.cpp` (bônus damage 2r+5 / defense 2r+10 / xp+loot 3r+10; raridade `uniform_random(r+1,10)`; reroll de tipo na raridade 10) e os ícones usam sprites reais. A única divergência é a SELEÇÃO: Tibia dá uma lista aleatória de monstros por slot; aqui é escolha livre (simplificação idle). Decisão do Felipe: manter a escolha livre (recomendado, mais idle-friendly) OU adotar a lista aleatória do Tibia?

## Endgame — sink infinito (P0/P1)
- [ ] **Wheel of Destiny** · L · `[server]` — grade de talentos pós-max; sink de pontos infinito (fonte `io_wheel.cpp`)
- [ ] **Forge + Item Tier** · L · `[server]` — funde equipamento duplicado → tier 1–10; sink de gold que escala (fonte `item_tiers.lua`)
- [x] **Cyclopedia (Hunt/Loot/XP Analyser)** · M — painel de throughput (XP/h, gold/h, loot vs waste); dado quase todo já existe — Hunt Analyzer já tinha XP/h e gold/h; adicionadas taxas loot/h e suprimentos/h (loot vs desperdício) — `328cf405`
- [ ] **Bosstiary** · M · `[server]` — kills de boss → boss points → slots/prowess (fonte `io_bosstiary.cpp`)
- [x] **Onboarding do 1º minuto** · M — coach-mark de 3 passos (caçar → loot → gastar) com spotlight, mostrado 1x, skip + persistência — `f9df3a10`
- [ ] **Nível recomendado por zona + agrupar abas** · M — hint de nível no zone picker; agrupar/travar abas até o unlock
- [x] **Celebrar marcos: badges de charm/promoção** — selo na aba Bestiário quando há charm point pra desbloquear um charm (atualiza com a aba fechada); promoção já sinaliza pelo botão habilitado no card — `342b1000`

## Profundidade / conteúdo (P2)
- [ ] **Tiers de charm (Minor/Major) + expansão** · M · `[server]` — categorias + Charm Expansion (fonte `bestiary_charms.lua`)
- [ ] **Tiers de imbuement + slot de armadura/skill** · M · `[server]` — hoje 3 weapon-only/1 tier; Tibia tem ~14 em 3 tiers
- [ ] **Prey Wildcards + Concoctions** · S–M · `[server]` — wildcards pra rerolar/travar; concoctions = buffs temporizados
- [ ] **Sink de gold que escala** · M · `[server]` · `[CANON]` — Exercise Weapons na loja e/ou house rent (se o Forge entrar, ele já é o sink)
- [ ] **Aprofundar o sink de Rubini** · M — boosts mais longos, packs de wildcard, tentativas de arena, cosméticos
- [x] **Streak de daily + cadência semanal** · S — streak longo de dias consecutivos; marco de 30 dias dá boost de XP 2h (não-material); banner de progresso no modal; server-authoritative (coluna long_streak) — `f63c755e`
- [ ] **Funil de recompensa pras ladders infinitas** · M — Boss Rush/skill/bestiário dão payoff nos marcos (charm/imbue/wildcard)

## Infra / a11y / mobile (P4)
- [ ] **CI rodando o smoke set dos probes** pra gatear deploy · M · `[test]`
- [x] **Unit test das fórmulas de combate** (gear+monstro conhecidos → dano conhecido) · M · `[test]` — scripts/test-combat-formulas.mjs, 18 asserts determinísticos (getMaxWeaponDamage/melee, reduceElemental+cap 80, reducePhysical bordas, fight modes, mana) — `6007b9df`
- [x] **Mobile:** eliminada a rolagem lateral (char-skills estourava) + alvos de toque ≥40px (topbar/fight-mode/log) + fonte base já 12px; layout single-column ≤900px verificado em 390px — `a4d9c457`
- [x] **Log estruturado no servidor** (JSON level/ts/event/campos) — logger slog() em startup, listen e erro não-tratado (com method/path); grepável no railway logs — `e31ce9e2`

## Pendências de dados (manual, TibiaWiki — não sourceável automático)
- [x] **404 na aba Spells**: `destroy_field_rune` sem sprite → 404. Convertida a canônica do item-catalog pra items/Destroy_Field_Rune.webp — `63dc23c0`
- [ ] ~119 monstros custom/evento com `atk>1500` (não existem no Crystal) — `scripts/audit-monster-atk.mjs --thresh=1500`
- [ ] ~136 monstros com `hp` placeholder (até ~100× o real) — baixar hp exige rebalancear XP junto
- [ ] Maioria dos monstros custom sem `spells` — importar os `combat` dos `.lua`

## Noutra frente
- [ ] **Monk Harmony/Virtue (fase 2)** · L — 5ª vocação, mecânica avançada (`fonte-monk-crystalserver`)
