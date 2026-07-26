# Rubinot Idle — Backlog

**Regras permanentes:** nada inventado (regra/valor/efeito rastreável ao Tibia/Crystal em `reference/crystalserver/`) · prêmios não-materiais (Arena/BP só dão boost/charm/carta de prey/varinha de treino) · combate = fonte de verdade no servidor.

**Legenda:** `S` <½ dia · `M` 1–2 dias · `L` multi-dia · `[server]` precisa mudar o servidor · `[CANON]` mais fiel ao Tibia.

> Registro do que já foi entregue fica no fim (`✅ Concluído`). Aqui em cima é só o que está **aberto**.

---

## 📌 Punch-list do Felipe (revisão ao vivo)

**Estética**
- [ ] Contraste geral no tema dark (nome da vocação, `muted`, rótulo CREATURE do Boosted)
- [ ] Cores dos botões da Loja (Premium/Rubini/Equipamentos/Artigos) — paleta destoante, retrabalhar
- [ ] Loja Premium: remover o texto "(Dinheiro Real)" do botão
- [ ] Sprites cortadas em alguns monstros (ex.: Valkyrie, Smuggler Baron Silvertoe nos cards de Boss Zone)
- [ ] Janela de detalhe do item está crua — melhorar visual e botões (Equipar/Vender/Fechar)
- [ ] Abas "leves" (Worlds/Highscores/Market/Shop) deixam ~40% inferior da tela como gradiente morto
- [ ] Letterbox do palco de batalha — tarjas pretas grossas, área jogável pequena
- [ ] Diferenciar HP/MP/XP no rail — barras parecidas e minúsculas

**Funcional / UX**
- [ ] **Boss Zone com bosses REAIS** `[CANON]` — cada zona usa o boss canônico da criatura (ex.: Rotworm Queen, não rotworm inflado); rever nome/sprite/stats/loot de todos
- [ ] HP/Mana do personagem no estilo do cliente do Tibia + remover HP/Mana duplicados dentro do palco
- [ ] Fechar o detalhe do item deve VOLTAR pra mochila (não fechar tudo)
- [ ] Menu de clique-direito customizado (tema Tibia) no lugar do nativo do navegador
- [ ] **BUG: comprar munição em lote na Loja de Equipamentos compra só 1** — a janela de trade mostra o seletor de quantidade pra ammo (`isBulkItem` inclui `'ammo'`, `shopPanel.js:194`) e o botão passa a qty selecionada (`shopPanel.js:269`), mas `confirmBuyShopItem` só multiplica pra poção/runa (`shopPanel.js:99`) → ammo cai no `count=1`: seleciona 50 flechas, o modal confirma "1x" e compra **1**. Fix: incluir `ammo` no cálculo de `count`. · S
- [ ] **auto-sell** — não é bug: default `maxValue=50` baixo demais (junk vale 55–243). Decisão de economia do Felipe: subir default / presets ("vender lixo comum") / vender por valor ignorando `type`

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
  - [ ] Badges de "resgatável" nas abas (BP/task/charm/promoção — hoje só Daily tem "!"). Reusa os flags de `notifyTitle.js`
  - [ ] Boosted-of-the-day sem CTA — clicar no card leva ao zone picker filtrado pela criatura

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

- [ ] **[a11y/perf] Sprites: `decoding="async"` + `alt`** no helper compartilhado — ⚠️ NUNCA `loading="lazy"` (já sumiu sprite na batalha, ver Concluído) · S
- [ ] **[UX] #5 `KILL_COUNTERS` sem listener** (`huntUseCases.js`) — progresso de bestiário/charm só atualiza ao reabrir a aba. Cosmético; falta definir o refresh certo do painel
- [ ] **[dívida] Código de outfit morto na Loja** — outfits saíram do catálogo (`shopCatalog.js:9-10`, nenhum `type:'outfit'` em `SHOP_ITEMS`), mas `shopPanel.js` ainda carrega os branches de outfit (owned/wearing + `background:#fdf4d7` hardcoded fora do tema) em ~94/114-115/145/147 — nunca renderiza; remover. · S

## P4 — Safety net / a11y / mobile

- [ ] **[test]** CI rodando o smoke set dos probes (`probe-smoke`/`probe-kill`/`audit:static`) pra gatear deploy · M
- [ ] **[test]** Unit test das fórmulas de combate (monstro+gear conhecidos → dano conhecido) · M
- [ ] **[a11y]** Semântica de `dialog` nos modais (role, focus trap, Escape, retorno de foco) · M
- [ ] **[a11y]** `role="tab"/tablist"` + `aria-selected` nas abas · M
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
