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
- [ ] Ícone estranho no Boosted (rótulo CREATURE 🐗) — trocar
- [x] Cards de **igual altura** independente do texto (Battle Pass + zonas de hunt) — `34e263ce`
- [x] Texto da **aba selecionada** no log invisível no dark — `896ff386`
- [ ] Ícone estranho no Boosted (rótulo CREATURE 🐗) + revisar contraste dark geral (voc name, muted)

**Funcional / UX**
- [~] **auto-sell não funciona** — caminho client→server→settleKill traçado e CORRETO; junk é `type:misc` com sell (cyclops_toe=55>max50, mouldy_cheese=0 não vende). Provável teto (maxValue) / item worth 0. **Falta repro ao vivo (rate-limit).**
- [x] Botão **Trocar Hunt** habilitado só quando NÃO está caçando — `34e263ce`
- [x] **Janela de morte estilo Tibia** (OK bloqueante antes de continuar) — `f324754d`
- [ ] Paladino — **flecha fantasma** (BUG): 1º hit HS + monstro demora a morrer → 2ª flecha que não devia. **Falta repro (rate-limit).**
- [x] **Imbuements**: janela recriada fiel ao shrine do Tibia (item no slot, fontes astrais em sprite, tema) — `4186835a`
- [x] **Market recriado do zero** fiel ao Tibia: navegador de itens (busca + sprite) + detalhe com ofertas venda/compra + criar oferta, sem `<select>` nativo — `cedb8c18`

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

- **[perf] Battle list re-renderiza 2× por evento de combate** — `huntPanel.js:688` (MONSTER_DISPLAY) e `:696` (BATTLE_LIST) ambos chamam `renderBattleList()`, e o combate emite os dois eventos juntos. Tirar a chamada do handler de MONSTER_DISPLAY. **Bug real de perf no hot path.** · S
- **[a11y] Foco de teclado invisível** — só 3 regras `:focus` em 3252 linhas; `:711` faz `outline:none` em inputs. Adicionar `:focus-visible { outline: 2px solid var(--gold-bright); }` global. · S
- **[a11y/perf] Sprites sem `loading`/`decoding`/`alt`** — `tibiaSprites.js:149`. Adicionar `loading="lazy" decoding="async" alt`. Corta network do first-paint em shop/bestiário/market. · S
- **[a11y] Reduced-motion abrangente** — 31 keyframes, só 9 regras cobrindo ~6 elementos. Catch-all `@media (prefers-reduced-motion: reduce)`. · S
- **[robustez] `window.onunhandledrejection`** — hoje só captura falha de module-load. Cloud-save/atlas/realtime falham em silêncio. · S
- **[i18n] Sobras de PT num jogo default-EN** — log de boas-vindas (`main.js:197` "Bem-vindo…"), "Missões Semanais" (`index.html:455`), intro do Spells (`index.html:340-342`), seção buy do market (`marketPanel.js:63-80`). Rotear por `t()`. *(Market é da outra sessão — coordenar.)* · S
- **[correção] Comentário mentiroso** — `bestiary.js:2649` diz que criaturas escalam com nível; `combatFormulas.js:440` explicitamente NÃO escala. Corrigir o comentário. · S
- **[UX] Busca no market e no bestiário** — market despeja *todo* item vendável num `<select>` (`marketPanel.js:152`); bestiário lista tudo sem filtro. Typeahead + filtro "perto do próximo charm point". · S–M
- **[CI] Enforçar os guards no deploy** — `check-import-versions.mjs` + `check-imports-faltando.mjs` só rodam se alguém lembrar. Wire num pre-push hook ou GH Action. · S

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

