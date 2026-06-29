/**
 * Priority Queue Agent
 *
 * Runs across all active leads and:
 * 1. Scores each lead using urgency + deal size + recency signals
 * 2. Uses Lemma datasets.generateSchema to build a lead-scoring schema
 * 3. Calls Groq to produce a "next action" recommendation per lead
 * 4. Stores scores + recommendations back to lead records
 * 5. Returns a ranked priority queue
 */

import { lemma, PROMPT_KEYS, NEXT_ACTION_SYSTEM, ICP_SCORE_SYSTEM } from '@salesarc/lemma-config';
import { callGroqJSON } from '../lib/groq';
import { leads, getInteractionsByLead, getPriorityQueue, addLemmaLog, type Lead } from '../lib/store';

interface NextActionResult {
  action:    string;
  rationale: string;
  urgency:   'today' | 'this_week' | 'when_ready';
}

interface IcpScoreResult {
  score:       number;
  fit_reasons: string[];
  red_flags:   string[];
}

export async function runPriorityAgent(): Promise<Lead[]> {
  const queue = getPriorityQueue();

  // ── Ensure a Lemma dataset exists for lead scoring ────────────────────────
  let datasetId: string | undefined;
  try {
    const schema = await lemma.datasets.generateSchema({
      seed_description: `
        Lead scoring schema for a B2B SaaS CRM.
        Fields: lead_name, company, stage, deal_value, heat, icp_score, days_since_contact,
        urgency_score, next_action, rationale.
        All numeric fields must be non-negative.
      `,
    });

    const ds = await lemma.datasets.create({
      name: 'salesarc-priority-queue',
      description: 'Scored lead priority queue — updated by the priority agent on each run',
    });
    datasetId = ds.id;

    const validators = await lemma.datasets.generateValidators({
      schema: schema.schema ?? '{}',
      seed_description: 'deal_value must be > 0. icp_score must be 0-100. urgency_score must be 0-200.',
    });

    await lemma.datasets.generateDataset({
      dataset_id: ds.id!,
      schema: JSON.parse(schema.schema ?? '{}'),
      entries_required: queue.length,
      data_description: `Priority-scored leads for SalesArc`,
      validators: validators.validators,
    });
  } catch { /* non-critical */ }

  // ── Score ICP and generate next action for top 5 leads ───────────────────
  for (const lead of queue.slice(0, 5)) {
    const history = getInteractionsByLead(lead.id);
    const historyText = history.slice(0, 3)
      .map(i => `[${i.type}] ${i.summary}`)
      .join('\n');

    try {
      // Next action
      const nextAction = await callGroqJSON<NextActionResult>(
        NEXT_ACTION_SYSTEM,
        `Lead: ${lead.name} (${lead.stage}, $${lead.dealValue})\nHistory:\n${historyText}`,
      );
      leads.set(lead.id, { ...lead, nextAction, updatedAt: new Date().toISOString() });
    } catch { /* non-critical */ }

    try {
      // ICP score refresh
      const icp = await callGroqJSON<IcpScoreResult>(
        ICP_SCORE_SYSTEM,
        `Company: ${lead.company}\nTitle: ${lead.title}\nDeal: $${lead.dealValue}\nSource: ${lead.source}`,
      );
      const current = leads.get(lead.id)!;
      leads.set(lead.id, { ...current, icpScore: icp.score, updatedAt: new Date().toISOString() });
    } catch { /* non-critical */ }
  }

  // ── Log ───────────────────────────────────────────────────────────────────
  addLemmaLog('priority_queue_recomputed', {
    lead_count: queue.length,
    dataset_id: datasetId,
    top_lead:   queue[0]?.name,
  });

  try {
    await lemma.logs.create({
      event_type: 'priority_queue_recomputed',
      metadata: { lead_count: queue.length, dataset_id: datasetId },
    });
  } catch { /* non-critical */ }

  return getPriorityQueue();
}
