const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' });

  const token = process.env.RESEND_API_KEY;
  if (!token) return res.status(500).json({ message: 'RESEND_API_KEY non configuré sur le serveur.' });

  const payload = JSON.stringify(req.body);

  const options = {
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const proxyReq = https.request(options, proxyRes => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.status(proxyRes.statusCode).json(JSON.parse(data));
    });
  });

  proxyReq.on('error', err => res.status(500).json({ message: err.message }));
  proxyReq.write(payload);
  proxyReq.end();
};
