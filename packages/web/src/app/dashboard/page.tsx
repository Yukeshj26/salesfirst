'use client';

import { useEffect, useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  stage: 'outreach' | 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';
  heat: 'hot' | 'warm' | 'cold';
  dealValue: number;
  source: string;
  icpScore: number;
  aiSummary?: string;
  followUpDueAt?: string;
  nextAction?: { action: string; rationale: string; urgency: 'today' | 'this_week' | 'when_ready' };
  createdAt: string;
  updatedAt: string;
};

type Interaction = {
  id: string;
  leadId: string;
  type: 'email' | 'call' | 'linkedin' | 'note' | 'meeting';
  summary: string;
  content?: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
};

type FollowUp = {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'skipped';
  qualityScore?: number;
  createdAt: string;
};

type Log = {
  id: string;
  eventType: string;
  metadata: Record<string, any>;
  createdAt: string;
};

const STYLES = {
  colors: {
    primary: '#6366F1', // Glowing neon Indigo
    primaryHover: '#818CF8',
    bg: '#0B0F19', // Solid deep space dark canvas
    sidebarBg: '#020617', // Extremely dark Slate 950 for sidebar contrast
    sidebarText: '#94A3B8',
    sidebarActiveText: '#FFFFFF',
    sidebarActiveBg: 'rgba(99, 102, 241, 0.18)',
    border: 'rgba(255, 255, 255, 0.08)',
    cardBg: '#1E293B', // Solid Slate 800 for high-contrast card blocks
    textDark: '#F8FAFC',
    textMuted: '#94A3B8',
    green: '#10B981',
    red: '#EF4444',
    yellow: '#F59E0B',
    blue: '#06B6D4',
  },
  heat: {
    hot: { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.18)', label: 'Hot' },
    warm: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.18)', label: 'Warm' },
    cold: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.18)', label: 'Cold' },
  },
  stage: {
    outreach: 'Outreach',
    discovery: 'Discovery',
    demo: 'Demo',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Closed Won',
    lost: 'Closed Lost',
  }
};

