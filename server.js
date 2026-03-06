const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3030;

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /send → proxy vers Resend
  if (req.method === 'POST' && parsed.pathname === '/send') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Payload invalide.' }));
        return;
      }

      const { token, ...emailPayload } = payload;
      if (!token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Token manquant.' }));
        return;
      }

      const data = JSON.stringify(emailPayload);
      const options = {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        let result = '';
        proxyRes.on('data', chunk => result += chunk);
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(result);
        });
      });

      proxyReq.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Erreur serveur : ' + err.message }));
      });

      proxyReq.write(data);
      proxyReq.end();
    });
    return;
  }

  // GET / → servir index.html
  if (req.method === 'GET' && (parsed.pathname === '/' || parsed.pathname === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(500); res.end('Erreur lecture fichier'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✉  Resend Mailer → http://localhost:${PORT}`);
});
