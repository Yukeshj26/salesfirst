import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { runPriorityAgent } from '../agents/priority';
import { draftFollowUp }    from '../agents/followup';
import { getPriorityQueue, addLemmaLog, leads, interactions, type Lead, type Interaction, type FollowUp } from '../lib/store';
import { callGroq } from '../lib/groq';
import { TRANSCRIPT_PARSER_SYSTEM } from '@salesarc/lemma-config';
import { summariseLead } from '../agents/summarise';

const router = Router();

/**
 * POST /api/agent/run
 *
 * The core agentic loop:
 * 1. Re-score and rank all leads (priority agent)
 * 2. Auto-draft follow-ups for top overdue leads
 * 3. Return the updated priority queue + new drafts
 */
router.post('/run', async (_req, res) => {
  try {
    console.log('[Agent] Starting full agentic loop...');

    // Step 1: Priority scoring
    const queue = await runPriorityAgent();

    // Step 2: Draft follow-ups for top 3 leads missing a recent draft
    const newDrafts: FollowUp[] = [];
    for (const lead of queue.slice(0, 3)) {
      try {
        const draft = await draftFollowUp(lead.id);
        newDrafts.push(draft);
      } catch (err) {
        console.warn(`[Agent] Draft failed for ${lead.name}:`, err);
      }
    }

    addLemmaLog('agent_loop_complete', {
      leads_scored: queue.length,
      drafts_created: newDrafts.length,
      top_lead: queue[0]?.name,
    });

    res.json({ queue: queue.slice(0, 8), drafts: newDrafts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/queue — current priority queue (no re-score)
router.get('/queue', (_req, res) => {
  res.json(getPriorityQueue());
});

// POST /api/agent/onboard — parse raw transcript and onboard lead
router.post('/onboard', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    console.log('[Agent] Parsing raw transcript for onboarding...');
    const rawResult = await callGroq(TRANSCRIPT_PARSER_SYSTEM, transcript, 0.2);
    
    // Clean raw JSON response
    const cleanJson = rawResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed.lead || !parsed.lead.name) {
      throw new Error('Failed to extract lead details from transcript');
    }

    const now = new Date().toISOString();
    const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

    const leadId = uuid();
    const lead: Lead = {
      id: leadId,
      name: parsed.lead.name,
      email: parsed.lead.email || `${parsed.lead.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      company: parsed.lead.company || 'Unknown Inc',
      title: parsed.lead.title || 'Executive',
      dealValue: parsed.lead.dealValue || 5000,
      source: parsed.lead.source || 'Website',
      stage: 'outreach',
      heat: 'warm',
      icpScore: 80,
      createdAt: now,
      updatedAt: now,
      followUpDueAt: now,
    };

    leads.set(leadId, lead);
    console.log(`[Agent] Created lead: ${lead.name} (${lead.company})`);

    // Add parsed interactions
    if (Array.isArray(parsed.interactions)) {
      for (const i of parsed.interactions) {
        const intId = uuid();
        const interaction: Interaction = {
          id: intId,
          leadId,
          type: i.type || 'email',
          direction: i.direction || 'inbound',
          summary: i.summary || 'Interaction parsed by AI',
          createdAt: daysAgo(i.daysAgo || 0),
        };
        interactions.set(intId, interaction);
      }
    }

    // Trigger AI summary generation & ICP/Action score recompute
    console.log('[Agent] Running summary and priority loops...');
    await summariseLead(leadId).catch(console.warn);
    await runPriorityAgent().catch(console.warn);
    
    // Auto-draft follow up email draft
    await draftFollowUp(leadId).catch(console.warn);

    addLemmaLog('lead_onboarded_via_transcript', {
      lead_id: leadId,
      name: lead.name,
      company: lead.company,
      interactions_count: parsed.interactions?.length ?? 0
    });

    res.status(201).json({ leadId });
  } catch (err: any) {
    console.error('[Agent] Onboarding failed:', err);
    res.status(500).json({ error: err.message || 'Failed to onboard lead' });
  }
});

export default router;
