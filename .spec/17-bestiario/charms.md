# Charms

## Objetivo
Reproduzir o Charm System do Tibia: gastar os Charm Points ganhos no bestiário para desbloquear bônus passivos de combate. Dá um destino de longo prazo para o esforço de completar o bestiário.

## Quem usa
Todo jogador que acumulou Charm Points. Os Charms ficam junto do Bestiário.

## O que o usuário precisa conseguir fazer
- Ver os Charms disponíveis, seu custo em Charm Points e o efeito.
- Desbloquear um Charm pagando Charm Points.
- Equipar até um número fixo de Charms ao mesmo tempo.

## Regras de negócio
- **Cada Charm dá um bônus passivo** enquanto equipado (mais dano, mais loot, mais gold, mais XP, roubo de vida). No modelo idle, o bônus é global (não atribuído a uma criatura específica como no Tibia).
- **Desbloqueio pago em Charm Points**, ganhos completando criaturas no bestiário.
- **Número fixo de slots de Charm equipados** — o jogador escolhe quais bônus ativar.
- Nomes dos Charms são os reais do Tibia; os efeitos são bônus passivos definidos, nada inventado.
- Charm Points podem também vir como prêmio de Arena/Battle Pass (não-material).

## Comportamento esperado
- Desbloquear um Charm debita os Charm Points; um Charm desbloqueado pode ser equipado/desequipado.
- Equipar mais Charms do que os slots permitem exige trocar um já equipado.
- O bônus só vale enquanto o Charm está equipado.

## Critérios de aceitação
- [ ] Cada Charm mostra custo e efeito, e é desbloqueado gastando Charm Points.
- [ ] Há um limite fixo de Charms equipados ao mesmo tempo.
- [ ] O bônus passivo do Charm se aplica ao combate só enquanto equipado.
- [ ] Nomes dos Charms são os reais do Tibia.
