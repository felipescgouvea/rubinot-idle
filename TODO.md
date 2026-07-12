# Rubinot Idle — Backlog (coisas a fazer)

Lista viva de ajustes e features, organizada por tópico. Marque `[x]` quando concluir.
Prioridade opcional por item: 🔴 alta · 🟡 média · 🟢 baixa/QoL.

> Produção: https://felipescgouvea.github.io/rubinot-idle/ · versão atual dos assets: **v=81**
> Regra: só considerar "pronto" quando estiver no github.io e verificado.

---

## 💎 VIP & Monetização

**Objetivo:** gerar receita sem destruir a experiência de quem joga de graça. O jogo
free continua completo e jogável; o VIP acelera, dá conforto (QoL) e cosméticos —
**evitar pay-to-win puro** (nada que só o VIP consiga vencer). Idle premia tempo;
o VIP compra principalmente *tempo* e *conveniência*.

### Modelo de receita (3 frentes)

1. **Assinatura VIP** (mensal) — o carro-chefe. Um único status "VIP ativo até X"
   que libera um pacote de benefícios enquanto a assinatura durar.
2. **Rubini Coins** (moeda premium, já existe) — compra avulsa de itens/boosts/cosméticos
   na Loja Premium. Bom pra quem não quer assinar.
3. **Battle Pass premium** (já existe a base) — trilha paga com recompensas extras por temporada.

### O que o VIP libera (proposta — marcar o que entra)

**Aceleração / conforto (QoL) — o coração do VIP:**
- [ ] Cap de progresso **offline maior** (8h → 24h/48h no VIP).
- [ ] **+Slots de magia** na prioridade do RTC (free: N; VIP: mais).
- [ ] **+Slots de Presa (Prey)** e **reroll de presa mais barato/instantâneo**.
- [ ] **Auto-loot avançado** (filtros por raridade/tipo, auto-vender configurável além do misc).
- [ ] **+Slot(s) de treino offline** de skill / treino mais rápido.
- [ ] **Regeneração de stamina mais rápida** (quando a stamina estiver ligada).
- [ ] **Hunt Analyzer avançado** (loot por item, exportar sessão) só pra VIP.

**Boost de ganhos (com cuidado — manter moderado pra não virar P2W):**
- [ ] Bônus de **XP/Gold** de VIP pequeno e fixo (ex.: +10–20%), transparente e limitado.
- [ ] **Boosted Creature/Zone** extra ou reroll do boosted do dia.

**Cosmético (100% seguro de monetizar):**
- [ ] Outfits/addons/cores exclusivos de VIP.
- [ ] Molduras/badges de VIP no Highscores e no perfil.
- [ ] Efeitos visuais especiais (aura no boneco, etc.).

**Acesso / desbloqueios:**
- [ ] Acesso antecipado a novas zonas/vocações/eventos.
- [ ] Prioridade em filas de evento / Boss Rush com bônus.

### Como implementar (tarefas técnicas)

- [ ] **Estado de VIP** — `G.vip = { active: bool, until: timestamp, tier?: 'vip' | 'vip+' }`
      no `domain/gameState.js` (+ migração no load). Fonte da verdade = servidor (Supabase),
      não só localStorage, pra não ser burlável.
- [ ] **Helper central** `isVip()` / `vipTier()` — um único ponto que todo gate consulta
      (ex.: `application/vipUseCases.js`), pra não espalhar `if` pelo código.
- [ ] **Gates nos pontos certos** — offline cap (`persistenceUseCases`), slots de RTC/Prey/treino,
      multiplicadores de XP/Gold, filtros de loot, cosméticos.
- [ ] **Loja/entrada de compra** — página "Seja VIP" com os benefícios + botão de compra.
      Compra real exige gateway (o dono conduz o pagamento — não implementar cobrança no cliente).
- [ ] **Validação no backend** — Supabase guarda a assinatura (data de expiração) e o cliente
      só lê; conceder VIP nunca deve depender de valor editável no localStorage.
- [ ] **Selo visual de VIP** — badge no header/Highscores; estados "VIP ativo até DD/MM".
- [ ] **Página de transparência** — deixar claro o que é QoL vs vantagem, pra não parecer P2W.

### Cuidados

