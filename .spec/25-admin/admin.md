# Painel do Operador (Admin)

## Objetivo
Dar ao operador/dono controle central sobre balanceamento, economia e disponibilidade de funcionalidades — em tempo real, para todos os jogadores — sem alterar código.

## Quem usa
O **operador/dono**, nunca o jogador comum. Acesso restrito a uma lista de contas autorizadas; a aba **Admin** só aparece para elas.

## O que o operador precisa conseguir fazer
- Ajustar **taxas globais**: multiplicadores de XP, treino de skills, gold e chance de loot.
- Ajustar **chance de Relíquia** por boss e **pesos de raridade** (cada raridade com sua % independente).
- Configurar **spawn por zona**: peso de cada criatura, tamanho do grupo (min–max) e tempo entre grupos.
- Definir **multiplicadores de XP/Gold por zona** (desligados por padrão, para ficar fiel ao Tibia).
- Sobrescrever a **chance de loot** de um item por criatura.
- Ligar/desligar: **Mercado**, **Stamina**, **consumo de munição** do paladino; ajustar a velocidade do projétil cosmético.

## Regras de negócio
- **Efeito global e em tempo real.** Uma mudança de taxa/toggle vale para todos, sem novo deploy.
- **Padrões fiéis ao Tibia.** Multiplicadores de zona, stamina e consumo de munição vêm **desligados** — o jogo roda com os valores reais do Tibia. O operador liga o que quiser desviar.
- **Valores saneados.** Toda configuração é validada (não-negativa, chance entre limites) antes de valer.
- **Acesso restrito.** Só contas autorizadas veem e usam o painel.

## Comportamento esperado
- Desligar o Mercado esconde a aba e bloqueia negociações; ligar a Stamina penaliza XP abaixo do limiar.
- Ajustar pesos de spawn muda a frequência de cada criatura sem tocar no elenco.
- Multiplicador de zona só tem efeito quando o operador liga a opção.

## Critérios de aceitação
- [ ] Só contas autorizadas acessam o painel.
- [ ] Ajustes de taxa/toggle valem para todos em tempo real, sem deploy.
- [ ] Multiplicadores de zona, stamina e consumo de munição vêm desligados por padrão.
- [ ] Configurações são saneadas antes de aplicar.
- [ ] Ligar/desligar Mercado, Stamina e consumo de munição muda o jogo de acordo.
