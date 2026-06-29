/**
 * Lead Summary Agent
 *
 * For a given lead:
 * 1. Fetches all interaction history from the store
 * 2. Creates a Lemma prompt iteration (versioned, trackable)
 * 3. Calls Groq to produce a lead summary
 * 4. Runs the Lemma evaluator to score the summary quality
 * 5. Persists summary + score back to the lead record
 * 6. Logs the whole event via lemma.logs
 */

import { lemma, PROMPT_KEYS, LEAD_SUMMARY_SYSTEM } from '@salesarc/lemma-config';
import { callGroq } from '../lib/groq';
import { leads, getInteractionsByLead, addLemmaLog } from '../lib/store';

export async function summariseLead(leadId: string): Promise<string> {
  const lead = leads.get(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const history = getInteractionsByLead(leadId);
  if (history.length === 0) return 'No interactions recorded yet.';

  const historyText = history
    .map(i => `[${i.type.toUpperCase()} · ${i.direction} · ${i.createdAt.slice(0, 10)}]\n${i.summary}`)
    .join('\n\n');

  const userPrompt = `
Lead: ${lead.name} (${lead.title} at ${lead.company})
Deal value: $${lead.dealValue.toLocaleString()}
Stage: ${lead.stage}
Source: ${lead.source}

Conversation history:
${historyText}
`.trim();

  // ── Log this as a Lemma prompt iteration ──────────────────────────────────
  let promptId: string | undefined;
  try {
    const promptRecord = await lemma.prompts.create({
      name: `${PROMPT_KEYS.LEAD_SUMMARY}-${leadId}`,
      description: `Summary for ${lead.name}`,
    });
    const iteration = await lemma.prompts.createIteration(promptRecord.id!, {
      content: userPrompt,
      description: `${history.length} interactions · stage: ${lead.stage}`,
    });
    promptId = iteration.id;
  } catch { /* non-critical */ }

  // ── Generate summary via Groq ──────────────────────────────────────────────
  const summary = await callGroq(LEAD_SUMMARY_SYSTEM, userPrompt, 0.3);

  // ── Evaluate summary quality via Lemma ────────────────────────────────────
  let qualityScore: number | undefined;
  try {
    const evalResult = await lemma.evaluators.evaluate({
      evaluator_name: 'salesarc-summary-quality',
      input: userPrompt,
      output: summary,
    });
    qualityScore = evalResult.score;
  } catch { /* non-critical */ }

  // ── Persist summary to lead ───────────────────────────────────────────────
  leads.set(leadId, { ...lead, aiSummary: summary, updatedAt: new Date().toISOString() });

  // ── Log to Lemma ──────────────────────────────────────────────────────────
  addLemmaLog('lead_summary_generated', {
    lead_id: leadId,
    lead_name: lead.name,
    interaction_count: history.length,
    quality_score: qualityScore,
    prompt_iteration_id: promptId,
  });

  try {
    await lemma.logs.create({
      event_type: 'lead_summary_generated',
      metadata: { lead_id: leadId, quality_score: qualityScore },
    });
  } catch { /* non-critical */ }

  return summary;
}
