import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// In production, serve the built frontend too.
const dist = resolve('dist');
if (process.env.NODE_ENV === 'production' && existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile(resolve(dist, 'index.html')));
}

app.listen(PORT, HOST, () => console.log(`CRM API listening on http://${HOST}:${PORT}`));
