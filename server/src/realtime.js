// TEMPO REAL — empurra o estado da caçada no instante em que o tick acontece,
// em vez de esperar o cliente perguntar.
//
// POR QUE: o cliente perguntava a cada 600ms e a resposta levava ~500ms, então
// a tela mostrava um estado até ~1,1s atrasado. O combate resolve a cada 2s
// (velocidade de arma do Tibia, e isso está certo), mas a ENTREGA é que fazia
// parecer que nada era ao vivo. Com push, o golpe chega em ~120ms — o tempo de
// uma via de rede — e o cliente para de gastar 1,7 requisições por segundo.
//
// ADITIVO DE PROPÓSITO: nada aqui é obrigatório. Se o socket não conectar, cair
// ou nem existir, o cliente continua no poll de sempre e o jogo funciona igual.
// Nenhuma decisão de jogo depende do socket — ele só transporta o que o motor
// já calculou.
import { WebSocketServer } from 'ws';
import { validSlot } from './slots.js';

// userId:slot -> Set de sockets (o mesmo personagem pode estar aberto em duas
// abas; as duas devem ver o combate).
const conexoes = new Map();
const chave = (userId, slot) => userId + ':' + slot;

let wss = null;

export function iniciarRealtime(httpServer, verificarToken) {
  // noServer + upgrade manual: o mesmo processo HTTP atende as rotas REST e o
  // socket, sem porta nova (o Railway expõe uma só).
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { return socket.destroy(); }
    if (url.pathname !== '/ws') return socket.destroy();

    // O token vem na query porque o navegador não deixa mandar header no
    // handshake de WebSocket. É o mesmo token Bearer das rotas REST, e a
    // verificação passa pelo mesmo cache de 60s.
    const user = await verificarToken(url.searchParams.get('token'));
    const slot = validSlot(Number(url.searchParams.get('slot')));
    if (!user || slot === null) return socket.destroy();

    wss.handleUpgrade(req, socket, head, ws => {
      const k = chave(user.id, slot);
      if (!conexoes.has(k)) conexoes.set(k, new Set());
      conexoes.get(k).add(ws);
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('close', () => {
        const set = conexoes.get(k);
        if (!set) return;
        set.delete(ws);
        if (!set.size) conexoes.delete(k);
      });
      ws.on('error', () => {});
      ws.send(JSON.stringify({ tipo: 'ola' }));
    });
  });

  // Conexão morta sem FIN (aba fechada bruscamente, rede caída) fica aberta pro
  // servidor pra sempre e vaza memória. O ping/pong derruba quem não responde.
  setInterval(() => {
    if (!wss) return;
    for (const set of conexoes.values()) {
      for (const ws of set) {
        if (!ws.isAlive) { ws.terminate(); continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch {}
      }
    }
  }, 30000).unref?.();

  return wss;
}

// Alguém está ouvindo este personagem? O motor consulta isto antes de montar o
// payload — sem ninguém conectado, nem vale gastar CPU serializando.
export function temOuvinte(userId, slot) {
  const set = conexoes.get(chave(userId, slot));
  return !!(set && set.size);
}

export function empurrar(userId, slot, payload) {
  const set = conexoes.get(chave(userId, slot));
  if (!set || !set.size) return 0;
  const texto = JSON.stringify(payload);
  let enviados = 0;
  for (const ws of set) {
    // readyState 1 = OPEN. Mandar pra socket fechando estoura e derrubaria o
    // tick de combate junto — daí o try/catch por conexão.
    if (ws.readyState !== 1) continue;
    try { ws.send(texto); enviados++; } catch {}
  }
  return enviados;
}
