import { Router } from 'express';
import { followUps, leads, addLemmaLog } from '../lib/store';
import { draftFollowUp } from '../agents/followup';

const router = Router();

// GET /api/followup — all drafts, sorted newest first
router.get('/', (_req, res) => {
  const all = Array.from(followUps.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(all);
});

// GET /api/followup/due — leads with overdue follow-ups, with drafts
router.get('/due', (_req, res) => {
  const now = Date.now();
  const due = Array.from(leads.values())
    .filter(l => l.followUpDueAt && new Date(l.followUpDueAt).getTime() < now + 86400000)
    .sort((a, b) => (a.followUpDueAt ?? '').localeCompare(b.followUpDueAt ?? ''));
  res.json(due);
});

// POST /api/followup/draft/:leadId — generate a new AI draft
router.post('/draft/:leadId', async (req, res) => {
  try {
    const draft = await draftFollowUp(req.params.leadId);
    res.status(201).json(draft);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/followup/:id/send — mark as sent
router.patch('/:id/send', (req, res) => {
  const fu = followUps.get(req.params.id);
  if (!fu) return res.status(404).json({ error: 'Not found' });
  const updated = { ...fu, status: 'sent' as const };
  followUps.set(fu.id, updated);
  addLemmaLog('followup_sent', { followup_id: fu.id, lead_id: fu.leadId });
  res.json(updated);
});

// PATCH /api/followup/:id/skip — mark as skipped
router.patch('/:id/skip', (req, res) => {
  const fu = followUps.get(req.params.id);
  if (!fu) return res.status(404).json({ error: 'Not found' });
  followUps.set(fu.id, { ...fu, status: 'skipped' });
  res.json({ ok: true });
});

export default router;
