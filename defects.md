# Defeitos (defects) — log append-only do `/test`

Um bloco por defeito. O `/fix` anexa `🔧 corrigido`/`⏭️ pulado` no cabeçalho `##`.

## 2026-07-26 — Boosted CTA inerte pra criatura não-huntável — `08ad171b` — 🔧 corrigido 2026-07-26 `673f522f`
- **Entrega:** feat(ux): Boosted Creature clicável → abre o zone picker da criatura (P1.5)
- **Como testei:** probe-boosted-cta (login em prod → checa o card `.boosted-clickable` no #boosted-body)
- **O que quebrou:** o card da Boosted Creature de hoje (`rootthing_bug_tracker`) não ficou clicável — a criatura não vive em nenhuma zona de hunt. `boostedCreatureForDate` sorteava em TODO o bestiário não-boss; ~63% (38/60) caíam em criaturas de task-room/boss-rush/evento sem zona.
- **Evidência:** `{"clickable":false}`; auditoria: 22/60 criaturas boosted com zona.
- **Repro:** abrir a aba Caçada num dia em que a boosted é não-huntável → card sem cursor/clique.
- **Fix:** `673f522f` — pool da Boosted Creature restrito à união dos `monsters` das zonas (criaturas huntáveis). 117 distintas em 120 dias, 100% com zona. Re-teste: clicável, abre o zone picker, 0 erros.

## 2026-07-26 — Escape no detalhe do item (da Bag) fechava tudo (double-fire) — `f6fbaf20` — 🔧 corrigido 2026-07-26 `11a140ef`
- **Entrega:** feat(a11y): modais com role=dialog, Escape fecha e gestão de foco
- **Como testei:** probe-modal-a11y (Escape no detalhe aberto da Bag)
- **O que quebrou:** o listener de Escape que adicionei em shared.js era um SEGUNDO handler além do já existente em main.js:134 → dois `dismissModal` por Escape: 1º volta pra Bag, 2º fecha a Bag. Escape no detalhe fechava tudo (overlay:false) em vez de voltar.
- **Evidência:** `Escape detalhe→bag: {"overlay":false,...}` (esperado overlay:true). O Close por clique/botão funcionava (probe-item-close ✅), só o Escape falhava.
- **Fix:** `11a140ef` — removido o listener duplicado de shared.js; o handler único de main.js passou a chamar dismissModal (respeita o onClose). Re-teste: overlay:true + bag:true.
