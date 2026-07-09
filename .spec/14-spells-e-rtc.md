# Spells & RTC (Rubinot Custom Client)

## Objetivo

Dar ao jogador controle sobre como o personagem se comporta de forma automática em combate — qual magia castar, quando curar — e sobre ajustes de "cliente customizado" que trocam um benefício por uma perda real, como um jogador de Tibia faria ao configurar seu client.

## Quem usa

Jogador, nas abas Spells e RTC.

## O que o usuário precisa conseguir fazer

- Ver as magias disponíveis para sua vocação, com nome, palavras mágicas, nível mínimo, custo de mana e efeito.
- Selecionar uma magia de ataque e uma de cura para autocast durante a caçada.
- Ajustar configurações do RTC (Auto Loot, Smart Healing, Modo Gráfico, Latência, Hunt Analyzer) e entender o efeito de cada uma.

## Regras de negócio

- **Toda magia tem palavras mágicas reais de Tibia** (ex.: "exura", "exori", "exevo gran mas vis"), nível mínimo de vocação e custo de mana fiéis à proporção de poder das magias originais.
- **O jogador escolhe no máximo uma magia de ataque e uma de cura por vez** para autocast; a caçada usa essas escolhas automaticamente a cada combate.
- **Sem uma magia de cura selecionada, o Smart Healing usa "Light Healing" (exura) como padrão.**
- **Toda configuração do RTC tem uma contrapartida real — nunca é só um bônus.** Exemplos: Auto Loot aumenta a chance de loot mas cobra uma taxa sobre o gold coletado; Modo Gráfico "Performance" acelera o ataque mas reduz XP ganho; Latência alta reduz o dano causado.
  *Por quê:* simula a escolha real de configuração de um client de Tibia, em que otimizar um aspecto custa outro.
- **Mudar uma configuração de velocidade (Modo Gráfico) durante a caçada reinicia o ritmo de ataque** para refletir o novo valor imediatamente.

## Comportamento esperado

- Uma magia deixa de estar disponível (e é removida do autocast) se o personagem cair abaixo do nível exigido por ela — o que só pode ocorrer por migração de save antigo, nunca por perda de nível em jogo normal.

## Critérios de aceitação

- [ ] Nenhuma magia é usável abaixo do seu nível mínimo.
- [ ] Toda configuração do RTC exibe, em texto, o benefício E a perda que ela causa.
- [ ] O autocast de ataque e cura respeita exatamente a magia selecionada pelo jogador.
