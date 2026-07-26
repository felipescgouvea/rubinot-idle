# Login e Conta

## Objetivo
Vincular o progresso a uma conta salva na nuvem, para não se perder, valer no ranking global e permitir mais de um personagem. É a porta de entrada do jogo.

## Quem usa
Todo jogador. A tela de login/registro aparece antes do jogo.

## O que o usuário precisa conseguir fazer
- Registrar uma conta com e-mail e senha, ou entrar numa conta existente.
- Manter mais de um personagem na mesma conta e trocar entre eles.
- Sair da conta (logout).

## Regras de negócio
- **Login obrigatório.** O acesso exige conta (e-mail e senha); o progresso fica salvo na nuvem vinculado a ela.
  **Por quê:** garante que o save não se perca entre dispositivos e sustenta o ranking global (um nome, uma conta).
- **A nuvem é a fonte de verdade da conta.** Ao entrar, se há save na nuvem, ele vira o save da sessão; se a conta é nova, o progresso local (de quem já jogava) é **importado** para a primeira conta.
- **Múltiplos personagens.** A conta tem um número fixo de slots de personagem; cada slot guarda seu próprio progresso (inclusive o momento do último save, para o cálculo offline ficar correto por personagem).
- **Trocar de personagem** salva o atual antes e carrega o escolhido; um slot vazio leva à criação de personagem.
- **Falha de leitura da nuvem não apaga progresso.** Se a nuvem não puder ser lida, o jogo não sobrescreve/zera o save — protege contra perda por erro de rede.

## Comportamento esperado
- Primeiro login num dispositivo novo já mostra o personagem da nuvem (sem precisar recarregar).
- Criar a primeira conta a partir de um progresso local traz esse progresso para a conta.
- Trocar de slot nunca mistura o progresso de dois personagens.

## Critérios de aceitação
- [ ] O jogo exige login (e-mail/senha) e salva o progresso na nuvem.
- [ ] A nuvem é a fonte de verdade; a primeira conta importa o progresso local existente.
- [ ] A conta suporta múltiplos personagens em slots independentes.
- [ ] Trocar de personagem salva o atual e carrega o escolhido, sem misturar progresso.
- [ ] Uma falha de leitura da nuvem nunca apaga o progresso salvo.
