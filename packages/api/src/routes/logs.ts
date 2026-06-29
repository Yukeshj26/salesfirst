import { Router } from 'express';
import { lemmaLogs } from '../lib/store';

const router = Router();

router.get('/', (_req, res) => {
  const logs = Array.from(lemmaLogs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  res.json(logs);
});

export default router;
