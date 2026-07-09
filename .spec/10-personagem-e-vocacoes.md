# Personagem & Vocações

## Objetivo

Permitir que o jogador personifique um personagem dentro do universo Tibia/RubinOT, com identidade de combate reconhecível (tanque, atirador, mago ofensivo, mago de suporte).

## Quem usa

Jogador, na aba Caçada, antes de qualquer outra ação do jogo.

## O que o usuário precisa conseguir fazer

- Escolher uma entre quatro vocações: Knight, Paladin, Sorcerer, Druid.
- Acompanhar nível, XP, HP, mana e atributos (Ataque, Defesa, Velocidade, Magia) em tempo real.
- Ver o próprio personagem evoluir conforme luta.

## Regras de negócio

- **A escolha de vocação é definitiva.** Uma vez escolhida, não pode ser trocada.
  *Por quê:* espelha a permanência da escolha de vocação em Tibia — trocar de vocação livremente descaracterizaria a identidade do personagem.
- **Cada vocação tem um papel de combate distinto e fiel ao original:** Knight é tanque corpo-a-corpo com HP alto; Paladin é híbrido de distância com HP e mana equilibrados; Sorcerer é magia ofensiva de alto dano e baixa HP; Druid é magia de suporte/cura com dano elemental.
- **Nível máximo é 100.** A quantidade de XP necessária para subir de nível cresce a cada nível (fica progressivamente mais difícil evoluir).
- **HP e mana máximos crescem por nível**, numa taxa própria de cada vocação (Knight ganha mais HP por nível; Sorcerer ganha mais mana).
- **Ataque, defesa e magia do personagem derivam das skills treinadas e do equipamento**, não de um valor fixo por nível — ver [13-skills.md](13-skills.md).

## Comportamento esperado

- Ao morrer em combate, o personagem retorna com **30% do HP máximo** e perde **5% do XP acumulado no nível atual** (penalidade leve, nunca catastrófica).
- Ao subir de nível, HP e mana são restaurados ao máximo automaticamente.

## Critérios de aceitação

- [ ] Não é possível trocar de vocação depois de escolhida.
- [ ] Os quatro papéis de combate (tanque, híbrido, mago ofensivo, mago de suporte) são perceptíveis nos números de HP/mana/ataque de cada vocação.
- [ ] O personagem nunca ultrapassa o nível 100.
- [ ] A morte nunca zera progresso — apenas aplica a penalidade leve descrita acima.
