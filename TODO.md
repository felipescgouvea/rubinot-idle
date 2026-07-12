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

- [ ] 🔴 **Prioridade inteligente por elemento** — opção pra o auto-ataque escolher a magia
      forte contra a fraqueza da criatura atual (usa `domain/elements.js`). Dá real sentido
      à lista de prioridade de magias.
- [ ] 🟡 **Magias de suporte** — utani hur (haste = mais ticks/s), utamo vita (escudo mágico),
      utana vid (invisibilidade). Amplia a automação além de ataque/cura.
- [ ] 🟢 **Botão "abrir bag" dentro da aba Healing** — hoje precisa abrir a bag pela aba Caçada
      pra arrastar a poção pro slot.

## 2. BATTLE

- [ ] 🔴 **Calibrar balanceamento** do combate novo (golpe básico + magia por tick, wand grátis,
      dano por nível+ML). Coeficientes em `domain/combatFormulas.js`.
- [ ] 🟡 **Blessings** compráveis que reduzem a perda de XP na morte (hoje 5% + revive 30% HP).
- [ ] 🟡 **Refinar tabela elemental por criatura** (hoje por família temática — `domain/elements.js`).
- [ ] 🟢 **Popular imunidades elementais reais** (mod = 0 já suportado no código).
- [ ] 🟢 **Hunt Analyzer avançado** — loot detalhado por item, "gold/h ao vender", exportar sessão.

## 3. HEADER

- [ ] _(anotar itens do cabeçalho aqui — ex.: layout, responsividade, o que mostrar/ocultar)_

## 4. SHOP UI

- [ ] _(anotar melhorias da loja aqui — ex.: organização por categoria, busca, comparação de itens)_

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

---

## 💡 Ideias maiores (backlog de longo prazo)

- [ ] Party/aliança ou ranking social além do Highscores.
- [ ] Imbuements de verdade (hoje as Relíquias são a analogia).
- [ ] Mais vocações/promoções (Elite Knight, Master Sorcerer…) com bônus.
- [ ] Eventos temporários (double XP weekend, boss global) tocando no Boosted.
