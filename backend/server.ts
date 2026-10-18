// server.ts — Penombra API (partita base lab).
import express from 'express';
import cors from 'cors';
import { apiRouter } from './api.js';
import { ensureCatalog, getCatalogSource } from './engine-storage.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'penombra-api', mode: 'lab-memory', catalog: getCatalogSource(), build: 'v5-draw-choice' });
});

app.use(apiRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, async () => {
  console.log(`penombra-api on :${port}`);
  try {
    await ensureCatalog();
  } catch (e) {
    console.warn('[penombra] preload catalog fallito:', e);
  }
});
