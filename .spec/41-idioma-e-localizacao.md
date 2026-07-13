# Idioma e Localização

## Objetivo

Deixar o jogo acessível a jogadores de qualquer idioma sem depender do português — o padrão do jogo é **inglês**, o mesmo idioma em que Tibia é jogado internacionalmente, e o jogador só vê português se o navegador dele indicar isso (ou se escolher manualmente).

## Quem usa

Qualquer jogador, a partir do primeiro acesso — a detecção acontece automaticamente, sem exigir nenhuma ação.

## O que o usuário precisa conseguir fazer

- Ver o jogo já no idioma certo na primeira visita, sem precisar configurar nada.
- Trocar de idioma manualmente a qualquer momento, em Configurações (⚙️).
- Ter a escolha de idioma lembrada nas próximas visitas, independente do save do personagem.

## Regras de negócio

- **O padrão do jogo é inglês.** Um jogador cujo navegador não indica português vê o jogo em inglês, mesmo sem nunca ter escolhido um idioma.
  *Por quê:* Tibia (o jogo de referência) é majoritariamente jogado em inglês pela comunidade internacional; um jogo derivado dele deve seguir essa mesma convenção por padrão.
- **A detecção usa o idioma do navegador**: se indicar português (de Portugal ou do Brasil), o jogo abre em português; qualquer outro idioma cai no inglês.
- **A troca manual sempre vence a detecção automática** — uma vez que o jogador escolhe um idioma em Configurações, essa escolha persiste e não é mais sobrescrita pela detecção automática.
- **Nomes de criatura, item e magia nunca mudam de idioma.** São os nomes reais de Tibia (ex.: "Dragon Lord", "Death Ring", "exura ico") — como no jogo original, onde esses nomes são os mesmos em qualquer cliente, independente do idioma da interface. Só o texto ao redor (botões, descrições, notificações, nomes de dungeon original deste jogo) muda de idioma.
- **A escolha de idioma é uma preferência de interface, não faz parte do progresso do personagem** — trocar de idioma não afeta level, itens, gold ou qualquer outro dado salvo.

## Comportamento esperado

- Na primeira visita (sem escolha prévia salva), o idioma vem 100% da detecção do navegador.
- Trocar o idioma em Configurações atualiza a tela inteira para refletir a escolha.
- Um texto que ainda não tenha tradução para o idioma escolhido aparece em inglês em vez de quebrar ou ficar em branco.

## Critérios de aceitação

- [ ] Um navegador configurado em português abre o jogo em português; qualquer outro idioma abre em inglês.
- [ ] Configurações mostra as opções de idioma disponíveis e a escolha atual fica destacada.
- [ ] Trocar de idioma em Configurações muda a tela inteira (menus, botões, notificações) para o idioma escolhido.
- [ ] Fechar e reabrir o jogo mantém o idioma escolhido manualmente, mesmo que o navegador indique outro.
- [ ] Nomes de criatura, item e magia permanecem os mesmos (em inglês) em qualquer idioma da interface.
