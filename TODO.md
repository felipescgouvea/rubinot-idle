# Rubinot Idle — Backlog (coisas a fazer)

Lista viva de ajustes e features, organizada por tópico. Marque `[x]` quando concluir.
Prioridade opcional por item: 🔴 alta · 🟡 média · 🟢 baixa/QoL.

> Produção: https://felipescgouvea.github.io/rubinot-idle/ · versão atual dos assets: **v=81**
> Regra: só considerar "pronto" quando estiver no github.io e verificado.

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