export default function Dashboard() {
  const [tab, setTab] = useState<'overview' | 'pipeline' | 'followups' | 'logs'>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFUs] = useState<FollowUp[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [running, setRunning] = useState(false);

  // User Profile State
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; avatar: string } | null>(null);
  const [mouseVisible, setMouseVisible] = useState(true);

  // Modals & Drawers
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<Interaction[]>([]);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showGoogleSetupModal, setShowGoogleSetupModal] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Simulated Google Form State
  const [mockGoogleUser, setMockGoogleUser] = useState({ name: 'Yukesh Kumar', email: 'yukesh@salesarc.com' });

  // Mouse Coordinate State for custom cursor glow effect
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  // Floating Antigravity Particles State
  const [particles, setParticles] = useState<{ id: number; left: number; size: number; delay: number; duration: number; sway: number; color: string }[]>([]);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    name: '', email: '', company: '', title: '', dealValue: 5000, source: 'LinkedIn', stage: 'outreach' as const
  });

  // Log Interaction Form State
  const [newInteraction, setNewInteraction] = useState({
    type: 'email' as const, summary: '', direction: 'outbound' as const
  });

  useEffect(() => {
    fetchAll();

    // Check if user is signed in locally
    const savedUser = localStorage.getItem('salesfirst_user');
    if (savedUser) {
      try {
        setUserProfile(JSON.parse(savedUser));
      } catch {}
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setMouseVisible(true);
    };
    const handleMouseLeave = () => setMouseVisible(false);
    const handleMouseEnterDoc = () => setMouseVisible(true);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnterDoc);

    // Generate random floating particles for the antigravity space backdrop on mount
    const colors = [
      'rgba(99, 102, 241, 0.15)', // Indigo glow
      'rgba(6, 182, 212, 0.15)',  // Cyan glow
      'rgba(16, 185, 129, 0.08)'  // Emerald glow
    ];
    const particleList = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 90 + 30, // 30px to 120px
      delay: Math.random() * 15,
      duration: Math.random() * 20 + 20, // 20s to 40s
      sway: Math.random() * 80 - 40, // -40px to 40px sway
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setParticles(particleList);

    // Load Google Identity Services SDK Script if not already present
    const scriptId = 'google-gsi-client-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => {
        initializeGoogleSignIn();
      };
    } else {
      initializeGoogleSignIn();
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnterDoc);
    };
  }, []);

  const googleInitializedRef = useRef(false);

  // Initialize GIS if Client ID is configured
  useEffect(() => {
    initializeGoogleSignIn();
  }, [userProfile]);

  function initializeGoogleSignIn() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && !userProfile && (window as any).google) {
      try {
        if (!googleInitializedRef.current) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignInResponse
          });
          googleInitializedRef.current = true;
        }

        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'dark',
            size: 'medium',
            width: 200
          });
        }
      } catch (err) {
        console.warn('Failed to render official Google login button:', err);
      }
    }
  }

  function handleGoogleSignInResponse(response: any) {
    try {
      const token = response.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      const existing = localStorage.getItem('salesfirst_user');
      const existingParsed = existing ? JSON.parse(existing) : null;
      const profile = {
        id: existingParsed?.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        name: parsed.name,
        email: parsed.email,
        avatar: parsed.picture
      };
      setUserProfile(profile);
      localStorage.setItem('salesfirst_user', JSON.stringify(profile));
      showToast(`Welcome back, ${profile.name}!`, 'success');
    } catch {
      showToast('Failed to parse Google login token', 'error');
    }
  }

  function handleSimulatedLogin(e: React.FormEvent) {
    e.preventDefault();
    const profile = {
      name: mockGoogleUser.name,
      email: mockGoogleUser.email,
      avatar: '' // Will trigger initial letter fallback avatar
    };
    setUserProfile(profile);
    localStorage.setItem('salesarc_user', JSON.stringify(profile));
    setShowGoogleSetupModal(false);
    showToast(`Logged in as ${profile.name} (Simulated)`, 'success');
  }

  function handleSignOut() {
    setUserProfile(null);
    localStorage.removeItem('salesfirst_user');
    showToast('Signed out successfully', 'info');
  }

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  async function fetchAll() {
    try {
      const [l, f, g] = await Promise.all([
        fetch(`${API}/api/leads`).then(r => r.json()),
        fetch(`${API}/api/followup`).then(r => r.json()),
        fetch(`${API}/api/logs`).then(r => r.json()),
      ]);
      setLeads(l);
      setFUs(f);
      setLogs(g);
    } catch (err) {
      showToast('Error syncing data with backend server', 'error');
    }
  }

  async function fetchLeadDetails(id: string) {
    try {
      const { lead, history } = await fetch(`${API}/api/leads/${id}`).then(r => r.json());
      setSelectedLeadHistory(history);
      setLeads(prev => prev.map(l => l && l.id === id ? lead : l));
    } catch {
      showToast('Failed to fetch lead timeline', 'error');
    }
  }

  async function runAgent() {
    setRunning(true);
    showToast('Running Lemma agentic scoring & followup workflow...', 'info');
    try {
      const res = await fetch(`${API}/api/agent/run`, { method: 'POST' }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      await fetchAll();
      showToast(`Agent complete! Scored leads and drafted ${res.drafts?.length ?? 0} new follow-ups.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to complete agent workflow', 'error');
    } finally {
      setRunning(false);
    }
  }

  async function sendFollowUp(id: string) {
    try {
      await fetch(`${API}/api/followup/${id}/send`, { method: 'PATCH' });
      showToast('Follow-up email marked as sent!', 'success');
      await fetchAll();
    } catch {
      showToast('Failed to mark email as sent', 'error');
    }
  }

  async function skipFollowUp(id: string) {
    try {
      await fetch(`${API}/api/followup/${id}/skip`, { method: 'PATCH' });
      showToast('Follow-up draft skipped', 'info');
      await fetchAll();
    } catch {
      showToast('Failed to skip draft', 'error');
    }
  }

  async function draftForLead(leadId: string) {
    showToast('Generating personalized follow-up draft...', 'info');
    try {
      await fetch(`${API}/api/followup/draft/${leadId}`, { method: 'POST' });
      showToast('Draft email ready in follow-ups!', 'success');
      await fetchAll();
    } catch {
      showToast('Failed to generate follow-up email', 'error');
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (!res.ok) throw new Error();
      showToast(`Added lead ${newLead.name} successfully!`, 'success');
      setShowAddLeadModal(false);
      setNewLead({ name: '', email: '', company: '', title: '', dealValue: 5000, source: 'LinkedIn', stage: 'outreach' });
      await fetchAll();
    } catch {
      showToast('Failed to create new lead. Please check entries.', 'error');
    }
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!transcriptText.trim()) return;

    setOnboarding(true);
    showToast('AI is parsing your transcript and onboarding the lead...', 'info');
    try {
      const res = await fetch(`${API}/api/agent/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText })
      }).then(r => r.json());

      if (res.error) throw new Error(res.error);

      showToast('Lead successfully onboarded with timeline & AI summary!', 'success');
      setShowOnboardModal(false);
      setTranscriptText('');
      await fetchAll();
      
      if (res.leadId) {
        setSelectedLeadId(res.leadId);
        fetchLeadDetails(res.leadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to onboard lead from transcript', 'error');
    } finally {
      setOnboarding(false);
    }
  }

  async function handleLogInteraction(e: React.FormEvent, leadId: string) {
    e.preventDefault();
    if (!newInteraction.summary.trim()) return;

    try {
      const res = await fetch(`${API}/api/leads/${leadId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInteraction)
      });
      if (!res.ok) throw new Error();
      showToast('Interaction logged successfully! Regenerating AI summary...', 'success');
      setNewInteraction({ type: 'email', summary: '', direction: 'outbound' });
      await fetchLeadDetails(leadId);
      await fetchAll();
    } catch {
      showToast('Failed to log interaction', 'error');
    }
  }

  async function handleUpdateLeadField(leadId: string, fields: Partial<Lead>) {
    try {
      const res = await fetch(`${API}/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error();
      setLeads(prev => prev.map(l => l && l.id === leadId ? { ...l, ...fields } : l));
      showToast('Lead details updated successfully', 'success');
    } catch {
      showToast('Failed to update lead properties', 'error');
    }
  }

  async function triggerManualSummary(leadId: string) {
    showToast('Refreshing AI Summary and Insights...', 'info');
    try {
      await fetch(`${API}/api/leads/${leadId}/summarise`, { method: 'POST' });
      await fetchLeadDetails(leadId);
      showToast('AI insights refreshed!', 'success');
    } catch {
      showToast('Failed to update summary', 'error');
    }
  }

  const selectedLead = leads.find(l => l && l.id === selectedLeadId);

  // Compute metrics
  const activeLeads = leads.filter(l => l && l.stage !== 'won' && l.stage !== 'lost');
  const hot = leads.filter(l => l && l.heat === 'hot');
  const due = leads.filter(l => l && l.followUpDueAt && new Date(l.followUpDueAt) < new Date(Date.now() + 86400000));
  const pipelineValue = leads.reduce((acc, l) => acc + (l && l.stage !== 'lost' ? l.dealValue : 0), 0);

  const pipelineStages: Lead['stage'][] = ['outreach', 'discovery', 'demo', 'proposal', 'negotiation', 'won', 'lost'];

  // Icons Helper
  const Icons = {
    overview: () => <svg style={{ width:18, height:18 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"/></svg>,
    pipeline: () => <svg style={{ width:18, height:18 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    followups: () => <svg style={{ width:18, height:18 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
    logs: () => <svg style={{ width:18, height:18 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
    user: () => <svg style={{ width:16, height:16 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
    currency: () => <svg style={{ width:16, height:16 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    clock: () => <svg style={{ width:16, height:16 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    link: () => <svg style={{ width:16, height:16 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>,
    plus: () => <svg style={{ width:16, height:16 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>,
    refresh: () => <svg style={{ width:14, height:14 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3"/></svg>
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: STYLES.colors.bg,
      color: STYLES.colors.textDark,
      overflow: 'hidden',
      position: 'relative',
      cursor: mouseVisible ? 'none' : 'default'
    }}>

      {/* Floating Particles Zero-Gravity Antigravity Backdrop */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              bottom: -150,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${p.color} 0%, rgba(255,255,255,0) 70%)`,
              animation: `floatUp ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              //@ts-ignore
              '--sway-x': `${p.sway}px`
            }}
          />
        ))}
      </div>

      {/* Dynamic Cursor Light Glow */}
      <div style={{
        position: 'fixed',
        top: mousePos.y - 180,
        left: mousePos.x - 180,
        width: 360,
        height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: mouseVisible ? 1 : 0,
        transition: 'opacity 0.2s ease'
      }} />

      {/* Custom Neon Cursor Reticle — hidden when mouse leaves page */}
      <div style={{
        position: 'fixed',
        top: mousePos.y - 12,
        left: mousePos.x - 12,
        width: 24,
        height: 24,
        border: `1.5px solid ${STYLES.colors.primary}`,
        borderRadius: 4,
        boxShadow: `0 0 10px rgba(99, 102, 241, 0.5)`,
        transform: 'rotate(45deg)',
        pointerEvents: 'none',
        zIndex: 99998,
        opacity: mouseVisible ? 1 : 0,
        transition: 'opacity 0.15s ease, top 0.1s cubic-bezier(0.25, 1, 0.5, 1), left 0.1s cubic-bezier(0.25, 1, 0.5, 1)'
      }} />

      {/* Inner White Core Dot */}
      <div style={{
        position: 'fixed',
        top: mousePos.y - 3,
        left: mousePos.x - 3,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: `0 0 8px 2px ${STYLES.colors.primary}`,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: mouseVisible ? 1 : 0,
        transition: 'opacity 0.15s ease'
      }} />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          borderRadius: 12,
          background: toast.type === 'success' ? STYLES.colors.green : toast.type === 'error' ? STYLES.colors.red : STYLES.colors.primary,
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <div style={{
        width: 250,
        background: STYLES.colors.sidebarBg,
        padding: '1.75rem 0 0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${STYLES.colors.border}`,
        zIndex: 10
      }}>
        <div style={{
          padding: '0 1.5rem 1.5rem',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: '#FFFFFF',
          letterSpacing: '-0.025em',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: STYLES.colors.primary,
            boxShadow: `0 0 15px 4px ${STYLES.colors.primary}`
          }} />
          SalesFirst
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {(['overview', 'pipeline', 'followups', 'logs'] as const).map(t => {
            const active = tab === t;
            return (
              <button
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 1.5rem',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: 'none',
                  color: active ? STYLES.colors.sidebarActiveText : STYLES.colors.sidebarText,
                  border: 'none',
                  background: active ? STYLES.colors.sidebarActiveBg : 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderLeft: `4px solid ${active ? STYLES.colors.primary : 'transparent'}`,
                  backdropFilter: active ? 'blur(4px)' : 'none'
                }}
                onClick={() => setTab(t)}
              >
                {Icons[t]()}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer — sign out only (sign-in moved to topbar) */}
        {userProfile && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: 'auto'
          }}>
            <button
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.1)',
                color: STYLES.colors.red,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
              onClick={handleSignOut}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              Sign Out
            </button>
          </div>
        )}
      
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, zIndex: 5 }}>
        
        {/* Topbar */}
        <div style={{
          background: '#0F172A', // Solid header layout for clear separation
          borderBottom: `1px solid ${STYLES.colors.border}`,
          padding: '16px 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.025em',
              color: STYLES.colors.textDark
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Dashboard
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: STYLES.colors.textMuted }}>
              Workflows and priorities managed via local agent stack
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setShowOnboardModal(true)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              {Icons.link()}
              Onboard from Transcript
            </button>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(255,255,255,0.04)', color: '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setShowAddLeadModal(true)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              {Icons.plus()}
              Add Lead
            </button>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: STYLES.colors.primary, color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)', transition: 'all 0.2s ease', opacity: running ? 0.75 : 1 }}
              onClick={runAgent}
              disabled={running}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 25px rgba(99, 102, 241, 0.6)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.4)'}
            >
              {running ? (
                <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />Running...</>
              ) : 'Run AI Agent'}
            </button>

            {/* ── Profile pill — far right of topbar ── */}
            {userProfile ? (
              <a href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', padding: '5px 12px 5px 5px', borderRadius: 40, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', marginLeft: 8, transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${STYLES.colors.primary}`, overflow: 'hidden', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {userProfile.avatar
                    ? <img src={userProfile.avatar} alt={userProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{userProfile.name[0]}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userProfile.name.split(' ')[0]}
                </span>
              </a>
            ) : (
              <div id="google-signin-btn-container" style={{ marginLeft: 8, minHeight: 36 }} />
            )}
          </div>
        </div>

        {/* Content Wrapper */}
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          
          {tab === 'overview' && (
            <>
              {/* Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 20,
                marginBottom: '2rem'
              }}>
                {[
                  { label: 'Active Leads', val: activeLeads.length, desc: 'In current pipeline', color: STYLES.colors.primary },
                  { label: 'Follow-ups Due', val: due.length, desc: 'Awaiting touchpoint', color: STYLES.colors.red },
                  { label: 'Pipeline Value', val: `$${pipelineValue.toLocaleString()}`, desc: 'Active deal volume', color: STYLES.colors.green },
                  { label: 'Hot Opportunities', val: hot.length, desc: 'High buyer heat signal', color: STYLES.colors.blue },
                ].map((m, idx) => (
                  <div key={idx} style={{
                    background: STYLES.colors.cardBg,
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${STYLES.colors.border}`,
                    borderRadius: 12,
                    padding: '20px 24px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 4,
                      height: '100%',
                      background: m.color
                    }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted, marginBottom: 8 }}>{m.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: STYLES.colors.textDark, fontFamily: "'Outfit', sans-serif" }}>{m.val}</div>
                    <div style={{ fontSize: 11, color: STYLES.colors.textMuted, marginTop: 4 }}>{m.desc}</div>
                  </div>
                ))}
              </div>

              {/* Lists section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
                
                {/* Priority Queue list */}
                <div style={{
                  background: STYLES.colors.cardBg,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Priority Action Queue</h2>
                    <span style={{ fontSize: 11, color: STYLES.colors.textMuted }}>Ranked dynamically by AI model</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {leads.map((l, index) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setSelectedLeadId(l.id);
                          fetchLeadDetails(l.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${STYLES.colors.border}`,
                          cursor: 'none',
                          transition: 'all 0.15s ease',
                          background: 'rgba(255, 255, 255, 0.02)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = STYLES.colors.primary;
                          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = STYLES.colors.border;
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        }}
                      >
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: index === 0 ? STYLES.colors.red : index < 3 ? STYLES.colors.primary : 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: index < 3 ? `0 0 10px ${index === 0 ? STYLES.colors.red : STYLES.colors.primary}` : 'none'
                        }}>
                          {index + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: STYLES.colors.textDark }}>{l.name}</span>
                            <span style={{ fontSize: 12, color: STYLES.colors.textMuted }}>@{l.company}</span>
                          </div>
                          <div style={{ fontSize: 12, color: STYLES.colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {l.nextAction?.action ? (
                              <strong style={{ color: STYLES.colors.primaryHover }}>Next: {l.nextAction.action}</strong>
                            ) : 'No action computed. Run agent.'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', marginRight: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STYLES.colors.textDark }}>${l.dealValue.toLocaleString()}</div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: STYLES.heat[l.heat].bg,
                            color: STYLES.heat[l.heat].color,
                            marginTop: 2
                          }}>
                            {STYLES.heat[l.heat].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hot leads column */}
                <div style={{
                  background: STYLES.colors.cardBg,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                }}>
                  <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Hot Opportunities</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {hot.map(l => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setSelectedLeadId(l.id);
                          fetchLeadDetails(l.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderBottom: `1px solid ${STYLES.colors.border}`,
                          cursor: 'none'
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: STYLES.heat.hot.bg,
                          color: STYLES.heat.hot.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          boxShadow: '0 0 10px rgba(244, 63, 94, 0.2)'
                        }}>
                          {l.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STYLES.colors.textDark, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{l.name}</div>
                          <div style={{ fontSize: 11, color: STYLES.colors.textMuted }}>{l.title} · {l.company}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: STYLES.colors.green }}>${l.dealValue.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: STYLES.colors.textMuted }}>ICP {l.icpScore}/100</div>
                        </div>
                      </div>
                    ))}
                    {hot.length === 0 && (
                      <div style={{ textAlign: 'center', color: STYLES.colors.textMuted, fontSize: 12, padding: '20px 0' }}>No leads are hot currently.</div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {tab === 'pipeline' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 10,
              height: '100%',
              alignItems: 'start'
            }}>
              {pipelineStages.map(stage => {
                const stageLeads = leads.filter(l => l && l.stage === stage);
                return (
                  <div key={stage} style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: `1px solid ${STYLES.colors.border}`,
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '75vh',
                    minWidth: 150
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: `2px solid ${STYLES.colors.border}`
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: STYLES.colors.textDark }}>
                        {STYLES.stage[stage]}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)',
                        color: STYLES.colors.textMuted,
                        borderRadius: 10,
                        padding: '1px 6px'
                      }}>
                        {stageLeads.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                      {stageLeads.map(l => (
                        <div
                          key={l.id}
                          onClick={() => {
                            setSelectedLeadId(l.id);
                            fetchLeadDetails(l.id);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${STYLES.colors.border}`,
                            borderRadius: 8,
                            padding: 10,
                            cursor: 'none',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = STYLES.colors.primary;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = STYLES.colors.border;
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: STYLES.colors.textDark }}>{l.name}</div>
                          <div style={{ fontSize: 10, color: STYLES.colors.textMuted, marginTop: 2 }}>{l.company}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: STYLES.colors.primaryHover }}>
                              ${l.dealValue.toLocaleString()}
                            </span>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 4px',
                              borderRadius: 4,
                              background: STYLES.heat[l.heat].bg,
                              color: STYLES.heat[l.heat].color
                            }}>
                              {l.heat}
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 4,
                            marginTop: 8,
                            paddingTop: 6,
                            borderTop: `1px solid ${STYLES.colors.border}`
                          }} onClick={e => e.stopPropagation()}>
                            {pipelineStages.indexOf(stage) > 0 && (
                              <button
                                style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 10, cursor: 'none', borderRadius: 4, padding: '2px 4px' }}
                                onClick={() => {
                                  const prevIdx = pipelineStages.indexOf(stage) - 1;
                                  handleUpdateLeadField(l.id, { stage: pipelineStages[prevIdx] });
                                }}
                              >
                                ◀
                              </button>
                            )}
                            {pipelineStages.indexOf(stage) < pipelineStages.length - 1 && (
                              <button
                                style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 10, cursor: 'none', borderRadius: 4, padding: '2px 4px' }}
                                onClick={() => {
                                  const nextIdx = pipelineStages.indexOf(stage) + 1;
                                  handleUpdateLeadField(l.id, { stage: pipelineStages[nextIdx] });
                                }}
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'followups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {followups.map(fu => {
                const lead = leads.find(l => l && l.id === fu.leadId);
                return (
                  <div key={fu.id} style={{
                    background: STYLES.colors.cardBg,
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${STYLES.colors.border}`,
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: STYLES.colors.textDark }}>
                          {lead?.name ?? 'Unknown Lead'}
                        </span>
                        <span style={{ fontSize: 13, color: STYLES.colors.textMuted }}>@{lead?.company}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: fu.status === 'sent' ? 'rgba(16, 185, 129, 0.2)' : fu.status === 'skipped' ? 'rgba(255,255,255,0.08)' : 'rgba(245, 158, 11, 0.2)',
                          color: fu.status === 'sent' ? STYLES.colors.green : fu.status === 'skipped' ? STYLES.colors.textMuted : STYLES.colors.yellow
                        }}>
                          {fu.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {fu.qualityScore && (
                        <div style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: STYLES.colors.primaryHover,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          AI Quality Score: {fu.qualityScore}/100
                        </div>
                      )}
                    </div>

                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: STYLES.colors.textDark,
                      borderBottom: `1px solid ${STYLES.colors.border}`,
                      paddingBottom: 6
                    }}>
                      Subject: {fu.subject}
                    </div>

                    <div style={{
                      background: 'rgba(9, 13, 22, 0.6)',
                      border: `1px solid ${STYLES.colors.border}`,
                      borderRadius: 8,
                      padding: 16,
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      color: '#E2E8F0'
                    }}>
                      {fu.body}
                    </div>

                    {fu.status === 'draft' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: STYLES.colors.primary,
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'none'
                          }}
                          onClick={() => sendFollowUp(fu.id)}
                        >
                          Send Follow-up
                        </button>
                        <button
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'transparent',
                            color: '#FFFFFF',
                            border: `1px solid ${STYLES.colors.border}`,
                            cursor: 'none'
                          }}
                          onClick={() => skipFollowUp(fu.id)}
                        >
                          Skip
                        </button>
                        <button
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'transparent',
                            color: '#FFFFFF',
                            border: `1px solid ${STYLES.colors.border}`,
                            cursor: 'none'
                          }}
                          onClick={() => draftForLead(fu.leadId)}
                        >
                          Regenerate Draft
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {followups.length === 0 && (
                <div style={{ textAlign: 'center', color: STYLES.colors.textMuted, padding: '40px 0' }}>
                  No drafts available. Click "Run AI Agent" to scan pipeline and generate.
                </div>
              )}
            </div>
          )}

          {tab === 'logs' && (
            <div style={{
              background: STYLES.colors.cardBg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${STYLES.colors.border}`,
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
            }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Observability Events (Lemma Logs)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {logs.map(l => (
                  <div key={l.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 6,
                    borderBottom: `1px solid ${STYLES.colors.border}`,
                    fontSize: 12
                  }}>
                    <span style={{ color: STYLES.colors.textMuted, width: 85 }}>{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                    <span style={{
                      fontWeight: 700,
                      color: STYLES.colors.primaryHover,
                      minWidth: 160
                    }}>
                      {l.eventType}
                    </span>
                    <span style={{
                      color: STYLES.colors.textDark,
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {JSON.stringify(l.metadata)}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div style={{ textAlign: 'center', color: STYLES.colors.textMuted, padding: '20px 0' }}>No logs recorded yet.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Interactive Detail Side Drawer */}
      {selectedLeadId && selectedLead && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
            onClick={() => setSelectedLeadId(null)}
          />
          
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 480,
            height: '100vh',
            background: '#0F172A',
            borderLeft: `1px solid ${STYLES.colors.border}`,
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: 24,
              borderBottom: `1px solid ${STYLES.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(9, 13, 22, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: STYLES.heat[selectedLead.heat].bg,
                  color: STYLES.heat[selectedLead.heat].color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  boxShadow: `0 0 10px ${STYLES.heat[selectedLead.heat].color}`
                }}>
                  {selectedLead.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: STYLES.colors.textDark }}>{selectedLead.name}</h3>
                  <span style={{ fontSize: 12, color: STYLES.colors.textMuted }}>{selectedLead.title} @ {selectedLead.company}</span>
                </div>
              </div>
              
              <button
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 20,
                  cursor: 'none',
                  color: STYLES.colors.textMuted
                }}
                onClick={() => setSelectedLeadId(null)}
              >
                &times;
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Properties Editor */}
              <div style={{
                background: 'rgba(9, 13, 22, 0.3)',
                border: `1px solid ${STYLES.colors.border}`,
                borderRadius: 8,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>DEAL VALUE</label>
                  <input
                    type="number"
                    style={{
                      width: '90%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${STYLES.colors.border}`,
                      background: 'rgba(0,0,0,0.2)',
                      color: '#FFF',
                      fontSize: 13,
                      fontWeight: 700
                    }}
                    value={selectedLead.dealValue}
                    onChange={e => handleUpdateLeadField(selectedLead.id, { dealValue: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>ICP SCORE</label>
                  <div style={{ fontSize: 14, fontWeight: 800, color: STYLES.colors.primaryHover, padding: '6px 0' }}>
                    {selectedLead.icpScore}/100
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>PIPELINE STAGE</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: `1px solid ${STYLES.colors.border}`,
                      background: '#1E293B',
                      color: '#FFF',
                      fontSize: 13
                    }}
                    value={selectedLead.stage}
                    onChange={e => handleUpdateLeadField(selectedLead.id, { stage: e.target.value as Lead['stage'] })}
                  >
                    {Object.entries(STYLES.stage).map(([k,v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>BUYING HEAT</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: `1px solid ${STYLES.colors.border}`,
                      background: '#1E293B',
                      color: '#FFF',
                      fontSize: 13
                    }}
                    value={selectedLead.heat}
                    onChange={e => handleUpdateLeadField(selectedLead.id, { heat: e.target.value as Lead['heat'] })}
                  >
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
              </div>

              {/* AI Summaries */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: STYLES.colors.textDark }}>AI SUMMARY & CLOSE ANGLE</h4>
                  <button
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: STYLES.colors.primaryHover,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onClick={() => triggerManualSummary(selectedLead.id)}
                  >
                    {Icons.refresh()}
                    Recalculate
                  </button>
                </div>
                <div style={{
                  background: 'rgba(9, 13, 22, 0.4)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#CBD5E1'
                }}>
                  {selectedLead.aiSummary ?? 'No summary computed yet. Log interactions and trigger summary.'}
                </div>
              </div>

              {/* Next Action recommendation */}
              {selectedLead.nextAction && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: STYLES.colors.textDark }}>AI NEXT ACTION RECOMMENDATION</h4>
                  <div style={{
                    border: `1px solid ${STYLES.colors.border}`,
                    background: 'rgba(9, 13, 22, 0.2)',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: selectedLead.nextAction.urgency === 'today' ? STYLES.colors.red : selectedLead.nextAction.urgency === 'this_week' ? STYLES.colors.yellow : STYLES.colors.primary,
                        color: '#FFFFFF'
                      }}>
                        {selectedLead.nextAction.urgency.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: 12, color: STYLES.colors.textDark }}>{selectedLead.nextAction.action}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: STYLES.colors.textMuted }}>{selectedLead.nextAction.rationale}</div>
                  </div>
                </div>
              )}

              {/* Log Interaction Form */}
              <form onSubmit={(e) => handleLogInteraction(e, selectedLead.id)} style={{
                border: `1px solid ${STYLES.colors.border}`,
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: STYLES.colors.textDark }}>Log Sales Interaction</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select
                    style={{ padding: '6px 8px', borderRadius: 4, border: `1px solid ${STYLES.colors.border}`, background: '#1E293B', color: '#FFF', fontSize: 11 }}
                    value={newInteraction.type}
                    onChange={e => setNewInteraction(p => ({ ...p, type: e.target.value as any }))}
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>

                  <select
                    style={{ padding: '6px 8px', borderRadius: 4, border: `1px solid ${STYLES.colors.border}`, background: '#1E293B', color: '#FFF', fontSize: 11 }}
                    value={newInteraction.direction}
                    onChange={e => setNewInteraction(p => ({ ...p, direction: e.target.value as any }))}
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>

                <textarea
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${STYLES.colors.border}`,
                    background: 'rgba(0,0,0,0.2)',
                    color: '#FFF',
                    fontSize: 12,
                    minHeight: 50,
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Summarize the discussion, decision made or next action..."
                  value={newInteraction.summary}
                  onChange={e => setNewInteraction(p => ({ ...p, summary: e.target.value }))}
                />

                <button
                  type="submit"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: STYLES.colors.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    alignSelf: 'flex-end',
                    cursor: 'none'
                  }}
                >
                  Save Log
                </button>
              </form>

              {/* Interaction History Timeline */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: STYLES.colors.textDark }}>INTERACTION TIMELINE</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 8, borderLeft: `2px solid ${STYLES.colors.border}` }}>
                  {selectedLeadHistory.map(i => (
                    <div key={i.id} style={{ position: 'relative', paddingLeft: 12 }}>
                      <span style={{
                        position: 'absolute',
                        left: -17,
                        top: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: i.direction === 'inbound' ? STYLES.colors.green : STYLES.colors.primary,
                        border: '2px solid #0F172A',
                        boxShadow: `0 0 8px ${i.direction === 'inbound' ? STYLES.colors.green : STYLES.colors.primary}`
                      }} />
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          color: '#E2E8F0'
                        }}>
                          {i.type.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 10, color: STYLES.colors.textMuted }}>
                          {i.direction === 'inbound' ? 'Inbound' : 'Outbound'} · {i.createdAt.slice(0,10)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4, lineHeight: 1.4 }}>
                        {i.summary}
                      </div>
                    </div>
                  ))}
                  {selectedLeadHistory.length === 0 && (
                    <div style={{ fontSize: 12, color: STYLES.colors.textMuted, padding: '10px 0' }}>
                      No touchpoints recorded. Log one above.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Onboard from Transcript Modal */}
      {showOnboardModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
            onClick={() => setShowOnboardModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            background: '#0F172A',
            border: `1px solid ${STYLES.colors.border}`,
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${STYLES.colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(9, 13, 22, 0.4)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: STYLES.colors.textDark, fontFamily: "'Outfit', sans-serif" }}>Onboard Lead from Transcript</h3>
              <button
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'none', color: STYLES.colors.textMuted }}
                onClick={() => setShowOnboardModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleOnboard} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: STYLES.colors.textMuted }}>
                  Paste a raw email thread, Zoom transcript, or call notes below. The AI will extract the contact profile, company, deal value, and build the interaction timeline automatically.
                </p>
                <textarea
                  required
                  style={{
                    width: '95%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${STYLES.colors.border}`,
                    background: 'rgba(0,0,0,0.2)',
                    color: '#FFF',
                    fontSize: 12,
                    minHeight: 180,
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Paste raw conversation or notes here..."
                  value={transcriptText}
                  onChange={e => setTranscriptText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'transparent',
                    color: '#FFFFFF',
                    border: `1px solid ${STYLES.colors.border}`,
                    cursor: 'none'
                  }}
                  onClick={() => setShowOnboardModal(false)}
                  disabled={onboarding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: STYLES.colors.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'none',
                    opacity: onboarding ? 0.75 : 1
                  }}
                  disabled={onboarding}
                >
                  {onboarding ? (
                    <>
                      <span className="spinner" style={{
                        width: 12,
                        height: 12,
                        border: '2px solid #fff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Parsing...
                    </>
                  ) : 'Parse & Onboard'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Google Setup / Mock Sign-In Modal */}
      {showGoogleSetupModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
            onClick={() => setShowGoogleSetupModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 480,
            background: '#0F172A',
            border: `1px solid ${STYLES.colors.border}`,
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${STYLES.colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(9, 13, 22, 0.4)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: STYLES.colors.textDark, fontFamily: "'Outfit', sans-serif" }}>Google Sign-In Connection</h3>
              <button
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'none', color: STYLES.colors.textMuted }}
                onClick={() => setShowGoogleSetupModal(false)}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <strong style={{ fontSize: 13, color: '#FFF', display: 'block', marginBottom: 6 }}>OAuth Credentials Missing</strong>
                <p style={{ margin: 0, fontSize: 12, color: STYLES.colors.textMuted, lineHeight: 1.5 }}>
                  To link your actual Google account in development, declare your credentials in Google Cloud Console and paste the client ID to `.env`:
                </p>
                <code style={{
                  display: 'block',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: STYLES.colors.primaryHover,
                  marginTop: 8
                }}>
                  NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id"
                </code>
              </div>

              <div style={{ height: '1px', background: STYLES.colors.border }} />

              <form onSubmit={handleSimulatedLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <strong style={{ fontSize: 13, color: '#FFF' }}>Test with simulated Google Account</strong>
                
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>PROFILE NAME</label>
                  <input
                    required
                    type="text"
                    style={{ width: '95%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                    value={mockGoogleUser.name}
                    onChange={e => setMockGoogleUser(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>EMAIL ADDRESS</label>
                  <input
                    required
                    type="email"
                    style={{ width: '95%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                    value={mockGoogleUser.email}
                    onChange={e => setMockGoogleUser(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'transparent',
                      color: '#FFFFFF',
                      border: `1px solid ${STYLES.colors.border}`,
                      cursor: 'none'
                    }}
                    onClick={() => setShowGoogleSetupModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: STYLES.colors.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'none'
                    }}
                  >
                    Connect Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Add Lead Modal Overlay */}
      {showAddLeadModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
            onClick={() => setShowAddLeadModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 440,
            background: '#0F172A',
            border: `1px solid ${STYLES.colors.border}`,
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${STYLES.colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(9, 13, 22, 0.4)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: STYLES.colors.textDark, fontFamily: "'Outfit', sans-serif" }}>Create Opportunity</h3>
              <button
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'none', color: STYLES.colors.textMuted }}
                onClick={() => setShowAddLeadModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddLead} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>LEAD NAME</label>
                <input
                  required
                  type="text"
                  style={{ width: '95%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                  placeholder="e.g. John Doe"
                  value={newLead.name}
                  onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>EMAIL ADDRESS</label>
                <input
                  required
                  type="email"
                  style={{ width: '95%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                  placeholder="e.g. john@domain.com"
                  value={newLead.email}
                  onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>COMPANY</label>
                  <input
                    required
                    type="text"
                    style={{ width: '90%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                    placeholder="e.g. Acme Corp"
                    value={newLead.company}
                    onChange={e => setNewLead(p => ({ ...p, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>ROLE / TITLE</label>
                  <input
                    required
                    type="text"
                    style={{ width: '90%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                    placeholder="e.g. COO"
                    value={newLead.title}
                    onChange={e => setNewLead(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>DEAL VALUE ($)</label>
                  <input
                    required
                    type="number"
                    style={{ width: '90%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 13 }}
                    value={newLead.dealValue}
                    onChange={e => setNewLead(p => ({ ...p, dealValue: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: STYLES.colors.textMuted, display: 'block', marginBottom: 4 }}>LEAD SOURCE</label>
                  <select
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${STYLES.colors.border}`, background: '#1E293B', color: '#FFF', fontSize: 13 }}
                    value={newLead.source}
                    onChange={e => setNewLead(p => ({ ...p, source: e.target.value }))}
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Cold outreach">Cold outreach</option>
                    <option value="Referral">Referral</option>
                    <option value="Conference">Conference</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'transparent',
                    color: '#FFFFFF',
                    border: `1px solid ${STYLES.colors.border}`,
                    cursor: 'none'
                  }}
                  onClick={() => setShowAddLeadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: STYLES.colors.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'none'
                  }}
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes floatUp {
          0% {
            transform: translateY(110vh) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110px) translateX(var(--sway-x)) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

    </div>
  );
}
