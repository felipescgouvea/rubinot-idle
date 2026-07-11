# Regras de Negócio Gerais

Regras que atravessam mais de uma área funcional do jogo.

## Regras já em vigor (derivadas do comportamento atual do sistema)

Estas regras já são seguidas pelo jogo hoje, mesmo sem terem sido escritas antes. Documentadas aqui para que continuem sendo respeitadas em qualquer evolução futura.

1. **Fidelidade a Tibia é o princípio de design central.** Nomes de criaturas, palavras mágicas das spells, vocações, sistema de skills por uso e sprites de criaturas replicam o Tibia oficial.
   **Por quê:** o jogo existe para dar aos fãs de Tibia/RubinOT uma versão idle nostálgica de um universo que já conhecem — não uma fantasia genérica.
2. **Conteúdo exclusivo do RubinOT convive com o conteúdo do Tibia oficial.** As Linked Tasks e seus 5 bosses finais (Lothlorien, Executioner, Morgul, The Corrupted, N'Zoth) refletem um sistema real e exclusivo do servidor RubinOT, não do Tibia original.
3. **O RTC replica o RTCaster real do RubinOT** — ataque automático (uma magia OU uma runa) e cura automática (uma magia E uma poção, cada uma com seu próprio limiar de % de HP), na segunda aba do jogo (ver [14-spells-e-rtc.md](14-spells-e-rtc.md)).
4. **A progressão nunca trava de forma permanente.** Level cap existe (100), mas sempre há conteúdo acessível para o nível atual do personagem.
5. **Apenas uma tarefa ativa por vez**, e a primeira conclusão de cada task vale o dobro da recompensa.
6. **Criaturas escalam com o nível do personagem dentro da mesma zona**, para que uma zona continue relevante por mais tempo em vez de ficar obsoleta rapidamente.
7. **A morte tem penalidade leve, nunca catastrófica** (5% de XP do nível atual, retorno com 30% do HP máximo) — mantém o tom "idle-friendly" do jogo.

## Novas regras — fidelidade ao universo Tibia/RubinOT

Estas 4 regras foram definidas para reforçar e formalizar o princípio de fidelidade já presente no jogo (regra 1 acima), cobrindo especificamente monstros, sprites, mecânicas e ícones.

### Regra 1 — Todo monstro deve existir no Tibia

Toda criatura adicionada ao bestiário do jogo deve ser uma criatura que existe oficialmente no bestiário do Tibia.

- **Por quê:** o valor do jogo é ser reconhecível por quem já jogou Tibia/RubinOT. Criaturas inventadas quebram essa promessa e transformam o jogo em uma fantasia genérica.
- **Como aplicar:** antes de adicionar uma criatura nova, confirmar sua existência no bestiário oficial do Tibia (TibiaWiki ou fonte equivalente) — nome, aparência e papel devem corresponder ao original.
- **Pendência de conformidade identificada:** os 5 bosses exclusivos das Linked Tasks (Lothlorien, Executioner, Morgul, The Corrupted, N'Zoth) **não existem no bestiário oficial do Tibia** — são conteúdo exclusivo do servidor RubinOT. Como esta regra, no texto que a originou, cita apenas "Tibia", essas 5 criaturas ficam em situação a resolver:
  - **Opção A:** tratar monstros de conteúdo exclusivo de Linked Tasks como uma exceção documentada da Regra 1, desde que confirmados como bosses reais e reconhecidos do RubinOT (não inventados para este jogo idle).
  - **Opção B:** substituir os 5 bosses por criaturas de altíssimo nível já existentes no bestiário oficial do Tibia.
  - Até essa decisão ser tomada pelo dono do produto, os 5 bosses permanecem como *débito de conformidade conhecido*, não como violação silenciosa.

### Regra 2 — Toda sprite deve existir em Tibia/RubinOT

Toda sprite usada no jogo (criatura, item, cenário) deve vir de uma fonte real do Tibia ou do RubinOT — nunca inventada, desenhada do zero ou emprestada de outro jogo/franquia.

- **Por quê:** mantém a identidade visual reconhecível — parte do mesmo motivo da Regra 1, aplicado à arte em vez do texto.
- **Como aplicar:** sprites de criaturas já seguem esta regra, carregadas diretamente de uma fonte oficial de Tibia. Ao adicionar sprites novas (itens, cenários, efeitos), a mesma fonte/critério deve ser usado.
- **Pendência de conformidade identificada:**
  - Os 5 bosses exclusivos do RubinOT usam, hoje, sprites de **outras criaturas do Tibia** como substituição temporária (ex.: o boss "Lothlorien" usa a sprite de "Elf Arcanist"), porque o boss em si não tem sprite própria disponível na fonte usada. Isso não é a sprite real da criatura retratada — é um placeholder e deve ser tratado como tal até haver uma sprite correta disponível.
  - Ícones de moedas, habilidades, magias e mundos ainda usam emojis genéricos (ver Regra 4).
- **Resolvido:** ícones de itens de equipamento (incluindo runas e poções usadas no RTC) usam sprites reais extraídas do TibiaWiki. Outfits (incluindo cor por região e addons) usam sprites reais extraídas do cliente oficial do Tibia, recoloridas por região com o mesmo algoritmo do jogo original — ver [10-personagem-e-vocacoes.md](10-personagem-e-vocacoes.md).

### Regra 3 — Toda mecânica deve existir em Tibia/RubinOT

Todo sistema, fórmula ou comportamento de jogo novo deve ter um equivalente real e identificável em Tibia ou RubinOT — nada deve ser inventado do zero só porque "funciona bem" como mecânica de jogo idle.

- **Por quê:** o valor do produto é a fidelidade ao original. Mecânicas puramente genéricas de jogos idle (sem lastro no jogo real) diluem essa promessa.
- **Como aplicar:** antes de propor uma mecânica nova, indicar explicitamente qual mecânica real de Tibia/RubinOT ela representa. Exemplos de mecânicas já corretamente lastreadas: Linked Tasks, skills que sobem por uso, Smart Healing, Rubini Store (Ctrl+S), divisões da Prestige Arena, escala de dano por skill/equipamento.
- **Pontos a revisar (correspondência com o real ainda não confirmada por esta especificação):** o sistema de "Mundos" com bônus fixos de XP/Gold por mundo, a progressão de Battle Pass sazonal, e o ranking global de Highscores dentro do próprio jogo idle. Convém confirmar com o dono do produto se esses sistemas replicam algo real do RubinOT/Tibia ou se são liberdades de design assumidas conscientemente para este jogo idle — e, neste segundo caso, registrá-los aqui como exceção deliberada em vez de deixá-los como pendência.

### Regra 4 — Todo ícone deve existir em Tibia/RubinOT

Todo ícone de interface (itens, slots de equipamento, moedas, skills, magias, configurações de RTC, mundos, outfits) deve usar arte extraída do Tibia ou do RubinOT — nunca emojis genéricos nem ícones de bibliotecas de terceiros.

- **Por quê:** mesmo motivo da Regra 2 — a identidade visual do jogo deve parecer "o jogo de verdade", não uma interface genérica de jogo idle com emojis.
- **Resolvido:** sprites de criaturas, ícones de itens de equipamento e outfits (com cor e addons reais) já usam arte extraída do Tibia. Ícones de zona de caça (galeria de escolha e barra da zona atual) usam a sprite real do monstro principal da zona (o primeiro do elenco), em vez de um emoji temático — mesma fonte já usada pras criaturas.
- **Pendência de conformidade identificada:** ícones de moedas (gold, Rubini Coins), skills, magias, ajustes de RTC e mundos ainda usam emojis Unicode genéricos como substituto. Aplicar esta regra por completo a esses pontos exige adotar a mesma fonte de ícones do jogo (sprites do TibiaWiki) já usada para itens, outfits e zonas.

## Como tratar pendências de conformidade

Nenhuma das 4 regras acima exige que o jogo pare de funcionar até ser 100% cumprida — mas toda pendência identificada deve ficar **visível e rastreada** aqui, nunca escondida ou resolvida "por decreto" sem decisão do dono do produto. Ao resolver uma pendência (trocar um ícone, confirmar um boss, substituir uma sprite), atualizar este arquivo removendo o item resolvido.
