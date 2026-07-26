# Regras de Negócio Gerais

Regras que atravessam mais de uma área funcional do jogo.

## Regras em vigor (comportamento atual do sistema)

Estas regras já são seguidas pelo jogo hoje. Documentadas aqui para que continuem valendo em qualquer evolução futura.

1. **Fidelidade a Tibia/RubinOT é o princípio de design central.** Nomes de criaturas, palavras mágicas das spells, vocações, fórmulas de combate, sistema de skills por uso e sprites de criaturas replicam o Tibia oficial (ou o RubinOT, no conteúdo exclusivo dele). O jogo existe para dar aos fãs uma versão idle de um universo que já conhecem — não uma fantasia genérica.
2. **Crystal Server é a fonte canônica das fórmulas.** Dano, defesa, atributos, regeneração, custo de skill, penalidade de morte e efeitos de magia seguem à risca o source do Crystal Server. Em empate entre wiki e Crystal Server, o Crystal Server vence. Nunca aproximar de memória.
3. **O combate é decidido no servidor.** Gold, XP, dano, cura, morte e loot são autoritativos do servidor; o cliente exibe um espelho fiel. Impede trapaça e mantém consistência entre abrir/fechar o jogo.
4. **Login obrigatório e save na nuvem.** O acesso exige conta; o progresso vive na nuvem (fonte de verdade da conta) e localmente. Uma falha de leitura da nuvem nunca apaga o progresso.
5. **Quatro vocações, com graduação e promoção.** Knight, Paladin, Sorcerer e Druid. A vocação é provisória até a graduação (nível 8) e definitiva depois; promove a partir do nível 20. Ver [02-personagem-e-vocacoes.md](02-personagem-e-vocacoes.md).
6. **A progressão nunca trava de forma permanente.** O nível segue a fórmula do Tibia e não dead-endará; sempre há conteúdo acessível ao nível atual.
7. **Criaturas usam valores reais do Tibia e não escalam com o nível do jogador.** Uma zona serve a uma faixa de nível, como no Tibia; o único multiplicador é o de tier do Boss Zone.
8. **A morte tem penalidade leve, nunca catastrófica.** Segue a fórmula do Crystal Server (amenizada por bênçãos e promoção) e revive com HP parcial — mantém o tom idle-friendly.
9. **Uma tarefa e uma presa por vez; cadeia Linked nas tasks.** As Linked Tasks desbloqueiam em cadeia (tarefa e sala). Ver [13-tasks/](13-tasks/tasks.md).
10. **Prêmios de Arena e Battle Pass são não-materiais.** Só boost, charm, carta de presa e varinha de treino — nunca gold, Rubini Coins ou equipamento. Prêmio material atalharia a economia; prêmio de equipamento quebraria a progressão de loot. (Tarefas e recompensa diária, por outro lado, podem dar material.)

## Princípios de fidelidade ao universo Tibia/RubinOT

Quatro regras que formalizam o princípio 1 acima, cobrindo monstros, sprites, mecânicas e nomes/ícones.

### Regra 1 — Todo monstro deve existir no Tibia
Toda criatura do bestiário deve existir oficialmente no bestiário do Tibia.
- **Por quê:** o valor do jogo é ser reconhecível por quem já jogou. Criaturas inventadas quebram a promessa.
- **Pendência conhecida:** os 5 bosses exclusivos das Linked Tasks (Lothlorien, Executioner, Morgul, The Corrupted, N'Zoth) são conteúdo do RubinOT, não do Tibia oficial. Ou tratá-los como exceção documentada (bosses reais e reconhecidos do RubinOT), ou substituí-los por criaturas de altíssimo nível já existentes no Tibia — decisão pendente do dono.

### Regra 2 — Toda sprite deve existir em Tibia/RubinOT
Toda sprite (criatura, item, cenário) vem de uma fonte real do Tibia/RubinOT — nunca inventada, desenhada do zero ou emprestada de outro jogo.
- **Regra 2.1 — Sprite de monstro vem do CLIENTE do Tibia, sem fallback.** A sprite de toda criatura é a arte real extraída do **cliente oficial** (escala nativa 1:1). Fontes secundárias (TibiaWiki, `.gif`, arte de outra criatura como placeholder) e fallback (emoji) **não são permitidos** para monstros. Uma criatura custom do RubinOT que não existe no cliente **não deve usar arte emprestada** — deve virar a criatura real correspondente do Tibia ou ser removida.
- **Pendências conhecidas:** criaturas ainda com sprite de fonte não-cliente (apareciam "cortadas") precisam ser re-extraídas; os 5 bosses do RubinOT usam sprite de outras criaturas como substituição temporária, o que a Regra 2.1 não aceita como estado final; "Rubini Coin" (moeda premium fictícia) usa a sprite real de Tibia Coin como analogia; ícones de mundos ainda usam emoji (sem equivalente real óbvio).

### Regra 3 — Toda mecânica deve existir em Tibia/RubinOT
Todo sistema/fórmula/comportamento novo deve ter um equivalente real e identificável em Tibia/RubinOT — nada inventado só porque "funciona bem" como idle.
- **Exceções deliberadas confirmadas** (não são pendência): o sistema de **Relíquias** (raridade de item — análogo aos Imbuements) e o sistema de **Mundos** com bônus fixo de XP/Gold. Pedidos explicitamente pelo dono como liberdades de design.
- **A revisar:** Battle Pass sazonal, ranking de Highscores interno e **Boss Zone** (a analogia mais próxima é o Bosstiary do Tibia, sem correspondência exata confirmada). Convém confirmar com o dono se replicam algo real ou são liberdades de design deliberadas.

### Regra 4 — Todo nome e ícone exibido é o real do Tibia
O nome mostrado de criatura/item/magia é o nome oficial em inglês do Tibia — o mesmo em qualquer idioma. Todo ícone (itens, slots, moedas, skills, magias, outfits) usa arte extraída do Tibia/RubinOT, nunca emoji genérico nem biblioteca de terceiros.
- **Conteúdo original deste jogo** (nomes de zona/dungeon, categorias de loja, missões, descrições) não tem "nome real de Tibia" e muda de idioma normalmente.
- **Pendências conhecidas:** ícones de mundos, de Loot Boost e de Supply Completo ainda usam emoji (sem sprite real que represente o conceito abstrato); toasts e ícones genéricos de navegação (🔒/✅/⚔️) ficam fora do escopo até decisão do dono.

## Como tratar pendências de conformidade
Nenhuma regra exige que o jogo pare até ser 100% cumprida — mas toda pendência identificada fica **visível e rastreada aqui**, nunca escondida nem resolvida "por decreto" sem decisão do dono. Ao resolver uma pendência, atualizar este arquivo removendo o item.
