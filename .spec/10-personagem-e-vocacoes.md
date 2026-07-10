# Personagem & Vocações

## Objetivo

Permitir que o jogador personifique um personagem dentro do universo Tibia/RubinOT, com identidade de combate reconhecível (tanque, atirador, mago ofensivo, mago de suporte).

## Quem usa

Jogador, na aba Caçada, antes de qualquer outra ação do jogo.

## O que o usuário precisa conseguir fazer

- Escolher uma entre quatro vocações: Knight, Paladin, Sorcerer, Druid.
- Acompanhar nível, XP, HP, mana e atributos (Ataque, Defesa, Velocidade, Magia) em tempo real.
- Ver o próprio personagem evoluir conforme luta.
- Personalizar a aparência do personagem numa tela de outfit idêntica à do Tibia: escolher gênero, escolher entre os outfits reais do jogo (alguns gratuitos, outros comprados com Rubini Coins), ativar/desativar os 2 addons de cada outfit e colorir cabeça, corpo, pernas e pés independentemente, usando a paleta oficial de 133 cores do jogo.
- Ver a própria aparência escolhida refletida em tempo real no personagem — no cabeçalho e na cena de batalha.

## Regras de negócio

- **A escolha de vocação é definitiva.** Uma vez escolhida, não pode ser trocada.
  *Por quê:* espelha a permanência da escolha de vocação em Tibia — trocar de vocação livremente descaracterizaria a identidade do personagem.
- **Cada vocação tem um papel de combate distinto e fiel ao original:** Knight é tanque corpo-a-corpo com HP alto; Paladin é híbrido de distância com HP e mana equilibrados; Sorcerer é magia ofensiva de alto dano e baixa HP; Druid é magia de suporte/cura com dano elemental.
- **Nível máximo é 100.** A quantidade de XP necessária para subir de nível cresce a cada nível (fica progressivamente mais difícil evoluir).
- **HP e mana máximos crescem por nível**, numa taxa própria de cada vocação (Knight ganha mais HP por nível; Sorcerer ganha mais mana).
- **Ataque, defesa e magia do personagem derivam das skills treinadas e do equipamento**, não de um valor fixo por nível — ver [13-skills.md](13-skills.md).
- **A aparência é livre e reversível.** O jogador pode trocar de outfit, gênero, addons e cores quantas vezes quiser, sem custo — só a *compra* de um outfit novo (os cosméticos além dos 4 clássicos) consome Rubini Coins, e só uma vez por outfit.
- **Cor e addons pertencem ao personagem, não ao outfit.** Trocar de outfit preserva as cores e addons já escolhidos — igual ao Tibia real, onde a personalização visual é do jogador, não de cada roupa individualmente.
- **Addons são um toggle cosmético livre, sem sistema de conquista/quest por trás.** No Tibia real, cada addon é desbloqueado separadamente (quests, conquistas). Aqui, qualquer addon dos 2 de cada outfit já vem disponível assim que o outfit é possuído — mesma simplificação já aplicada à compra do outfit em si (compra uma vez, veste/customiza livremente depois).

## Comportamento esperado

- Ao morrer em combate, o personagem retorna com **30% do HP máximo** e perde **5% do XP acumulado no nível atual** (penalidade leve, nunca catastrófica).
- Ao subir de nível, HP e mana são restaurados ao máximo automaticamente.
- A cor escolhida para cada região (cabeça, corpo, pernas, pés) recolore o sprite de verdade, pixel a pixel, igual ao cliente oficial do Tibia — não é um efeito visual aproximado.

## Critérios de aceitação

- [ ] Não é possível trocar de vocação depois de escolhida.
- [ ] Os quatro papéis de combate (tanque, híbrido, mago ofensivo, mago de suporte) são perceptíveis nos números de HP/mana/ataque de cada vocação.
- [ ] O personagem nunca ultrapassa o nível 100.
- [ ] A morte nunca zera progresso — apenas aplica a penalidade leve descrita acima.
- [ ] A tela de outfit permite escolher gênero, outfit, os 2 addons e a cor de cada uma das 4 regiões (cabeça/corpo/pernas/pés) a partir da paleta oficial de 133 cores.
- [ ] A aparência escolhida (outfit + gênero + addons + cores) aparece igual no cabeçalho e na cena de batalha, e sobrevive a salvar/recarregar o jogo.
