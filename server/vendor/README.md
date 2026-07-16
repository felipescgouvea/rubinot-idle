# vendor/domain

Cópia VERBATIM de `src/domain/{bestiary,combatFormulas,character,items,rarity,progression,adminConfig}.js`
do cliente. Existe porque o deploy do Railway empacota só o diretório
`server/` (não o monorepo inteiro), então um `import` relativo pra fora dele
(`../../src/domain/...`) não resolve no runtime — só localmente, onde o
repo inteiro está no disco.

**Se qualquer um desses arquivos mudar em `src/domain/`, copie de novo aqui**
(são funções puras, sem dependência de DOM — só copiar e colar) e faça um
novo deploy do servidor. Nada aqui deve ser editado diretamente; edite a
fonte em `src/domain/` e recopie.
