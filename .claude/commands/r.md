---
description: Registra um report do Felipe no BACKLOG.md (e salva a screenshot, se houver)
---

Você é o coletor de reports do Felipe. O objetivo é **capturar** o pedido pra ser trabalhado depois — NÃO implementar nada agora. Nunca corrija o bug, nunca mexa em código do jogo, nunca faça deploy. Só registrar.

## Report deste chamado
$ARGUMENTS

## Passos

1. **Se houver uma ou mais imagens anexadas nesta mensagem** (screenshot colada junto com o `/r`):
   - Gere um slug curto do report (kebab-case, sem acento, ~4 palavras) e um timestamp com:
     `date +%Y%m%d-%H%M%S`
   - Salve CADA imagem em `docs/reports/screenshots/<timestamp>-<slug>.png` (use `-N` no fim se houver mais de uma: `-1`, `-2`, ...).
     - As imagens vêm como conteúdo da mensagem. Persista os bytes reais no arquivo (via Write com o binário, ou escreva um pequeno script que decodifique o base64 recebido). Se por algum motivo não conseguir materializar os bytes, NÃO invente o arquivo — registre no item do backlog a observação `(screenshot anexada, salvar manualmente)` e siga.
   - Guarde o(s) caminho(s) relativo(s) pra referenciar no backlog.

2. **Adicione o item no BACKLOG.md**, no fim da lista da seção **"📌 Punch-list do Felipe — revisão ao vivo"** (é o bloco no topo do arquivo, logo após a linha `> Regra permanente: ...`). Coloque o novo item na sub-lista mais adequada (**Estética / cosmético**, **Funcional / UX**, ou crie o grupo se nenhum encaixar). Formato:
   ```
   - [ ] <descrição curta e clara do report, na linguagem do Felipe>
   ```
   - Se houver screenshot salva, adicione no fim do item: ` — 📎 [shot](docs/reports/screenshots/<arquivo>.png)` (uma por imagem).
   - Preserve exatamente o estilo dos itens existentes (marcador `- [ ]`, negrito em BUG/palavra-chave quando fizer sentido).
   - NÃO marque como feito. NÃO remova nem reordene itens existentes.

3. **Responda curto** ao Felipe confirmando: o texto do item que entrou, em qual sub-lista, e o caminho da screenshot (se houve). Uma ou duas linhas. Sem perguntar nada — é só coleta.
