# Contas e Login

## Objetivo

Dar a cada jogador uma **conta própria**, protegida por login, com o progresso salvo **na nuvem** — de forma que o jogo possa ser retomado em qualquer dispositivo e o progresso não dependa mais só do navegador local.

## Quem usa

Todo jogador. O login é **obrigatório**: o jogo só abre depois de criar uma conta ou entrar.

## O que o usuário precisa conseguir fazer

- **Criar uma conta** com e-mail e senha.
- **Entrar** com e-mail e senha.
- **Sair** da conta (logout).
- Ter o **progresso salvo automaticamente na nuvem**, atrelado à sua conta.
- Voltar depois (mesmo em outro dispositivo/navegador) e **continuar de onde parou** ao entrar.

## Comportamento esperado

- Enquanto não há sessão ativa, uma **tela de login/cadastro cobre o jogo** e nada do jogo é jogável.
- Ao entrar ou criar conta com sucesso, a tela some e o jogo carrega o progresso da conta.
- O cadastro **já entra na hora** (sem etapa de confirmação de e-mail travando o acesso).
- Mensagens de erro claras em português (e-mail/senha incorretos, e-mail já cadastrado, senha curta, etc.).
- O cabeçalho mostra o e-mail logado e um botão para sair.
- Ao sair, o jogo volta para a tela de login e não vaza o progresso do usuário anterior.
- Se o jogador ficar sem internet momentaneamente, o jogo continua com o progresso local e volta a sincronizar quando possível.

## Regras de negócio

1. **Login obrigatório.** O jogo não inicia sem uma conta autenticada.
   - *Por quê:* foi a decisão do dono — cada partida fica atrelada a uma conta.

2. **O progresso é da conta, guardado na nuvem.** O save de cada jogador fica associado ao seu usuário e só ele pode ler/escrever o próprio progresso. Ninguém acessa o save de outra pessoa.
   - *Por quê:* privacidade e integridade — o progresso de um jogador nunca pode ser lido ou sobrescrito por outro.

3. **A nuvem é a fonte de verdade da conta.** Ao entrar, o progresso salvo na nuvem é o que vale. Um jogador que já jogava sem conta, ao criar a primeira conta, leva junto o progresso que tinha no navegador.

4. **Salvamento automático.** O progresso é salvo sozinho durante o jogo (localmente na hora e na nuvem logo em seguida), e também ao fechar/minimizar a aba, para não perder os últimos ganhos.

5. **Senha mínima de 6 caracteres.**

6. **Login por Google fica para uma etapa futura** (o dono optou por começar só com e-mail/senha).

## Critérios de aceitação

- [ ] Sem estar logado, o jogo não abre — aparece a tela de login/cadastro.
- [ ] É possível criar conta com e-mail e senha e já entrar na sequência.
- [ ] É possível entrar com uma conta existente.
- [ ] Entrar em outro dispositivo/navegador carrega o mesmo progresso.
- [ ] O progresso salva sozinho durante o jogo.
- [ ] Um jogador não consegue, de forma alguma, ler ou alterar o save de outro.
- [ ] O botão de sair volta para a tela de login sem manter o progresso anterior na tela.
- [ ] Mensagens de erro aparecem em português e são claras.