- Nada essencial atrás do paywall: o free tem que ser divertido sozinho.
- Boosts de ganho **moderados e fixos** (não multiplicadores gigantes) pra não quebrar o ranking.
- Pagamento é sensível — **quem processa cobrança é o dono** (gateway/loja), o cliente só reflete o status.
- Ser transparente sobre o que o dinheiro compra (evita reação negativa da comunidade).

---

## 1. RTC

- [x] **Prioridade inteligente por elemento** — toggle no RTC: entre as magias prontas, casta
      a mais forte contra a fraqueza da criatura atual (usa `domain/elements.js`).
- [ ] 🟡 **Magias de suporte** — utani hur (haste = mais ticks/s), utamo vita (escudo mágico),
      utana vid (invisibilidade). Amplia a automação além de ataque/cura.
- [x] **Botão "abrir bag" dentro da aba Healing** — atalho 🎒 pra arrastar a poção pro slot.

## 2. BATTLE

- [x] **Calibração inicial** do combate novo — o wand/rod do mago virou poke fraco (×0.5) pra o
      dano vir das magias, não do cajado grátis (`huntUseCases.js`). Ainda pode afinar por playtest.
- [x] **Blessings** compráveis (gold, escala com o nível): reduzem a perda de XP na morte e
      melhoram o revive (30%→60% HP com as 5); consumidas ao morrer. Card na aba Caçada.
- [ ] 🟡 **Refinar tabela elemental por criatura** (hoje por família temática — `domain/elements.js`).
- [ ] 🟢 **Popular imunidades elementais reais** (mod = 0 já suportado no código).
- [ ] 🟢 **Hunt Analyzer avançado** — loot detalhado por item, "gold/h ao vender", exportar sessão.

### 🧪 Auditoria por vocação (fidelidade ao Tibia)

Checar, **para cada vocação**, que: (a) a fórmula de dano bate com o Tibia; (b) só
consegue **equipar** itens/armas da própria profissão; (c) só vê/usa **magias** da
própria profissão; (d) só usa **runas** que o **Magic Level** da profissão permite.

**Regras transversais (valem pra todas):**
- [x] **Restrição de equipamento por vocação** — bloqueado no `equipItem`/`equipRelic`:
      knight = sword/axe/club; paladin = distance + munição; mage = wand/rod (ver
      `domain/items.js: canVocationEquip`). Armadura/elmo/anel/etc. seguem livres.
- [x] **Runas por Magic Level** — cada runa tem `reqMl`; a seleção e o combate exigem o ML
      mínimo (ver `domain/rtcConfig.js: canUseAttackRune`). A UI mostra 🔮 ML e 🔒 se faltar.
- [x] **Magias só da própria vocação** — confirmado: todas as spells têm `voc` correto;
      o RTC (add/heal) e o combate filtram por `isSpellAvailable`, e a persistência limpa
      no load qualquer magia fora da vocação. Uso manual de runa também passou a exigir vocação+ML.
- [x] **Fórmulas-alvo documentadas** — ver [docs/formulas.md](docs/formulas.md).

**Knight** (`voc.attackSkill: 'sword'`, `magicMult 0.1`)
- [x] Fórmula melee = `0.09·atkArma·(skill+5) + nível/4` (aproximação Tibia — ver docs/formulas.md).
- [x] Só equipa sword/axe/club (bloqueado no equip); sem wand/bow.
- [x] Só magias de knight (exori / exori mas / exori gran / exura ico).
- [x] **Sem runa de ataque** — knight fora de `ATTACK_RUNE_VOCATIONS` (confirmado).

**Paladin** (`voc.attackSkill: 'distance'`, `magicMult 0.35`)
- [x] Fórmula distance = `0.09·atkMunição·(dist+5) + nível/4`.
- [x] Só equipa distance + munição; melee/wand não contam ataque nem podem ser equipados.
- [x] Só magias de paladin (Ethereal Spear, Divine Missile, Divine Caldera, Divine Healing, exura).
- [x] Runas limitadas pelo ML (magicMult baixo → poucas liberadas).

