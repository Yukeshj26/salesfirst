import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import { ensurePrompts, ensureEvaluators } from '@salesarc/lemma-config';

import leadsRouter    from './routes/leads';
import followupRouter from './routes/followup';
import agentRouter    from './routes/agent';
import logsRouter     from './routes/logs';

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '5mb' }));

app.use('/api/leads',    leadsRouter);
app.use('/api/followup', followupRouter);
app.use('/api/agent',    agentRouter);
app.use('/api/logs',     logsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

async function boot() {
  console.log('[SalesArc] Bootstrapping Lemma prompts and evaluators...');
  await ensurePrompts();
  await ensureEvaluators();
  app.listen(PORT, () => console.log(`[SalesArc] API → http://localhost:${PORT}`));
}

boot().catch(err => { console.error(err); process.exit(1); });
