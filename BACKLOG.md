# Rubinot Idle — Backlog

**Regras permanentes:** nada inventado (regra/valor/efeito/sprite rastreável ao Tibia/Crystal em `reference/crystalserver/`) · prêmios não-materiais (Arena/BP só boost/charm/carta de prey/varinha de treino) · combate = fonte de verdade no servidor · **sprite de monstro só do cliente do Tibia, sem fallback** (Regra 2.1 do spec).

**Legenda:** `S` <½ dia · `M` 1–2 dias · `L` multi-dia · `[server]` muda o servidor · `[CANON]` mais fiel ao Tibia · `[decisão]` precisa o Felipe decidir antes.

> Só o que está **aberto**. Entregas concluídas ficam no `finished.md`.

---

## Decisões pendentes (precisam do Felipe)
- [ ] `[decisão]` `[server]` `[balanço]` **exori quase não dispara pelo RTC** — mana-gated: knight lvl 35 precisa de ~70% do pool (`mana − reservaCura ≥ 125`). Opções: não reservar cura contra a única spell armada / subir mana base do knight / orientar mana potion no RTC. NÃO baixar o custo (125 é o valor canônico do Crystal).
- [ ] `[decisão]` **Sprites de monstro "cortadas"** (zone picker + boss zone) — é a pose NATIVA 1:1 do cliente enchendo o frame 64px (Valkyrie/Silvertoe já são do cliente). Aceitar como está OU permitir padding leve nas criaturas que enchem o frame (desvio do 1:1)?

## Estética
- [ ] Contraste geral no tema dark (nome da vocação, `muted`, rótulo CREATURE do Boosted)
- [x] Loja Premium: remover o texto "(Dinheiro Real)" do botão — já satisfeito: nenhum botão exibe "(Dinheiro Real)"; aba = "💳 Loja Premium" e o preço mostra "R$ x,xx"
- [ ] Abas "leves" (Worlds/Highscores/Market/Shop) deixam ~40% inferior da tela como gradiente morto
- [ ] Letterbox do palco de batalha — tarjas pretas grossas, área jogável pequena

## Funcional / UX
- [x] **HP/Mana em cima do personagem** · M — barra de vida/mana sobre o boneco no palco (estilo cliente) + remover os HP/Mana duplicados dentro do palco — `466e7e22`
- [ ] Menu de clique-direito customizado (tema Tibia) no lugar do nativo do navegador
- [ ] **Imbuir item da MOCHILA** · `[server]` — hoje o imbuement mora por `eq_slot`; imbuir item da mochila exige guardar por instância de item (refactor de dados + persistência)
- [ ] **Boss Zone com bosses REAIS** · `[CANON]` — cada zona usa o boss canônico da criatura (nome/sprite/stats/loot)

## Features
- [ ] **Sistema de Quests (raids com prêmio real)** · L — começar por quests simples (não-alavanca); cada quest = raid com começo/meio/fim; **1 prêmio real de quest do Tibia por quest** (não repetível). Editar `.spec/` antes
- [ ] **Prey fiel ao Tibia** · M · `[server]` — reformar mecânica + sprites (fonte: `ioprey.cpp`)

## Endgame — sink infinito (P0/P1)
- [ ] **Wheel of Destiny** · L · `[server]` — grade de talentos pós-max; sink de pontos infinito (fonte `io_wheel.cpp`)
- [ ] **Forge + Item Tier** · L · `[server]` — funde equipamento duplicado → tier 1–10; sink de gold que escala (fonte `item_tiers.lua`)
- [ ] **Cyclopedia (Hunt/Loot/XP Analyser)** · M — painel de throughput (XP/h, gold/h, loot vs waste); dado quase todo já existe
- [ ] **Bosstiary** · M · `[server]` — kills de boss → boss points → slots/prowess (fonte `io_bosstiary.cpp`)
- [ ] **Onboarding do 1º minuto** · M — coach-mark de 3 passos (caçar → loot → gastar) + one-liner nas abas avançadas
- [ ] **Nível recomendado por zona + agrupar abas** · M — hint de nível no zone picker; agrupar/travar abas até o unlock
- [ ] **Celebrar marcos: badges de charm/promoção** — mesmo `setTabBadge`, falta o sinal de claimable de cada um (follow-up)

## Profundidade / conteúdo (P2)
- [ ] **Tiers de charm (Minor/Major) + expansão** · M · `[server]` — categorias + Charm Expansion (fonte `bestiary_charms.lua`)
- [ ] **Tiers de imbuement + slot de armadura/skill** · M · `[server]` — hoje 3 weapon-only/1 tier; Tibia tem ~14 em 3 tiers
- [ ] **Prey Wildcards + Concoctions** · S–M · `[server]` — wildcards pra rerolar/travar; concoctions = buffs temporizados
- [ ] **Sink de gold que escala** · M · `[server]` · `[CANON]` — Exercise Weapons na loja e/ou house rent (se o Forge entrar, ele já é o sink)
- [ ] **Aprofundar o sink de Rubini** · M — boosts mais longos, packs de wildcard, tentativas de arena, cosméticos
- [ ] **Streak de daily + cadência semanal** · S — marco de streak longo (30 dias), recompensa não-material
- [ ] **Funil de recompensa pras ladders infinitas** · M — Boss Rush/skill/bestiário dão payoff nos marcos (charm/imbue/wildcard)

## Infra / a11y / mobile (P4)
- [ ] **CI rodando o smoke set dos probes** pra gatear deploy · M · `[test]`
- [ ] **Unit test das fórmulas de combate** (gear+monstro conhecidos → dano conhecido) · M · `[test]`
- [ ] **Mobile:** breakpoint único (900px) + fonte base 12px + alvos de toque auditados · M–L
- [ ] **Log estruturado no servidor** (level/ts/sessionId/event) · S–M · `[obs]`

## Pendências de dados (manual, TibiaWiki — não sourceável automático)
- [ ] ~119 monstros custom/evento com `atk>1500` (não existem no Crystal) — `scripts/audit-monster-atk.mjs --thresh=1500`
- [ ] ~136 monstros com `hp` placeholder (até ~100× o real) — baixar hp exige rebalancear XP junto
- [ ] Maioria dos monstros custom sem `spells` — importar os `combat` dos `.lua`

## Noutra frente
- [ ] **Monk Harmony/Virtue (fase 2)** · L — 5ª vocação, mecânica avançada (`fonte-monk-crystalserver`)
