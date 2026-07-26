# Zonas de Caça e Cidades

## Objetivo
Organizar as caçadas pela geografia real do Tibia: o jogador escolhe uma **cidade** e vê as **zonas** (hunts) dela, avançando por uma cadeia de dificuldade. Dá senso de mundo e de progressão espacial reconhecível.

## Quem usa
Todo jogador, ao escolher onde caçar.

## O que o usuário precisa conseguir fazer
- Navegar as cidades do Tibia e ver as zonas de cada uma.
- Ver o nível/força aproximada de cada zona e quais estão bloqueadas.
- Entrar numa zona desbloqueada e caçar.

## Regras de negócio
- **A cidade é o eixo de navegação.** Cada zona pertence a uma cidade real do Tibia (Rookgaard, Thais, Carlin, Venore, Edron…). Os "mundos" deixaram de organizar as hunts e viraram só um bônus de fundo (ver [../20-mundos/](../20-mundos/mundos.md)).
- **Ilhas iniciais sempre abertas.** Rookgaard e Dawnport ficam disponíveis desde o início; o personagem só viaja para o continente **a partir do nível 8** (o mesmo marco da graduação). As demais cidades exigem esse nível.
- **Cadeia por boss de zona.** Dentro de uma cidade, as zonas se encadeiam: uma zona só desbloqueia depois de **derrotar o boss da zona anterior**. Cidade com uma zona só não tem trava.
  **Por quê:** dá um caminho de progressão claro e recompensa o avanço, em vez de despejar todas as zonas de uma vez.
- **Boss da zona.** Cada zona tem um boss — normalmente a criatura mais forte do elenco, que também aparece como spawn comum. Derrotá-lo abre a próxima zona da cadeia e pode ser re-desafiado direto pela Boss Zone.
- **Elenco fixo por zona.** Cada zona tem uma lista fixa de criaturas reais do Tibia coerentes com aquela região; o palco de batalha usa um cenário/paleta do bioma da zona.
- Zonas e nomes de dungeon são conteúdo original deste jogo (traduzíveis); nomes de cidade e de criatura são os reais do Tibia (não mudam por idioma).

## Comportamento esperado
- Uma cidade/zona bloqueada aparece marcada e não deixa iniciar a caçada até o requisito ser cumprido.
- A ordem de exibição das zonas segue a dificuldade aproximada (por XP médio das criaturas).
- Escolher uma zona pelo seletor normal sempre sai do modo Boss Zone.

## Critérios de aceitação
- [ ] As caçadas são navegadas por cidade, cada zona pertencendo a uma cidade real do Tibia.
- [ ] Rookgaard e Dawnport estão sempre abertas; o continente exige nível 8.
- [ ] Uma zona encadeada só desbloqueia após derrotar o boss da zona anterior.
- [ ] Cada zona tem elenco fixo de criaturas reais e um boss.
- [ ] Zona bloqueada não permite iniciar a caçada.
