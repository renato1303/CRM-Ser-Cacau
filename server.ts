// Servidor local / AI Studio: usa a mesma API da Vercel (api/index.js) e serve a tela.
// Na Vercel este arquivo NÃO é usado: a tela é publicada pelo build do Vite
// e a API roda como função a partir de api/index.js (ver vercel.json).
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import api, { logStartupWarnings } from './api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const server = express();
server.use(api);

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  server.use(vite.middlewares);
} else {
  server.use(express.static(path.join(__dirname, 'dist')));
  server.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  logStartupWarnings();
});
