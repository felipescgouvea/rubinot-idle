import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
const ROOT='C:/workspace/rubinot-idle';
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
createServer(async(req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const full=normalize(join(ROOT,p));if(!full.startsWith(normalize(ROOT))){res.writeHead(403);return res.end();}const d=await readFile(full);res.writeHead(200,{'Content-Type':MIME[extname(full).toLowerCase()]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(d);}catch{res.writeHead(404);res.end('nf');}}).listen(8791,()=>console.log('static 8791'));
