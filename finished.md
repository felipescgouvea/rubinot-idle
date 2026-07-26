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
