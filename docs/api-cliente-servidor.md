# Chamadas cliente → servidor

Documento técnico (não é `.spec/` funcional) — lista TODA chamada de rede que
o cliente do jogo faz, pra quem, e o que cada uma faz. Existem três destinos
diferentes:

1. **Servidor de caçada (Railway, `server/src/index.js`)** — autoritativo pra
   toda a economia real (gold/xp/level/hp/mana/skills/inventário/equipamento/
   relíquias). Cada chamada exige o JWT do jogador (`Authorization: Bearer`),
   verificado direto no GoTrue do Supabase.
2. **Supabase REST/Auth direto** (`src/infrastructure/authClient.js`,
   `supabaseClient.js`) — autenticação, save na nuvem (cosmético, ver nota
   abaixo), config privilegiada, e as funções RPC de Market/Highscores.
3. Nada mais — não há terceiro serviço.

Base URLs:
- Servidor de caçada: `https://rubinot-idle-hunt-server-production.up.railway.app`
- Supabase: `https://qrkqhqdfneumymhiczki.supabase.co`

---

## 1. Servidor de caçada (Railway)

Todas exigem `Authorization: Bearer <access_token>` exceto `/health`. Cliente
que chama: `src/infrastructure/authClient.js` (função `huntFetch`).

| Rota | Método | Chamada no cliente | Corpo (request) | O que faz / retorna |
|---|---|---|---|---|
| `/health` | GET | (nenhum wrapper, só monitoramento) | — | `{ ok, service, stage }` — liveness. |
| `/whoami` | GET | (nenhum wrapper hoje) | — | `{ ok, userId, email }` — confirma o JWT. |
| `/hunt/start` | POST | `startHuntSession(snapshot)` | `{ slot, zoneId, bossOnly, vocation, world, rtc }` | Fecha sessão anterior do slot, lê nível/skills/equipamento/relíquias de `player_stats`/`player_skills`/`player_equipment`/`player_relics` (nunca do cliente), calcula atk/def/spd/maxHp/maxMana, retoma hp/mana/stamina de onde parou, cria linha em `hunt_sessions` e começa o tick em memória (`huntEngine.js: startSession`). Retorna `{ ok, sessionId }`. |
| `/hunt/stop` | POST | `stopHuntSession(slot)` | `{ slot }` | Para o tick em memória, marca `hunt_sessions.active=false`. Retorna `{ ok }`. |
| `/hunt/state` | GET | `getHuntState(slot)` | query `?slot=N` | Fonte de verdade pro cliente espelhar: `{ ok, hunting, zoneId, stats (player_stats), inventory, relics, skills, currentMonster, lastKill }`. Chamado a cada 375ms enquanto caça + a cada tick de combate + uma vez no boot. |
| `/equip` | POST | `syncEquipment(slot, eqSlot, itemId)` | `{ slot, eqSlot, itemId }` (itemId `null` desequipa) | Confere posse (item em `player_inventory` com qty>0, ou relíquia própria) antes de gravar em `player_equipment`. Retorna `{ ok }` ou 403 se não possuído. |
| `/character/starter-kit` | POST | `grantStarterKit(slot, vocation)` | `{ slot, vocation }` | Concede o kit inicial da vocação (arma/armadura/suprimentos) — só uma vez; recusa (409) se já existe qualquer equipamento/item nesse slot. Cria `player_stats` se ainda não existir. |
| `/buy-blessing` | POST | `buyBlessingOnServer(slot)` | `{ slot }` | Valida gold e teto de 5 bênçãos no servidor, debita gold, incrementa `blessings`. Retorna `{ ok, gold, blessings }`. |
| `/hunt/use-item` | POST | `useItemOnServer(slot, itemId)` | `{ slot, itemId }` | Uso manual de item da Bag. Poção/comida: funciona a qualquer momento (parado ou caçando) — cura hp/mana, decrementa 1 unidade. Runa de ataque: exige sessão de caçada VIVA com alvo em combate — calcula dano real (mesma fórmula do RTC automático), aplica pelo `settleKill` real (gold/xp/loot/relic se matar). Retorna `{ ok, hp, mana, healedHp/healedMana }` (poção) ou `{ ok, hp, mana, dmg, targetName, killed, hitCount }` (runa). |
| `/shop/buy` | POST | `buyShopItemOnServer(slot, shopItemId, qty)` | `{ slot, shopItemId, qty }` | Compra na Loja de Equipamentos/Artigos Mágicos. Só `currency:'gold'` e `type:'item'`/`'refill'` (ver limitação abaixo). Confere saldo, debita gold, credita item em `player_inventory` (ou cura hp/mana no caso do Supply Completo). Retorna `{ ok, gold }` ou `{ ok, gold, hp, mana }`. |
| `/inventory/sell` | POST | `sellItemOnServer(slot, itemId, qty)` | `{ slot, itemId, qty? }` (qty omitido = vende tudo) | Confere posse/quantidade, credita gold pelo valor real do item, decrementa/zera o estoque. Retorna `{ ok, gold, sold, total }`. |
| `/inventory/sell-relic` | POST | `sellRelicOnServer(slot, relicId)` | `{ slot, relicId }` | Confere posse da relíquia, calcula preço (`sell base × (1 + bônus×2)`), remove de `player_relics`, limpa o slot de equipamento se estava equipada, credita gold. Retorna `{ ok, gold, price }`. |

