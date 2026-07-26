# Login e Conta

## Objetivo
Vincular o progresso a uma conta salva na nuvem, para não se perder, valer no ranking global e permitir mais de um personagem. Porta de entrada do jogo.

## Quem usa
Todo jogador. A tela de login/registro aparece antes do jogo.

## O que o usuário precisa conseguir fazer
- Registrar conta (e-mail e senha) ou entrar numa existente.
- Manter mais de um personagem na mesma conta e trocar entre eles.
- Sair da conta (logout).

## Regras de negócio
- **Login obrigatório.** Acesso exige conta; progresso salvo na nuvem vinculado a ela — para o save não se perder entre dispositivos e sustentar o ranking global (um nome, uma conta).
- **A nuvem é a fonte de verdade da conta.** Ao entrar, save na nuvem vira o save da sessão; conta nova **importa** o progresso local de quem já jogava.
- **Múltiplos personagens.** Número fixo de slots; cada slot guarda seu próprio progresso (inclusive o momento do último save, para o cálculo offline ficar correto por personagem).
- **Trocar de personagem** salva o atual antes e carrega o escolhido; slot vazio leva à criação.
- **Falha de leitura da nuvem não apaga progresso.** Se a nuvem não puder ser lida, o jogo não sobrescreve/zera o save.

## Comportamento esperado
- Primeiro login em dispositivo novo já mostra o personagem da nuvem (sem recarregar).
- Criar a primeira conta a partir de progresso local traz esse progresso para a conta.
- Trocar de slot nunca mistura o progresso de dois personagens.

## Critérios de aceitação
- [ ] O jogo exige login (e-mail/senha) e salva o progresso na nuvem.
- [ ] A nuvem é a fonte de verdade; a primeira conta importa o progresso local existente.
- [ ] A conta suporta múltiplos personagens em slots independentes.
- [ ] Trocar de personagem salva o atual e carrega o escolhido, sem misturar progresso.
- [ ] Uma falha de leitura da nuvem nunca apaga o progresso salvo.
