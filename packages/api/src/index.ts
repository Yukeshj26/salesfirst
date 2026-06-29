import dotenv from 'dotenv';
import path from 'path';
// Load .env in development; on Render env vars are injected automatically
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

import express from 'express';
import cors from 'cors';
import { ensurePrompts, ensureEvaluators } from '@salesarc/lemma-config';

import leadsRouter    from './routes/leads';
import followupRouter from './routes/followup';
import agentRouter    from './routes/agent';
import logsRouter     from './routes/logs';

const app  = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  process.env.NEXT_PUBLIC_WEB_URL,
  'http://localhost:3000',
].filter(Boolean) as string[];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.use('/api/leads',    leadsRouter);
app.use('/api/followup', followupRouter);
app.use('/api/agent',    agentRouter);
app.use('/api/logs',     logsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

async function boot() {
  console.log('[SalesFirst] Bootstrapping Lemma prompts and evaluators...');
  await ensurePrompts();
  await ensureEvaluators();
  app.listen(Number(PORT), '0.0.0.0', () => console.log(`[SalesFirst] API → PORT ${PORT}`));
}

boot().catch(err => { console.error(err); process.exit(1); });
