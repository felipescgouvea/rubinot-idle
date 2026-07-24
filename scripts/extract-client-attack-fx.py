#!/usr/bin/env python3
"""
Extrai os SWINGS de corpo-a-corpo (efeitos 304-309 do cliente Tibia 15.x) do
cliente oficial e gera os .webp animados em assets/sprites/effects/attack/.

Estes são os sprites REAIS da CipSoft (a "animação de ataque" introduzida no
update 15.12 — CreatureMark IsAttacked). Um efeito por tipo de arma:
    304 sword | 305 club | 306 axe | 307 monk-staff | 308 monk-daggers | 309 fist

Fonte: instale o cliente oficial (https://www.tibia.com/download/) e deixe-o
baixar os assets. Eles ficam em:
    %LOCALAPPDATA%\\Tibia\\packages\\Tibia\\assets\\
        catalog-content.json        -> índice das folhas de sprite
        appearances-*.dat           -> protobuf (efeito -> sprite ids + frames)
        sprites-*.bmp.lzma          -> folhas de sprite (BMP comprimido, formato CIP)

Formato do .bmp.lzma (CIP): [padding][magic 70 0A FA 80 24][varint tamanho]
[props(1)][dict(4)][tamanho(8)][stream LZMA1 raw]. O stream é LZMA1 cru — decodifica
com FORMAT_RAW usando props/dict do header, pulando o campo de tamanho de 8 bytes.

Uso:  python scripts/extract-client-attack-fx.py [caminho-para-assets]
"""
import os, sys, glob, json, struct, lzma, io
from PIL import Image

ASSETS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.environ.get("LOCALAPPDATA", ""), "Tibia", "packages", "Tibia", "assets")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "effects", "attack")
os.makedirs(OUT, exist_ok=True)

EFFECTS = {304: "sword", 305: "club", 306: "axe",
           307: "monk-staff", 308: "monk-daggers", 309: "fist"}
DIR_EAST = 5          # d = y*3 + x ; leste (x=2,y=1) casa com o boneco atacando p/ direita
UPSCALE = 4           # 32px -> 128px, nítido (nearest) pra CSS reescalar à vontade
SPR_DIM = {0: (32, 32), 1: (32, 64), 2: (64, 32), 3: (64, 64)}

# ---------- folhas de sprite ----------
cat = json.load(open(os.path.join(ASSETS, "catalog-content.json")))
sheets = sorted([e for e in cat if e.get("type") == "sprite"], key=lambda e: e["firstspriteid"])
_cache = {}

def sheet_image(fname):
    if fname in _cache:
        return _cache[fname]
    b = open(os.path.join(ASSETS, fname), "rb").read()
    p = b.find(bytes([0x70, 0x0A, 0xFA, 0x80, 0x24])) + 5
    while b[p] & 0x80:      # pula o varint de tamanho do CIP
        p += 1
    p += 1
    props = b[p]
    lc, r = props % 9, props // 9
    lp, pb = r % 5, r // 5
    dict_size = struct.unpack("<I", b[p + 1:p + 5])[0]
    filt = [{"id": lzma.FILTER_LZMA1, "dict_size": dict_size, "lc": lc, "lp": lp, "pb": pb}]
    raw = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filt).decompress(b[p + 13:])
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    _cache[fname] = img
    return img

def sprite(sid):
    e = next(x for x in sheets if x["firstspriteid"] <= sid <= x["lastspriteid"])
    sw, sh = SPR_DIM[e["spritetype"]]
    img = sheet_image(e["file"])
    cols = img.width // sw
    k = sid - e["firstspriteid"]
    x, y = (k % cols) * sw, (k // cols) * sh
    return img.crop((x, y, x + sw, y + sh))

# ---------- protobuf mínimo (só efeito -> sprite ids + frames) ----------
def rv(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1; r |= (c & 0x7F) << s
        if not c & 0x80: return r, i
        s += 7

def parse(b):
    i, n, out = 0, len(b), {}
    while i < n:
        t, i = rv(b, i); fn, wt = t >> 3, t & 7
        if wt == 0: v, i = rv(b, i)
        elif wt == 2:
            ln, i = rv(b, i); v = b[i:i + ln]; i += ln
        elif wt == 1: v = b[i:i + 8]; i += 8
        elif wt == 5: v = b[i:i + 4]; i += 4
        out.setdefault(fn, []).append((wt, v))
    return out

def ulist(f5):
    ids = []
    for wt, v in f5:
        if wt == 0: ids.append(v)
        elif wt == 2:
            j = 0
            while j < len(v):
                x, j = rv(v, j); ids.append(x)
    return ids

root = parse(open(glob.glob(os.path.join(ASSETS, "appearances-*.dat"))[0], "rb").read())

def effect(eid):
    for _, raw in root.get(3, []):           # field 3 = effect
        ap = parse(raw)
        if ap.get(1, [(0, 0)])[0][1] == eid:
            fg = parse(ap[2][0][1]); si = parse(fg[3][0][1])
            ids = ulist(si.get(5, []))
            pw = si.get(1, [(0, 1)])[0][1]; ph = si.get(2, [(0, 1)])[0][1]
            dur = []
            if si.get(6):
                a = parse(si[6][0][1])
                for _, pr in a.get(6, []):
                    dur.append(parse(pr).get(1, [(0, 100)])[0][1])
            return ids, pw, ph, dur
    raise KeyError(eid)

# ---------- gera ----------
for eid, name in EFFECTS.items():
    ids, pw, ph, dur = effect(eid)
    nfr = len(dur) or len(ids) // (pw * ph)
    frames = [sprite(ids[fr * (pw * ph) + DIR_EAST]).resize(
        (32 * UPSCALE, 32 * UPSCALE), Image.NEAREST) for fr in range(nfr)]
    durs = [dur[fr] if fr < len(dur) else 100 for fr in range(nfr)]
    dest = os.path.join(OUT, f"attack-{name}.webp")
    frames[0].save(dest, save_all=True, append_images=frames[1:],
                   duration=durs, loop=0, lossless=True, disposal=2)
    print(f"  {eid} {name}: {nfr} frames {durs} -> attack-{name}.webp")
print("pronto.")
