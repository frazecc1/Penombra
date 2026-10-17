// server.ts — Penombra API (partita base lab).
import express from 'express';
import cors from 'cors';
import { apiRouter } from './api.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'penombra-api', mode: 'lab-memory' });
});

app.use(apiRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`penombra-api on :${port}`);
});
