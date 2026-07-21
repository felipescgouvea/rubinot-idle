# Baixa o sprite de cada outfit do jogo nas QUATRO direções, com a máscara de
# recoloração, e salva em assets/outfits-dir/.
#
# Por que existe: o projeto só tinha os atlas de caminhada em duas direções
# (norte, de costas, e sul, de frente). Sem a direção LESTE não dá pra montar o
# palco do Treino Online com o boneco à esquerda virado pra direita atirando no
# dummy — que é o que o Felipe pediu.
#
# De onde vem: outfit-images.ots.me, o renderizador de outfit usado pela
# comunidade de OT. Ele aceita ?direction= e as cores por região, e devolve o
# sprite já montado. Direções observadas: 0=sul, 1=norte, 2=leste (3 devolve
# igual a 0 — o serviço não tem oeste, então oeste sai espelhando a leste).
#
# Como a MÁSCARA é obtida: o serviço não expõe o "template" de recoloração, mas
# aceita a cor de cada região. Então renderizamos uma vez neutro e mais quatro
# vezes pintando UMA região por vez; os pixels que mudam em cada render são
# aquela região. Com isso montamos o template no mesmo formato que o jogo já
# usa (amarelo=cabeça, vermelho=corpo, verde=pernas, azul=pés — ver
# infrastructure/outfitWalkRenderer.js: colorizeFrame).
import io
import json
import os
import sys
import time
import urllib.request

from PIL import Image
import numpy as np

BASE = 'https://outfit-images.ots.me/outfit.php'
OUT = 'assets/outfits-dir'
NEUTRO = 0        # índice de cor "sem tingimento"
TESTE = 94        # índice bem diferente do neutro, pra máscara aparecer
DIRS = {'south': 0, 'north': 1, 'east': 2}   # 3 volta igual a 0 (sem oeste)

# Cor do template por região, no formato que colorizeFrame() reconhece.
TPL_COR = {'head': (255, 255, 0), 'body': (255, 0, 0), 'legs': (0, 255, 0), 'feet': (0, 0, 255)}

cache = {}


def para64(im):
    """Nem todo looktype volta 64x64 (alguns vêm 32x32). Normaliza tudo numa
    célula 64x64, encostado na base e centrado — senão a comparação de sprites
    e o desenho no palco quebram."""
    if im.size == (64, 64):
        return im
    canvas = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((64 - im.width) // 2, 64 - im.height))
    return canvas


def render(looktype, direction, head=NEUTRO, body=NEUTRO, legs=NEUTRO, feet=NEUTRO, addons=0):
    chave = (looktype, direction, head, body, legs, feet, addons)
    if chave in cache:
        return cache[chave]
    url = (f'{BASE}?id={looktype}&addons={addons}&head={head}&body={body}'
           f'&legs={legs}&feet={feet}&direction={direction}')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                im = Image.open(io.BytesIO(r.read())).convert('RGBA')
            im = para64(im)
            cache[chave] = im
            time.sleep(0.12)          # gentileza com o serviço
            return im
        except Exception as e:
            if tentativa == 3:
                raise
            time.sleep(1.5 * (tentativa + 1))


def template_de(looktype, direction):
    """Máscara de recoloração: pinta uma região por vez e vê o que mudou."""
    neutro = np.asarray(render(looktype, direction)).astype(int)
    alpha = neutro[:, :, 3] > 0
    tpl = np.zeros_like(neutro, dtype=np.uint8)
    for regiao, cor in TPL_COR.items():
        pintado = np.asarray(render(looktype, direction, **{regiao: TESTE})).astype(int)
        mudou = (np.abs(pintado[:, :, :3] - neutro[:, :, :3]).sum(axis=2) > 12) & alpha
        # não deixa uma região sobrescrever outra já marcada
        livre = tpl[:, :, 3] == 0
        sel = mudou & livre
        tpl[sel] = (*cor, 255)
    return Image.fromarray(tpl, 'RGBA')


def descobrir_looktypes(outfits, faixa):
    """Casa cada outfit-gênero do jogo com o looktype certo, comparando o render
    frontal do serviço com o sprite que JÁ está em assets/outfits/. Evita
    depender de uma tabela de looktype decorada."""
    alvos = {}
    for oid in outfits:
        for genero in ('male', 'female'):
            p = f'assets/outfits/{oid}-{genero}-1.png'
            if os.path.exists(p):
                alvos[(oid, genero)] = np.asarray(Image.open(p).convert('RGBA')).astype(int)

    candidatos = {}
    for lt in faixa:
        try:
            candidatos[lt] = np.asarray(render(lt, DIRS['south'])).astype(int)
        except Exception:
            continue
        print('.', end='', flush=True)
    print()

    def score(a, b):
        am, bm = a[:, :, 3] > 40, b[:, :, 3] > 40
        uni = (am | bm).sum()
        if not uni:
            return 0.0
        iou = (am & bm).sum() / uni
        comum = am & bm
        if not comum.any():
            return 0.0
        dif = np.abs(a[:, :, :3] - b[:, :, :3])[comum].mean()
        return iou * (1.0 - min(dif, 255) / 255.0)

    mapa, usados = {}, set()
    ranking = []
    for chave, alvo in alvos.items():
        for lt, cand in candidatos.items():
            ranking.append((score(alvo, cand), chave, lt))
    ranking.sort(reverse=True)
    for s, chave, lt in ranking:
        if chave in mapa or lt in usados:
            continue
        mapa[chave] = (lt, round(s, 3))
        usados.add(lt)
    return mapa


def main():
    outfits = [o['id'] for o in json.loads(sys.argv[1])] if len(sys.argv) > 1 else None
    if not outfits:
        print('uso: fetch_outfit_directions.py \'[{"id":"citizen"},...]\'')
        return
    os.makedirs(OUT, exist_ok=True)

    print('descobrindo looktypes...')
    mapa = descobrir_looktypes(outfits, range(128, 161))
    for chave in sorted(mapa):
        print(f'  {chave[0]}-{chave[1]}: looktype {mapa[chave][0]} (score {mapa[chave][1]})')
    json.dump({f'{k[0]}-{k[1]}': v[0] for k, v in mapa.items()},
              open(f'{OUT}/looktypes.json', 'w'), indent=1)

    print('\nbaixando direções...')
    for (oid, genero), (lt, _) in sorted(mapa.items()):
        for nome, d in DIRS.items():
            base = render(lt, d)
            tpl = template_de(lt, d)
            base.save(f'{OUT}/{oid}-{genero}-{nome}.png')
            tpl.save(f'{OUT}/{oid}-{genero}-{nome}-template.png')
        # Oeste não existe no serviço: espelha a leste. É a mesma pose vista do
        # outro lado — o Tibia real tem arte própria, mas espelhar lê certo e
        # evita deixar a direção faltando.
        for suf in ('', '-template'):
            im = Image.open(f'{OUT}/{oid}-{genero}-east{suf}.png')
            im.transpose(Image.FLIP_LEFT_RIGHT).save(f'{OUT}/{oid}-{genero}-west{suf}.png')
        print(f'  {oid}-{genero} ok')


if __name__ == '__main__':
    main()
