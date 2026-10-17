import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'AuraChat',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Middleware: Static hosting mode by default for high reliability (Zero Vite dependency for deployment)
const isProduction = process.env.NODE_ENV === 'production' || process.env.STATIC_HOSTING === 'true';
const distPath = path.resolve(__dirname, 'dist');

let viteLoaded = false;

if (!isProduction) {
  try {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    viteLoaded = true;
  } catch (err) {
    console.warn('[AuraChat] Running without Vite. Serving static files directly.');
  }
}

// Fallback or Production static server
if (!viteLoaded) {
  const fs = await import('fs');
  if (fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    app.use(express.static(__dirname));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'index.html'));
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AuraChat] Server running at http://localhost:${PORT}`);
});
