import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────────
export type LeadHeat    = 'hot' | 'warm' | 'cold';
export type LeadStage   = 'outreach' | 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type ActionUrgency = 'today' | 'this_week' | 'when_ready';

export interface Lead {
  id:               string;
  name:             string;
  email:            string;
  company:          string;
  title:            string;
  stage:            LeadStage;
  heat:             LeadHeat;
  dealValue:        number;
  source:           string;
  icpScore:         number;          // 0-100, Lemma evaluator scored
  aiSummary?:       string;          // Lemma prompt iteration output
  nextAction?:      { action: string; rationale: string; urgency: ActionUrgency };
  followUpDueAt?:   string;          // ISO date
  lemmaDatasetId?:  string;
  createdAt:        string;
  updatedAt:        string;
}

export interface Interaction {
  id:        string;
  leadId:    string;
  type:      'email' | 'call' | 'linkedin' | 'note' | 'meeting';
  summary:   string;
  content?:  string;           // raw email body or call notes
  direction: 'inbound' | 'outbound';
  createdAt: string;
}

export interface FollowUp {
  id:              string;
  leadId:          string;
  subject:         string;
  body:            string;
  status:          'draft' | 'sent' | 'skipped';
  lemmaPromptId?:  string;
  lemmaLogId?:     string;
  qualityScore?:   number;      // Lemma evaluator score 0-100
  createdAt:       string;
}

export interface LemmaLog {
  id:         string;
  eventType:  string;
  metadata:   Record<string, unknown>;
  createdAt:  string;
}

// ── Stores ─────────────────────────────────────────────────────────────────────
export const leads:        Map<string, Lead>        = new Map();
export const interactions: Map<string, Interaction> = new Map();
export const followUps:    Map<string, FollowUp>    = new Map();
export const lemmaLogs:    Map<string, LemmaLog>    = new Map();

