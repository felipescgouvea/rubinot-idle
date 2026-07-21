# Lista as áreas de caça REAIS do Tibia, agrupadas por cidade, pra escolher
# quais reproduzir no jogo. Fonte: categoria "Hunting Places" do TibiaWiki —
# cada página tem um {{Infobox Hunt}} com `city` e o nível recomendado por
# vocação, que é exatamente o recorte que interessa.
#
# Saída: scripts/hunting-places.json (dados crus) + um relatório no terminal
# marcando o que o jogo JÁ tem, pra não repetir.
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request

API = 'https://tibia.fandom.com/api.php'


def api(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json'})
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode('utf8', 'replace'))
        except Exception:
            if tentativa == 3:
                raise
            time.sleep(1.5 * (tentativa + 1))


def membros_da_categoria():
    saida, cont = [], None
    while True:
        p = {'action': 'query', 'list': 'categorymembers',
             'cmtitle': 'Category:Hunting Places', 'cmlimit': 500}
        if cont:
            p['cmcontinue'] = cont
        d = api(p)
        saida += [x['title'] for x in d['query']['categorymembers']]
        cont = d.get('continue', {}).get('cmcontinue')
        if not cont:
            return [t for t in saida if t not in ('Hunting Places',) and ':' not in t]


def campo(texto, nome):
    m = re.search(r'\|\s*' + nome + r'\s*=([^\n|]*)', texto)
    return m.group(1).strip() if m else ''


def limpar(v):
    v = re.sub(r'\{\{[^}]*\}\}', '', v)          # templates
    v = re.sub(r'\[\[([^\]|]*\|)?([^\]]*)\]\]', r'\2', v)  # links
    return re.sub(r"'''|''", '', v).strip(' .')


def criaturas(texto):
    """Monstros da área — vêm do {{CreatureList|...}} no corpo da página, um por
    linha depois dos parâmetros nomeados (type=, caption=)."""
    saida = []
    for m in re.finditer(r'\{\{\s*CreatureList([^}]*)\}\}', texto, re.I | re.S):
        for parte in m.group(1).split('|'):
            parte = parte.strip()
            if not parte or '=' in parte:
                continue
            nome = limpar(parte)
            if nome and nome not in saida:
                saida.append(nome)
    return saida


def nivel(texto):
    """Menor nível recomendado entre as vocações — serve como 'a partir de'."""
    vals = []
    for f in ('lvlknights', 'lvlpaladins', 'lvlmages'):
        m = re.search(r'\d+', campo(texto, f))
        if m:
            vals.append(int(m.group()))
    return min(vals) if vals else None


def main():
    titulos = membros_da_categoria()
    print(f'áreas na categoria: {len(titulos)}')
    lugares = []
    CH = 40
    for i in range(0, len(titulos), CH):
        lote = titulos[i:i + CH]
        d = api({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                 'rvslots': 'main', 'redirects': 1, 'titles': '|'.join(lote)})
        for pg in d.get('query', {}).get('pages', {}).values():
            rev = pg.get('revisions')
            if not rev:
                continue
            w = rev[0]['slots']['main']['*']
            if 'Infobox Hunt' not in w:
                continue
            lugares.append({
                'nome': pg['title'],
                'cidade': limpar(campo(w, 'city')) or '(sem cidade)',
                'nivel': nivel(w),
                'exp': limpar(campo(w, 'exp')),
                'loot': limpar(campo(w, 'loot')),
                'monstros': criaturas(w),
                'melhorLoot': [limpar(campo(w, f'bestloot{n}')) for n in ('', '2', '3')
                               if limpar(campo(w, f'bestloot{n}'))],
            })
        print(f'  {min(i + CH, len(titulos))}/{len(titulos)}', end='\r', flush=True)
    print()
    json.dump(lugares, io.open('scripts/hunting-places.json', 'w', encoding='utf8'),
              ensure_ascii=False, indent=1)
    print(f'coletadas: {len(lugares)} -> scripts/hunting-places.json')


if __name__ == '__main__':
    main()