**Sorcerer** (`voc.attackSkill: 'magic'`, `magicMult 1.0`)
- [x] Fórmula mágica = `(nível·0.4 + ML·2.0)·power`; wand básico ×0.5 (calibração).
- [x] Só equipa wand/rod.
- [x] Só magias de sorcerer (Flame/Energy strikes+waves, Strong Energy, Hell's Core, curas).
- [x] Runas de sorcerer liberadas pelo ML (SD 15, GFB 7, Explosion 6, Fireball 4).

**Druid** (`voc.attackSkill: 'magic'`, `magicMult 1.0`)
- [x] Fórmula mágica idêntica ao sorcerer (nível+ML); wand básico ×0.5.
- [x] Só equipa wand/rod.
- [x] Só magias de druid (Ice/Terra strikes+waves, Eternal Winter, Flame Strike, curas).
- [x] Runas de druid liberadas pelo ML (Avalanche 9, etc.).

## 3. HEADER

- [x] Boosted destacado do header principal (faixa própria, alinhada à direita, bem próxima dele).
- [ ] _(outros itens do cabeçalho aqui — ex.: responsividade, o que mostrar/ocultar)_

## 4. SHOP UI

- [x] Reorganizada: menu lateral com os tipos de loja (1 coluna) + painel principal à direita
      com os itens da loja selecionada (em vez de uma lista gigante única).
- [ ] _(próximo: busca/filtro de itens, comparação com o equipado, ordenar por preço)_

## 5. LINKED TASKS (TAREFAS)

- [ ] _(anotar itens do sistema de Tarefas aqui — ex.: cadeias de tarefas, recompensas, UI)_

## 6. TRADUÇÃO

- [ ] **Padronizar o idioma.** O jogo mistura PT (UI) e EN (nomes de itens/monstros/magias).
      Decidir o alvo (ex.: tudo PT-BR ou UI PT + termos oficiais do Tibia em EN) e aplicar.

## 7. UI ICONS

- [ ] **Revisar ícones/emojis restantes** e trocar por sprites reais do Tibia onde ainda houver
      emoji (seguindo o padrão já usado em itens/monstros/skills/vitais).

---

## 🔧 Handoffs (fora do código)

- [ ] **Configurar SMTP + Site URL/Redirect URLs no Supabase** — sem isso o e-mail de confirmação
      de conta é limitado (rate limit ~2/h do SMTP embutido).

---

## ✅ Concluído recentemente (histórico)

- [x] Efeito real de magia por-tile na área (groundshaker etc.), sem monstro na cena
- [x] RTC: várias magias de ataque por prioridade
- [x] Healing: arrastar a poção da bag pro slot (vida e mana)
- [x] Skills compactas na barra do personagem
- [x] Ícone da bag = Backpack real do Tibia
- [x] Tick de combate = golpe básico + magia/runa + poções (fiel ao Tibia)
- [x] Mercado entre jogadores desligável no Admin (padrão OFF)
- [x] Fraqueza/resistência elemental por criatura + Bestiário mostra
- [x] Dano de magia/cura escalando com nível + Magic Level
- [x] Hunt Analyzer (tempo, kills, XP/h, gold/h, loot, suprimentos, lucro/h)
- [x] Auto-vender lixo (itens misc baratos viram gold no loot) — toggle na Bag
- [x] Stamina opcional (toggle Admin): cai caçando, regenera descansando, <14h reduz XP
- [x] Runas escalando com Magic Level
- [x] Consumo de munição do paladino (toggle Admin)
- [x] Poções com faixa de cura (±15%) + exhaust de ~1s (cura/mana compartilham)
- [x] Boss Rush pausa a cada tier vencido — clicar pra desafiar o próximo (sem auto-avanço)
- [x] Shop UI: menu lateral por tipo de loja + painel de itens à direita
- [x] Header: Boosted destacado do header, à direita
- [x] Auditoria de hunts: cada zona só com monstros da mesma família (ex.: Bosque dos Elfos
      só com elfos; removidos dworc/serpent/cobra/etc. das zonas onde não faziam sentido)

**Pendências da auditoria de hunts (polir):**
- [ ] Enriquecer hunts que ficaram com 1 só monstro (ex.: Bosque dos Elfos) com variantes reais
      da família (Elf Scout, Elf Arcanist…) — precisa buscar sprites.
- [ ] Dar um lar temático aos monstros que ficaram sem zona (dworc, cobra, warlock, quara…).

---

## 💡 Ideias maiores (backlog de longo prazo)

- [ ] Party/aliança ou ranking social além do Highscores.
- [ ] Imbuements de verdade (hoje as Relíquias são a analogia).
- [ ] Mais vocações/promoções (Elite Knight, Master Sorcerer…) com bônus.
- [ ] Eventos temporários (double XP weekend, boss global) tocando no Boosted.
