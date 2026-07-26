# Entregas (finished) — log append-only do `/backlog` e `/fix`

Uma linha por entrega. `/test` lê as linhas sem carimbo, testa, e anexa `✅`/`🐛` no fim.

- 2026-07-26 — fix(loja): comprar munição em lote respeita a quantidade selecionada (era sempre 1) — `fa3ae3ac` — ✅ testado 2026-07-26 (probe-shop-ammo + smoke-prod, 0 erros)
- 2026-07-26 — feat(ux): selo de "resgatável" nas abas Tasks e Battle Pass (P1.5) — `094902a9` — ✅ testado 2026-07-26 (probe-tab-badges + smoke-prod, 0 erros)
- 2026-07-26 — feat(ux): Boosted Creature clicável → abre o zone picker da criatura (P1.5) — `08ad171b` — 🐛 BUG 2026-07-26 (defects.md: inerte pra criatura não-huntável) → corrigido por `673f522f`
- 2026-07-26 — fix(boosted): pool da Boosted Creature restrito a criaturas huntáveis (CTA sempre acha a zona) — `673f522f` — ✅ testado 2026-07-26 (probe-boosted-cta: clicável, abre modal, 0 erros + smoke-prod)
- 2026-07-26 — style(rail): cor de canal por vital (outline colorido HP/MP/XP) — `fb718c4e` — ✅ testado 2026-07-26 (screenshot shot-rail-vitals nos 2 temas: halos vermelho/azul/dourado nítidos)
