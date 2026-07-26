# Configurações e Idioma

## Objetivo
Reunir as preferências do jogador — idioma, venda automática, gerenciamento de personagens e conta — num só lugar, e definir o comportamento de idioma do jogo.

## Quem usa
Todo jogador. As Configurações abrem a partir do cabeçalho/menu.

## O que o usuário precisa conseguir fazer
- Trocar o idioma da interface.
- Gerenciar personagens (trocar de slot, criar em slot vazio).
- Configurar a venda automática de loot.
- Sair da conta e reiniciar o progresso, se quiser.

## Regras de negócio

### Idioma
- **Inglês é o idioma padrão do jogo.** No primeiro acesso, o idioma é **detectado pelo navegador**: navegador em português abre em português; qualquer outro abre em inglês.
- O jogador pode **trocar o idioma manualmente**, e a escolha é lembrada.
- **Nomes reais do Tibia não mudam por idioma.** Criatura, item, magia, skill e cidade mantêm o nome oficial em inglês em qualquer idioma; só o texto original do jogo (nomes de zona, descrições, missões) é traduzido. Ver [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

### Outras preferências
- **Venda automática** com presets por valor de loot (desligado / lixo barato / lixo comum), para não entupir a mochila.
- **Personagens:** lista os slots com vocação/nível; permite trocar para outro ou criar num slot vazio.
- **Conta:** logout; opção de reiniciar o progresso (com confirmação).

## Comportamento esperado
- Trocar o idioma reflete na interface imediatamente, sem perder o estado do jogo.
- Um texto sem tradução no idioma escolhido cai no inglês (nunca mostra a "chave" crua).

## Critérios de aceitação
- [ ] O idioma padrão é inglês, com detecção automática de português no primeiro acesso.
- [ ] O jogador pode trocar o idioma e a escolha é lembrada.
- [ ] Nomes reais do Tibia permanecem em inglês em qualquer idioma.
- [ ] As Configurações permitem gerenciar venda automática, personagens e conta.
