# Recompensa Diária

## Objetivo

Dar um motivo para o jogador voltar todo dia, com um prêmio de login que cresce ao longo de uma sequência — reforçando o hábito diário típico de um idle.

**Nota de fidelidade:** inspirado no **Reward Shrine / Daily Reward** do Tibia. Adaptação registrada sob a Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

## Quem usa

Jogador, por um botão no topo (header) que abre a tela de recompensa — não ocupa uma aba.

## O que o usuário precisa conseguir fazer

- Ver o ciclo de 7 dias de recompensas e qual é a de hoje.
- Resgatar a recompensa do dia.
- Saber quando há recompensa disponível (aviso visível no botão).

## Regras de negócio

- **Uma recompensa por dia-calendário** — resgatar de novo no mesmo dia não é permitido.
- **A sequência avança 1 a cada dia consecutivo** de login com resgate, num ciclo de 7 dias que reinicia após o último.
- **Faltar um dia reinicia a sequência** para o dia 1 — a recompensa cresce, então manter a sequência tem valor.
- **As recompensas seguem o mesmo formato das demais telas** (gold, Rubini Coins, refill de supply, boost temporário) — nada exclusivo que quebre o balanceamento.

## Comportamento esperado

- O aviso no botão só aparece quando há recompensa disponível hoje.
- Depois de resgatar, a tela mostra que a recompensa de hoje já foi coletada e informa a sequência atual.

## Critérios de aceitação

- [ ] Só é possível resgatar uma vez por dia.
- [ ] A sequência avança em dias consecutivos e reinicia após faltar um dia.
- [ ] O aviso de disponível some após o resgate do dia.
- [ ] A recompensa concedida corresponde ao dia atual da sequência.
