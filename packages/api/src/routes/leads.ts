import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { leads, interactions, getLeadsSorted, getInteractionsByLead, addLemmaLog, type Lead, type Interaction } from '../lib/store';
import { summariseLead } from '../agents/summarise';

const router = Router();

// GET /api/leads — sorted by heat + ICP score
router.get('/', (_req, res) => {
  res.json(getLeadsSorted());
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  const history = getInteractionsByLead(req.params.id);
  res.json({ lead, history });
});

// POST /api/leads — create new lead
const CreateLeadSchema = z.object({
  name:       z.string(),
  email:      z.string().email(),
  company:    z.string(),
  title:      z.string(),
  dealValue:  z.number().min(0),
  source:     z.string(),
  stage:      z.enum(['outreach','discovery','demo','proposal','negotiation','won','lost']).default('outreach'),
});

router.post('/', async (req, res) => {
  const parsed = CreateLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const now  = new Date().toISOString();
  const lead: Lead = {
    ...parsed.data,
    id:        uuid(),
    heat:      'cold',
    icpScore:  0,
    createdAt: now,
    updatedAt: now,
  };
  leads.set(lead.id, lead);

  addLemmaLog('lead_created', { lead_id: lead.id, name: lead.name, company: lead.company });

  res.status(201).json(lead);
});

// PATCH /api/leads/:id — update stage, heat, deal value
router.patch('/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  const updated = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  leads.set(lead.id, updated);
  res.json(updated);
});

// POST /api/leads/:id/interactions — log a call, email, or note
const InteractionSchema = z.object({
  type:      z.enum(['email','call','linkedin','note','meeting']),
  summary:   z.string(),
  content:   z.string().optional(),
  direction: z.enum(['inbound','outbound']),
});

router.post('/:id/interactions', async (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });

  const parsed = InteractionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const interaction: Interaction = {
    ...parsed.data,
    id:        uuid(),
    leadId:    req.params.id,
    createdAt: new Date().toISOString(),
  };
  interactions.set(interaction.id, interaction);

  // Re-generate AI summary after new interaction
  summariseLead(req.params.id).catch(console.warn);

  addLemmaLog('interaction_logged', { lead_id: req.params.id, type: interaction.type });
  res.status(201).json(interaction);
});

// POST /api/leads/:id/summarise — trigger AI summary on demand
router.post('/:id/summarise', async (req, res) => {
  try {
    const summary = await summariseLead(req.params.id);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
