# Presas (Prey)

## Objetivo
Reproduzir o sistema de Prey do Tibia: escolher uma criatura e ganhar um bônus temporário (dano, defesa, XP ou loot) contra ela, com raridade que melhora ao rerolar. Dá uma alavanca de otimização por sessão de caça.

## Quem usa
Todo jogador. As presas ficam num painel próprio, fora da barra lateral.

## O que o usuário precisa conseguir fazer
- Ativar até três presas ao mesmo tempo, cada uma com uma criatura, um tipo de bônus e uma raridade.
- Rerolar a lista de criaturas (pagando gold) ou usar o reroll grátis periódico.
- Ver o bônus e o tempo restante de cada presa.

## Regras de negócio
- **Três slots**, todos já liberados (no Tibia o terceiro é premium; aqui os três vêm abertos — única liberdade tomada no sistema).
- **Bônus temporário.** Cada presa dura um tempo fixo (2h); depois some.
- **Quatro tipos de bônus**, fiéis ao Tibia: dano, defesa, XP e loot.
- **A raridade nunca cai.** Vai de 1 a 10; cada reroll de bônus sorteia entre a raridade atual +1 e o máximo — rerolar é **progressão garantida**, não aposta. Na raridade máxima, o tipo de bônus é garantido mudar.
  **Por quê:** é a regra real do Tibia; rerolar deve melhorar, nunca piorar.
- **A % do bônus é fórmula da raridade** (dano 2r+5; defesa 2r+10; XP/loot 3r+10), fiel ao Crystal Server.
- **Reroll da lista** custa gold proporcional ao nível (200 × nível); a cada período (20h) o jogador ganha um reroll de lista grátis.
- **Cartas de presa** (prêmio de Arena/Battle Pass/tarefas) permitem rerolar sem pagar gold.

## Comportamento esperado
- Rerolar o bônus de uma presa nunca reduz a raridade.
- Uma presa expirada deixa de aplicar o bônus na caçada.
- O reroll grátis fica disponível de novo após o período.

## Critérios de aceitação
- [ ] Há três slots de presa ativos, cada um com criatura, tipo de bônus e raridade.
- [ ] O bônus dura o tempo definido e some ao expirar.
- [ ] Rerolar o bônus nunca diminui a raridade; a % segue a fórmula da raridade.
- [ ] O reroll de lista custa gold por nível e há um reroll grátis periódico.
- [ ] Cartas de presa permitem rerolar sem gold.