// ── Seed data (demo) ───────────────────────────────────────────────────────────
// ── Seed data (demo) ───────────────────────────────────────────────────────────
function seedLeads() {
  const now = new Date().toISOString();
  const seed: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name:'Priya Singh',    email:'priya@buildfast.io',   company:'Buildfast Inc',  title:'Head of Ops',        stage:'proposal',    heat:'hot',  dealValue:18000, source:'LinkedIn', icpScore:87 },
    { name:'Marcus Webb',    email:'marcus@tractionlabs.co',company:'Traction Labs', title:'CEO',               stage:'negotiation', heat:'hot',  dealValue:32000, source:'Referral', icpScore:92 },
    { name:'Aisha Okonkwo',  email:'aisha@stackr.ai',      company:'Stackr AI',     title:'COO',               stage:'discovery',   heat:'warm', dealValue:9000,  source:'Cold outreach', icpScore:74 },
    { name:'Tom Hargreaves', email:'tom@pivothq.com',      company:'PivotHQ',       title:'VP Sales',          stage:'demo',        heat:'warm', dealValue:22000, source:'Conference', icpScore:81 },
    { name:'Lin Mei',        email:'lin@datapulse.io',     company:'DataPulse',     title:'Founder',           stage:'outreach',    heat:'cold', dealValue:5000,  source:'Cold outreach', icpScore:64 },
    { name:'Rajan Kapoor',   email:'rajan@novasales.in',   company:'NovaSales',     title:'CRO',               stage:'negotiation', heat:'hot',  dealValue:41000, source:'LinkedIn', icpScore:95 },
  ];

  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

  for (const s of seed) {
    const id = uuid();
    leads.set(id, {
      ...s,
      id,
      createdAt: daysAgo(10),
      updatedAt: now,
      followUpDueAt: new Date(Date.now() + (Math.random() - 0.3) * 86400000 * 2).toISOString() // Some overdue, some due soon
    });

    // Seed history depending on the lead
    if (s.name === 'Priya Singh') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'linkedin', direction: 'outbound', summary: 'Sent connection request with personal message introducing SalesArc CRM.', createdAt: daysAgo(8) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'inbound', summary: 'Accepted invite. Replied saying: "Our ops team spends 10+ hours a week manually sync\'ing sheets. Open to seeing a demo of how you automate followups."', createdAt: daysAgo(6) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'meeting', direction: 'inbound', summary: 'Discovery & Demo Call. Showed automated queue and drafts. Priya loved the automatic priority sorting but noted they need a direct Slack integration for alerts.', createdAt: daysAgo(3) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'outbound', summary: 'Sent customized proposal package with tier pricing ($18k/year) and confirmation of the Slack integration on the roadmap.', createdAt: daysAgo(1) });
    } else if (s.name === 'Marcus Webb') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'note', direction: 'inbound', summary: 'Referral from Dave (Early investor). Dave says Traction Labs CEO is looking to audit sales operations due to pipeline leakage.', createdAt: daysAgo(9) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'call', direction: 'outbound', summary: 'Introductory call with Marcus. Confirmed they lose 15% of warm discovery leads due to late follow-up. Deal size is high ($32k contract). Set demo for next day.', createdAt: daysAgo(7) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'meeting', direction: 'inbound', summary: 'Full team demo. Walked through dashboard, auto-generated email drafts, and CRM tracking. High buyer heat. Custom contract requested.', createdAt: daysAgo(5) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'outbound', summary: 'Sent finalized contract terms. Waiting on signature.', createdAt: daysAgo(2) });
    } else if (s.name === 'Aisha Okonkwo') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'outbound', summary: 'Cold outreach email sent outlining custom reporting automations for operations teams.', createdAt: daysAgo(4) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'inbound', summary: 'Aisha replied: "Sounds interesting. We are struggling with CRM hygiene. Do you support HubSpot syncing? Let\'s book 15m next week."', createdAt: daysAgo(2) });
    } else if (s.name === 'Tom Hargreaves') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'meeting', direction: 'inbound', summary: 'Met at SaaS annual conference. Exchanged contacts. Tom was highly interested in our lead summary scoring.', createdAt: daysAgo(5) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'call', direction: 'outbound', summary: 'Brief follow-up call. Booked full demo for this week.', createdAt: daysAgo(2) });
    } else if (s.name === 'Lin Mei') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'outbound', summary: 'Cold outbound introduction email sent to Founder Lin Mei.', createdAt: daysAgo(3) });
    } else if (s.name === 'Rajan Kapoor') {
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'linkedin', direction: 'outbound', summary: 'Connected on LinkedIn. Sent intro message.', createdAt: daysAgo(9) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'inbound', summary: 'Rajan booked demo via Calendly link.', createdAt: daysAgo(7) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'meeting', direction: 'inbound', summary: 'Demo call. Rajan was wowed by follow-up scores. Requested security review docs.', createdAt: daysAgo(4) });
      interactions.set(uuid(), { id: uuid(), leadId: id, type: 'email', direction: 'outbound', summary: 'Sent security documents and draft agreement terms.', createdAt: daysAgo(1) });
    }
  }
}

seedLeads();

// ── Helpers ────────────────────────────────────────────────────────────────────
export function getLeadsSorted(): Lead[] {
  const heatOrder: Record<LeadHeat, number> = { hot: 0, warm: 1, cold: 2 };
  return Array.from(leads.values())
    .sort((a, b) => heatOrder[a.heat] - heatOrder[b.heat] || b.icpScore - a.icpScore);
}

export function getInteractionsByLead(leadId: string): Interaction[] {
  return Array.from(interactions.values())
    .filter(i => i.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPriorityQueue(): Lead[] {
  const now = Date.now();
  return Array.from(leads.values())
    .filter(l => l.stage !== 'won' && l.stage !== 'lost')
    .sort((a, b) => {
      // Score = heat weight + ICP + overdue urgency
      const heatW = { hot: 100, warm: 50, cold: 10 };
      const dueA = a.followUpDueAt ? Math.max(0, now - new Date(a.followUpDueAt).getTime()) / 3600000 : 0;
      const dueB = b.followUpDueAt ? Math.max(0, now - new Date(b.followUpDueAt).getTime()) / 3600000 : 0;
      const scoreA = heatW[a.heat] + a.icpScore * 0.5 + dueA * 2;
      const scoreB = heatW[b.heat] + b.icpScore * 0.5 + dueB * 2;
      return scoreB - scoreA;
    })
    .slice(0, 8);
}

export function addLemmaLog(eventType: string, metadata: Record<string, unknown>): LemmaLog {
  const log: LemmaLog = { id: uuid(), eventType, metadata, createdAt: new Date().toISOString() };
  lemmaLogs.set(log.id, log);
  return log;
}
