import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { LemmaClient } from 'lemma-sdk';

const client = new LemmaClient({
  apiUrl: process.env.LEMMA_API_URL || 'https://api.lemma.work',
  authUrl: process.env.LEMMA_AUTH_URL || 'https://lemma.work/auth',
  podId: process.env.LEMMA_POD_ID,
});

if (client.auth) {
  (client.auth as any).injectedToken = process.env.LEMMA_API_KEY ?? process.env.LEMMA_TOKEN ?? '';
}

const promptsStub = {
  create: async (args: { name: string; description?: string }) => {
    console.log(`[Lemma Stub] prompts.create:`, args);
    return { id: `prompt-${Date.now()}` };
  },
  createIteration: async (promptId: string, args: { content: string; description?: string }) => {
    console.log(`[Lemma Stub] prompts.createIteration:`, promptId, args);
    return { id: `iter-${Date.now()}` };
  }
};

const evaluatorsStub = {
  create: async (args: { name: string; description?: string; criteria: Array<{ name: string; description: string; weight: number }> }) => {
    console.log(`[Lemma Stub] evaluators.create:`, args);
    return { id: `eval-${Date.now()}` };
  },
  evaluate: async (args: { evaluator_name: string; input: string; output: string }) => {
    console.log(`[Lemma Stub] evaluators.evaluate:`, args);
    return { score: 85 };
  }
};

const datasetsStub = {
  generateSchema: async (args: { seed_description: string }) => {
    console.log(`[Lemma Stub] datasets.generateSchema:`, args);
    return { schema: '{}' };
  },
  create: async (args: { name: string; description?: string }) => {
    console.log(`[Lemma Stub] datasets.create:`, args);
    return { id: `dataset-${Date.now()}` };
  },
  generateValidators: async (args: { schema: string; seed_description: string }) => {
    console.log(`[Lemma Stub] datasets.generateValidators:`, args);
    return { validators: [] };
  },
  generateDataset: async (args: { dataset_id: string; schema: any; entries_required: number; data_description: string; validators: any[] }) => {
    console.log(`[Lemma Stub] datasets.generateDataset:`, args);
    return { id: `dataset-${Date.now()}` };
  }
};

const logsStub = {
  create: async (args: { event_type: string; metadata?: any }) => {
    console.log(`[Lemma Stub] logs.create:`, args);
    return { id: `log-${Date.now()}` };
  }
};

export const lemma = Object.assign(client, {
  prompts: promptsStub,
  evaluators: evaluatorsStub,
  datasets: datasetsStub,
  logs: logsStub,
});

// ── Prompt keys ────────────────────────────────────────────────────────────────
export const PROMPT_KEYS = {
  LEAD_SUMMARY:   'salesarc-lead-summary',
  FOLLOWUP_DRAFT: 'salesarc-followup-draft',
  NEXT_ACTION:    'salesarc-next-action',
  ICP_SCORE:      'salesarc-icp-score',
} as const;

// ── System prompts ─────────────────────────────────────────────────────────────
export const LEAD_SUMMARY_SYSTEM = `
You are a senior sales analyst. Given a lead's conversation history and metadata,
produce a concise 3-5 sentence summary covering:
1. The lead's core pain point
2. What they liked / objections raised
3. Budget signals and timeline
4. The single best closing angle

Return plain prose only. No bullet points. No markdown.
`.trim();

export const FOLLOWUP_DRAFT_SYSTEM = `
You are an expert B2B sales writer for a founder or early sales rep.
Write a short, warm, non-pushy follow-up email (under 120 words).
Reference one specific detail from the conversation history.
End with a single low-friction CTA (a question or a short time ask).
Return subject line on first line, then a blank line, then the body.
`.trim();

export const NEXT_ACTION_SYSTEM = `
You are a sales coach. Given a lead's current stage, last interaction, and deal context,
suggest the single best next action (call, email, demo, referral ask, etc.).
Return a JSON object: { action: string, rationale: string, urgency: "today"|"this_week"|"when_ready" }
`.trim();

export const ICP_SCORE_SYSTEM = `
You are a go-to-market analyst. Score this lead's fit with our Ideal Customer Profile (ICP).
ICP criteria: Series A–C SaaS companies, 10–200 employees, ops or sales team buying, pain around manual reporting or CRM hygiene.
Return JSON: { score: number (0-100), fit_reasons: string[], red_flags: string[] }
`.trim();

export const TRANSCRIPT_PARSER_SYSTEM = `
You are an expert sales operations analyst. Analyze the provided raw communication transcript (which could be an email thread, call notes, or chat logs between a founder/sales rep and a lead).
Extract the lead's profile details and a chronological timeline of all interactions.

Return a JSON object matching this structure EXACTLY:
{
  "lead": {
    "name": "Full Name",
    "email": "email@domain.com",
    "company": "Company Name",
    "title": "Job Title (e.g. CTO, Founder, VP Sales)",
    "dealValue": 15000,
    "source": "Cold outreach"
  },
  "interactions": [
    {
      "type": "email",
      "direction": "inbound",
      "summary": "Summary of discussion points or action items",
      "daysAgo": 2
    }
  ]
}

Ensure the output is a valid JSON object matching the types above. Only return the raw JSON string. Do not wrap it in markdown code block formatting.
`.trim();

// ── Bootstrap: register prompts and evaluators with Lemma on app start ─────────
export async function ensurePrompts(): Promise<void> {
  for (const [key, name] of Object.entries(PROMPT_KEYS)) {
    try {
      await lemma.prompts.create({ name, description: `SalesArc ${key} prompt` });
      console.log(`[Lemma] Prompt registered: ${name}`);
    } catch {
      // Already exists — fine
    }
  }
}

export async function ensureEvaluators(): Promise<void> {
  const evaluators = [
    {
      name: 'salesarc-followup-quality',
      description: 'Evaluates follow-up draft quality for tone, specificity, and CTA clarity',
      criteria: [
        { name: 'tone', description: 'Warm and non-pushy, not salesy', weight: 0.3 },
        { name: 'specificity', description: 'References a real detail from conversation history', weight: 0.4 },
        { name: 'cta_clarity', description: 'Has one clear, low-friction call to action', weight: 0.3 },
      ],
    },
    {
      name: 'salesarc-summary-quality',
      description: 'Evaluates lead summary for completeness and actionability',
      criteria: [
        { name: 'pain_point', description: 'Clearly identifies the lead\'s pain', weight: 0.35 },
        { name: 'closing_angle', description: 'Provides a concrete closing angle', weight: 0.35 },
        { name: 'brevity', description: 'Under 5 sentences, no filler', weight: 0.3 },
      ],
    },
  ];

  for (const ev of evaluators) {
    try {
      await lemma.evaluators.create(ev);
      console.log(`[Lemma] Evaluator registered: ${ev.name}`);
    } catch {
      // Already exists
    }
  }
}
