# Rubinot Idle — Backlog (coisas a fazer)

Lista viva de ajustes e features. Marque `[x]` quando concluir.
Prioridade: 🔴 alta · 🟡 média · 🟢 baixa/QoL.

> Produção: https://felipescgouvea.github.io/rubinot-idle/ · versão atual dos assets: **v=79**
> Regra: só considerar "pronto" quando estiver no github.io e verificado.

---

## 🔴 Alta prioridade

- [ ] **Prioridade inteligente de magia por elemento.** Opção no RTC pra o auto-ataque
      escolher a magia forte contra a fraqueza da criatura atual (usa `domain/elements.js`).
      É o passo que dá real sentido à lista de prioridade de magias.
- [ ] **Calibrar balanceamento do novo combate.** Depois das mudanças (golpe básico + magia
      no mesmo tick, wand do mago grátis, dano por nível+ML), revisar se mago/knight/paladino
      estão equilibrados. Coeficientes em `domain/combatFormulas.js` (`elementalSpellBase`,
      `spellHealAmount`, `spellAttackDamage`).
- [ ] **Configurar SMTP + Site URL/Redirect URLs no Supabase** (handoff do dono). Sem isso o
      e-mail de confirmação de conta é limitado (rate limit ~2/h do SMTP embutido).

## 🟡 Média prioridade

- [ ] **Refinar tabela elemental por criatura.** Hoje é por família temática (aproximação).
      Ajustar casos específicos que fujam do Tibia (ver `domain/elements.js`).
- [ ] **Blessings** compráveis que reduzem a perda de XP na morte — bom ralo de gold.
      Hoje a morte tira 5% do XP e revive com 30% HP (`huntUseCases.js`).
- [ ] **Magias de suporte no RTC:** utani hur (haste = mais ticks/s), utamo vita (escudo
      mágico), utana vid (invisibilidade). Amplia a automação além de ataque/cura.
- [ ] **Poções com faixa de cura + cooldown** (~1s) em vez de valor fixo usado todo tick.
- [ ] **Botão "abrir bag" dentro da aba Healing** — hoje precisa abrir a bag pela aba Caçada
      pra arrastar a poção pro slot.

## 🟢 Baixa / QoL / polimento

- [ ] **Quiver/consumo de munição** do paladino como opção (toggle no Admin) — realismo.
- [ ] **Runas escalando com Magic Level** (hoje dano fixo). No Tibia o dano da runa sobe com ML.
- [ ] **Stamina** (opcional) reduzindo XP após muitas horas — hoje só há cap de 8h offline.
- [ ] **Filtros/auto-vender loot** (ex.: vender lixo automaticamente) — QoL de idle.
- [ ] **Imunidades elementais reais** (alguns bichos imunes, mod = 0) já suportado no código;
      falta popular quem é imune de fato.

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

---

## Ideias maiores (backlog de longo prazo)

- [ ] **Hunt Analyzer avançado:** loot detalhado por item, "gold/h ao vender", exportar sessão.
- [ ] **Party/aliança** ou ranking social além do Highscores.
- [ ] **Imbuements** de verdade (hoje as Relíquias são a analogia).
- [ ] **Mais vocações/promoções** (Elite Knight, Master Sorcerer…) com bônus.
- [ ] **Eventos temporários** (double XP weekend, boss global) tocando no Boosted.
