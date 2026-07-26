# Skills (Habilidades)

## Objetivo
Reproduzir a evolução de habilidades do Tibia: cada skill melhora **por uso**, não por pontos distribuídos, e cada vocação evolui cada skill num ritmo próprio. É uma segunda camada de progressão além do nível.

## Quem usa
Todo jogador com personagem criado. A aba **Skills** mostra o nível e o progresso de cada habilidade.

## O que o usuário precisa conseguir fazer
- Ver o nível atual de cada skill e o quanto falta para a próxima.
- Entender qual skill sua vocação/arma treina ao caçar.

## As sete skills (fiéis ao Tibia)
- **Magic Level** — sobe conforme a mana gasta em magias.
- **Fist, Club, Sword, Axe Fighting** — skills de corpo a corpo; sobem ao acertar com a arma correspondente (sem arma de corpo a corpo, treina Fist).
- **Distance Fighting** — sobe ao acertar com arma à distância.
- **Shielding** — sobe ao ser atingido (defesa).

## Regras de negócio
- **Sobe por uso.** Atacar treina a skill da arma equipada; apanhar treina Shielding; gastar mana treina Magic Level. Não há distribuição manual de pontos.
- **A arma equipada decide a skill de melee treinada** — não a vocação. Trocar de espada para machado passa a treinar Axe.
- **Ritmo por vocação, fiel ao Crystal Server.** Cada skill tem seu próprio custo por vocação: knight treina as de arma rápido e Magic Level lentíssimo; mago treina Magic Level rápido e qualquer combate devagar; paladino no meio. Shielding é a mais cara; Distance a mais barata.
  **Por quê:** é o que diferencia as builds no Tibia — cada vocação sobe cada skill num ritmo distinto, nunca um "multiplicador único".
- **Um ganho grande pode subir mais de um nível de uma vez** (fiel ao Tibia: um cast caro pode render 2+ níveis de Magic Level).
- **Antes da graduação (nível 8), a skill sobe no ritmo neutro** (o mais lento), não no da vocação escolhida — ver [../02-personagem-e-vocacoes.md](../02-personagem-e-vocacoes.md).
- As skills também podem ser evoluídas fora do combate pelo **Treino** (ver [../16-training/](../16-training/training.md)).

## Comportamento esperado
- O progresso de cada skill é acumulado ao vivo durante a caçada.
- Cada skill mostra o nível e o avanço até o próximo, refletindo o ritmo da vocação.

## Critérios de aceitação
- [ ] Existem as sete skills do Tibia e cada uma sobe pela ação correspondente (atacar/apanhar/gastar mana).
- [ ] A skill de melee treinada segue a arma equipada, não a vocação.
- [ ] O custo de cada skill por vocação segue os valores do Crystal Server.
- [ ] Um ganho grande pode elevar mais de um nível de uma vez.
- [ ] Personagem provisório treina no ritmo neutro.