### Limitação conhecida do `/shop/buy`
Só cobre compras em **gold**. Compras em **Rubini Coins** (`currency:'rubini'`,
ex.: boosts de XP/Gold/Loot) continuam mutando `G.rubini`/`G.boosts` só no
cliente — hoje isso não gera bug de reversão porque `player_stats` não tem
coluna de rubini e o servidor ainda não aplica boosts no cálculo real de
gold/xp (`huntEngine.js: settleKill`). Ou seja: **boosts comprados hoje não
têm efeito real na caçada** — é uma lacuna de feature, não um bug pontual,
documentada mas não implementada ainda.

---

## 2. Supabase — Auth (GoTrue, `/auth/v1/*`)

Cliente: `src/infrastructure/authClient.js`. Usa a `anon key` pública (sem
segredo — RLS protege os dados).

| Rota | Chamada no cliente | O que faz |
|---|---|---|
| `POST /auth/v1/signup` | `signUp(email, password)` | Cria conta; dispara e-mail de confirmação. |
| `POST /auth/v1/resend` | `resendConfirmation(email)` | Reenvia e-mail de confirmação. |
| `POST /auth/v1/token?grant_type=password` | `signIn(email, password)` | Login, guarda sessão (`localStorage: rubinot_session`). |
| `POST /auth/v1/token?grant_type=refresh_token` | `ensureValidToken()` | Renova o access_token perto de expirar (chamado antes de qualquer chamada autenticada). |
| `POST /auth/v1/logout` | `signOut()` | Invalida a sessão no GoTrue. |
| `GET /auth/v1/user` | (usado pelo SERVIDOR, não pelo cliente — `verifySupabaseToken` em `server/src/index.js`) | Verifica o JWT recebido em toda chamada ao servidor de caçada. |

## 3. Supabase — REST/PostgREST (`/rest/v1/*`)

