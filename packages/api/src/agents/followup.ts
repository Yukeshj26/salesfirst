/**
 * Follow-up Draft Agent
 *
 * For a given lead:
 * 1. Pulls lead summary + last interaction from store
 * 2. Registers a new Lemma prompt iteration for the draft
 * 3. Calls Groq to write a personalised follow-up email
 * 4. Scores the draft using the Lemma follow-up quality evaluator
 * 5. Stores the draft as a FollowUp record (status: 'draft')
 * 6. Logs the event to Lemma
 */

import { lemma, PROMPT_KEYS, FOLLOWUP_DRAFT_SYSTEM } from '@salesarc/lemma-config';
import { callGroq } from '../lib/groq';
import { leads, getInteractionsByLead, followUps, addLemmaLog, type FollowUp } from '../lib/store';
import { v4 as uuid } from 'uuid';

export async function draftFollowUp(leadId: string): Promise<FollowUp> {
  const lead = leads.get(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const history = getInteractionsByLead(leadId);
  const lastInteraction = history[0];

  const userPrompt = `
Lead: ${lead.name}, ${lead.title} at ${lead.company}
Stage: ${lead.stage}
Deal value: $${lead.dealValue.toLocaleString()}
Last interaction (${lastInteraction?.type ?? 'none'}): ${lastInteraction?.summary ?? 'First touch'}
AI summary: ${lead.aiSummary ?? 'Not yet generated'}
Days since last contact: ${lastInteraction
    ? Math.floor((Date.now() - new Date(lastInteraction.createdAt).getTime()) / 86400000)
    : 'unknown'}

Write a follow-up email. Subject line first, then body.
`.trim();

  // ── Lemma prompt iteration ────────────────────────────────────────────────
  let promptId: string | undefined;
  try {
    const p = await lemma.prompts.create({
      name: `${PROMPT_KEYS.FOLLOWUP_DRAFT}-${leadId}`,
      description: `Follow-up draft for ${lead.name}`,
    });
    const iter = await lemma.prompts.createIteration(p.id!, {
      content: userPrompt,
      description: `Stage: ${lead.stage} · deal: $${lead.dealValue}`,
    });
    promptId = iter.id;
  } catch { /* non-critical */ }

  // ── Generate via Groq ─────────────────────────────────────────────────────
  const raw = await callGroq(FOLLOWUP_DRAFT_SYSTEM, userPrompt, 0.5);
  const lines = raw.split('\n');
  const subject = lines[0].replace(/^subject:\s*/i, '').trim();
  const body    = lines.slice(2).join('\n').trim();

  // ── Evaluate draft quality ────────────────────────────────────────────────
  let qualityScore: number | undefined;
  try {
    const evalResult = await lemma.evaluators.evaluate({
      evaluator_name: 'salesarc-followup-quality',
      input: userPrompt,
      output: raw,
    });
    qualityScore = evalResult.score;
  } catch { /* non-critical */ }

  // ── Persist draft ─────────────────────────────────────────────────────────
  const draft: FollowUp = {
    id: uuid(),
    leadId,
    subject,
    body,
    status: 'draft',
    lemmaPromptId: promptId,
    qualityScore,
    createdAt: new Date().toISOString(),
  };
  followUps.set(draft.id, draft);

  // ── Log ───────────────────────────────────────────────────────────────────
  addLemmaLog('followup_drafted', {
    lead_id: leadId,
    lead_name: lead.name,
    quality_score: qualityScore,
    prompt_id: promptId,
  });

  try {
    await lemma.logs.create({
      event_type: 'followup_drafted',
      metadata: { lead_id: leadId, quality_score: qualityScore },
    });
  } catch { /* non-critical */ }

  return draft;
}
