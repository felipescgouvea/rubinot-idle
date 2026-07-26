# Painel do Operador (Admin)

## Objetivo
Dar ao operador/dono do jogo controle central sobre balanceamento, economia e disponibilidade de funcionalidades — em tempo real, para todos os jogadores — sem alterar código.

## Quem usa
O **operador/dono do jogo**, nunca o jogador comum. O acesso é restrito a uma lista de contas autorizadas; a aba **Admin** só aparece para elas.

## O que o operador precisa conseguir fazer
- Ajustar as **taxas globais**: multiplicadores de XP, treino de skills, gold e chance de loot.
- Ajustar a **chance de Relíquia** por boss e os **pesos de raridade** (cada raridade com sua % independente).
- Configurar o **spawn por zona**: peso de cada criatura e o tamanho do grupo (min–max), além do tempo entre grupos.
- Definir **multiplicadores de XP/Gold por zona** (desligados por padrão, para ficar fiel ao Tibia).
- Sobrescrever a **chance de loot** de um item por criatura.
- Ligar/desligar funcionalidades: **Mercado** entre jogadores, **Stamina**, **consumo de munição** do paladino, e ajustar a velocidade do projétil cosmético.

## Regras de negócio
- **Efeito global e em tempo real.** Uma mudança de taxa/toggle vale para todos os jogadores, sem novo deploy.
- **Padrões fiéis ao Tibia.** Por padrão, multiplicadores de zona, stamina e consumo de munição vêm **desligados** — o jogo roda com os valores reais do Tibia. O operador liga o que quiser desviar.
- **Valores saneados.** Toda configuração é validada (não-negativa, chance entre limites) antes de valer.
- **Acesso restrito.** Só contas autorizadas veem e usam o painel.

## Comportamento esperado
- Desligar o Mercado esconde a aba e bloqueia negociações; ligar a Stamina passa a penalizar XP abaixo do limiar.
- Ajustar pesos de spawn muda a frequência de cada criatura na zona sem tocar no elenco.
- Um multiplicador de zona só tem efeito quando o operador liga a opção.

## Critérios de aceitação
- [ ] Só contas autorizadas acessam o painel.
- [ ] Ajustes de taxa/toggle valem para todos em tempo real, sem deploy.
- [ ] Multiplicadores de zona, stamina e consumo de munição vêm desligados por padrão.
- [ ] Configurações são saneadas antes de aplicar.
- [ ] Ligar/desligar Mercado, Stamina e consumo de munição muda o jogo de acordo.