| Tabela/rota | Chamada no cliente | O que faz |
|---|---|---|
| `saves` (GET) | `loadCloudSave()` | Carrega o save cosmético da conta (ver nota abaixo — NÃO inclui mais gold/xp/level/inventário/etc., só preferências/UI). |
| `saves` (POST upsert) | `saveCloudSave(data)` | Grava o save cosmético (debounced ~8s após cada mudança, ver `saveGameUseCase.js`). Bloqueado se a última leitura falhou (`isCloudSaveBlocked`), pra nunca sobrescrever um save bom com estado vazio. |
| `game_config` (GET) | `fetchGameConfig()` | Leitura pública das taxas do jogo (xpRate/goldRate/lootRate/etc.) — não exige login. |
| `admins` (GET) | `checkIsAdmin()` | Confere se o usuário logado pode ver o Painel Admin. |
| `rubinot_idle_scores` (GET, via `selectRequest`) | `fetchHighscoresRequest`, `fetchArenaOpponentRequest` | Lê o ranking global / sorteia um oponente de Arena por faixa de nível. |
| `rubinot_market_listings` (GET, via `selectRequest`) | `fetchListingsRequest()` | Lista os anúncios ativos do Mercado. |

## 4. Supabase — Edge Functions (`/functions/v1/*`)

| Função | Chamada no cliente | O que faz |
|---|---|---|
| `admin-config-set` | `pushGameConfig(config)` | Só aceita se o usuário está em `public.admins` (verificado no servidor da function). Grava `game_config`. |

## 5. Supabase — RPC / funções `SECURITY DEFINER` (`/rest/v1/rpc/*`)

Cliente: `src/infrastructure/supabaseClient.js` (`rpcRequest`), usado por
`highscoresApi.js` e `marketApi.js`.

| Função RPC | Chamada no cliente | O que faz |
|---|---|---|
| `rubinot_idle_submit` | `submitScoreRequest(payload)` | Envia o nome+stats do jogador pro ranking global (throttle de 60s no cliente). |
| `rubinot_market_my_wallet` | `fetchMyWalletRequest(secret)` | Lê o saldo da carteira do Mercado (separada de `player_stats.gold`, ver limitação abaixo). |
| `rubinot_market_deposit` | `depositRequest(secret, name, amount)` | Deposita gold do jogo na carteira do Mercado. |
| `rubinot_market_withdraw` | `withdrawRequest(secret, amount)` | Saca da carteira do Mercado de volta pro jogo. |
| `rubinot_market_list_item` | `listItemRequest(secret, name, itemId, qty, price)` | Anuncia um item pra venda. |
| `rubinot_market_cancel_listing` | `cancelListingRequest(secret, listingId)` | Cancela um anúncio. |
| `rubinot_market_buy` | `buyListingRequest(secret, name, listingId, qty)` | Compra um item anunciado por outro jogador. |

### ⚠️ Limitação encontrada nesta auditoria: Market também desincroniza gold
`marketUseCases.js` (`depositGold`/`withdrawGold`) muta `G.gold` **direto no
cliente** ao depositar/sacar da carteira do Mercado — exatamente a mesma
categoria de bug já corrigida em Shop/Inventory (compra/venda revertida pelo
próximo `reconcileWithServer()`, já que o servidor de caçada nunca fica
sabendo do depósito/saque). Isso NÃO foi corrigido ainda — precisa de um
endpoint `/wallet/deposit` e `/wallet/withdraw` no servidor de caçada,
espelhando o padrão de `/shop/buy`, OU migrar a lógica de depósito/saque para
dentro do servidor de caçada em vez de ficar 100% na RPC do Market. Fica
registrado aqui como próximo item a corrigir.

---

## Resumo do modelo de confiança

- **Nunca confiar em `G.*` vindo do cliente** pra decidir resultado real —
  regra de ouro desde a migração pra servidor-autoritativo. Toda ação que
  ganha/gasta gold, item, hp, mana, xp, skill ou relíquia precisa ter um
  endpoint que valide posse/saldo/regra no servidor e seja a ÚNICA fonte do
  valor final aplicado.
- Hoje cobrem esse padrão: caçada (tick automático), uso manual de poção/runa,
  equipar/desequipar, kit inicial, bênção, compra em gold na loja, venda de
  item/relíquia.
- Ainda NÃO cobrem esse padrão (gold pode desincronizar): depósito/saque no
  Mercado, boosts comprados com Rubini Coins.
