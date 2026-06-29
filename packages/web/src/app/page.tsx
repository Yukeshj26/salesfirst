'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const C = {
  primary: '#1D7FEA',
  primaryHover: '#1a6fd4',
  bg: '#0B0F19',
  cardBg: '#1E293B',
  border: 'rgba(255, 255, 255, 0.08)',
  textDark: '#F8FAFC',
  textMuted: '#94A3B8',
  green: '#10B981',
  blue: '#06B6D4',
};

type UserProfile = { name: string; email: string; avatar: string };

// Unknown person SVG
const AnonAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    style={{ width: '58%', height: '58%', color: C.textMuted }}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

// SalesFirst inline logo — paper plane icon + styled text
const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
  const fontSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 22;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Paper-plane icon */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60AAFF" />
            <stop offset="100%" stopColor="#1D7FEA" />
          </linearGradient>
        </defs>
        <path d="M36 4L4 18l13 4 5 13 14-31z" fill="url(#logoGrad)" />
        <path d="M17 22l7-7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {/* Brand name */}
      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize, letterSpacing: '-0.5px', lineHeight: 1 }}>
        <span style={{ fontWeight: 300, color: '#7EC8F8' }}>Sales</span>
        <span style={{ fontWeight: 800, color: '#1D7FEA' }}>First</span>
      </span>
    </div>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mockName, setMockName] = useState('');
  const [mockEmail, setMockEmail] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const googleInitializedRef = useRef(false);

  // Load user session
  useEffect(() => {
    const savedUser = localStorage.getItem('salesfirst_user');
    if (savedUser) {
      try { setUserProfile(JSON.parse(savedUser)); } catch {}
    }
  }, []);

  // Animated particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const pts = Array.from({ length: 35 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 90 + 20,
      c: ['rgba(29,127,234,0.07)', 'rgba(6,182,212,0.06)', 'rgba(126,200,248,0.05)'][Math.floor(Math.random() * 3)]
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -100) p.x = W + 100;
        if (p.x > W + 100) p.x = -100;
        if (p.y < -100) p.y = H + 100;
        if (p.y > H + 100) p.y = -100;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.fillStyle = g;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  // Load Google GSI script once
  useEffect(() => {
    const id = 'gsi-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id; s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  // Initialize Google button when modal opens
  useEffect(() => {
    if (!showLoginModal) return;
    const init = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (clientId && (window as any).google) {
        if (!googleInitializedRef.current) {
          (window as any).google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleResponse });
          googleInitializedRef.current = true;
        }
        const el = document.getElementById('gsi-btn-home');
        if (el) (window as any).google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280 });
      }
    };
    if ((window as any).google) { init(); }
    else {
      const t = setInterval(() => { if ((window as any).google) { clearInterval(t); init(); } }, 100);
      return () => clearInterval(t);
    }
  }, [showLoginModal]);

  function handleGoogleResponse(res: any) {
    try {
      const [, b64] = res.credential.split('.');
      const payload = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
      const profile = { name: payload.name, email: payload.email, avatar: payload.picture || '' };
      localStorage.setItem('salesfirst_user', JSON.stringify(profile));
      setUserProfile(profile);
      setShowLoginModal(false);
      router.push('/dashboard');
    } catch { console.error('Google token error'); }
  }

  function handleMockLogin(e: React.FormEvent) {
    e.preventDefault();
    const profile = { name: mockName || 'Demo User', email: mockEmail || 'demo@salesfirst.ai', avatar: '' };
    localStorage.setItem('salesfirst_user', JSON.stringify(profile));
    setUserProfile(profile);
    setShowLoginModal(false);
    router.push('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textDark, fontFamily: "'Inter', sans-serif", position: 'relative', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1160, margin: '0 auto', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size="md" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {userProfile ? (
            /* ── LOGGED IN: show profile avatar + dashboard link ── */
            <>
              <Link href="/dashboard" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#FFF', background: C.primary, padding: '8px 20px', borderRadius: 8, boxShadow: '0 4px 14px rgba(29,127,234,0.35)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
                onMouseLeave={e => e.currentTarget.style.background = C.primary}
              >
                Dashboard
              </Link>
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: `2px solid ${C.primary}`, overflow: 'hidden', background: 'rgba(29,127,234,0.08)', boxShadow: '0 0 10px rgba(29,127,234,0.2)', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {userProfile.avatar
                  ? <img src={userProfile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <AnonAvatar />}
              </Link>
            </>
          ) : (
            /* ── LOGGED OUT: sign-in button ── */
            <button onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 8, background: C.primary, color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,127,234,0.3)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
              onMouseLeave={e => e.currentTarget.style.background = C.primary}
            >
              <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12" />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', zIndex: 10, width: '100%', maxWidth: 1160, margin: '0 auto', padding: '56px 28px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(29,127,234,0.1)', border: '1px solid rgba(29,127,234,0.25)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#7EC8F8', marginBottom: 28, letterSpacing: '0.05em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D7FEA', display: 'inline-block' }} />
          AI-Powered Sales Automation
        </div>

        {/* Logo big on hero */}
        <div style={{ marginBottom: 24 }}>
          <Logo size="lg" />
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', fontFamily: "'Outfit', sans-serif", margin: '0 0 18px', maxWidth: 760 }}>
          Never Let a Lead Go Cold.<br />
          <span style={{ background: 'linear-gradient(135deg, #7EC8F8 0%, #1D7FEA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Close More with AI Follow-Ups
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: C.textMuted, lineHeight: 1.65, maxWidth: 580, margin: '0 0 36px' }}>
          SalesFirst uses autonomous AI agents to prioritize your pipeline, draft context-aware emails, and never let a deal slip through the cracks.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <button onClick={() => userProfile ? router.push('/dashboard') : setShowLoginModal(true)}
            style={{ padding: '13px 32px', borderRadius: 8, background: C.primary, color: '#FFF', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 28px rgba(29,127,234,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
            onMouseLeave={e => e.currentTarget.style.background = C.primary}
          >
            {userProfile ? 'Open Dashboard' : 'Get Started Free'}
          </button>
          <Link href="/dashboard" style={{ padding: '13px 28px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: C.textDark, border: `1px solid ${C.border}`, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(29,127,234,0.4)'; e.currentTarget.style.background = 'rgba(29,127,234,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            View Demo
          </Link>
        </div>

        {/* Dashboard visualisation image */}
        <div style={{ width: '100%', maxWidth: 960, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 30px 70px rgba(0,0,0,0.55), 0 0 80px rgba(29,127,234,0.08)', background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(12px)', transform: 'perspective(1200px) rotateX(2.5deg)', transition: 'transform 0.4s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'perspective(1200px) rotateX(0deg) scale(1.01)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'perspective(1200px) rotateX(2.5deg)'}
        >
          <img src="/dashboard_mock.png" alt="SalesFirst CRM Dashboard" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </main>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1160, margin: '0 auto', padding: '0 28px 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {[
          { icon: '⚡', color: C.primary, title: 'AI Priority Queue', desc: 'Autonomous scoring based on deal value, urgency, and interaction recency. Always know who to call next.' },
          { icon: '✉️', color: C.blue, title: 'Smart Auto-Drafts', desc: 'Context-aware follow-up emails generated in one click — referencing your actual conversation history.' },
          { icon: '📊', color: C.green, title: 'Pipeline Intelligence', desc: 'Visual Kanban board with AI-powered next-action recommendations, ICP scores, and deal heat maps.' },
        ].map(f => (
          <div key={f.title} style={{ background: 'rgba(30,41,59,0.35)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 26px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: C.textDark }}>{f.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── LOGIN MODAL ─────────────────────────────────────────────────── */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1E293B', border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 420, padding: '36px 32px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', position: 'relative' }}>
            {/* Close */}
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Logo size="sm" />
              <p style={{ margin: '12px 0 0', fontSize: 13, color: C.textMuted }}>Sign in to access your CRM dashboard</p>
            </div>

            {/* Google sign-in slot */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div id="gsi-btn-home" style={{ minHeight: 44 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>OR USE DEMO ACCOUNT</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Mock login form */}
            <form onSubmit={handleMockLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Your Name', value: mockName, set: setMockName, placeholder: 'e.g. Preethi Jayakumar', type: 'text' },
                { label: 'Email Address', value: mockEmail, set: setMockEmail, placeholder: 'e.g. preethi@salesfirst.ai', type: 'email' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#FFF', outline: 'none', transition: 'border-color 0.15s' }}
                    onFocus={e => e.currentTarget.style.borderColor = C.primary}
                    onBlur={e => e.currentTarget.style.borderColor = C.border}
                  />
                </div>
              ))}
              <button type="submit" style={{ marginTop: 6, padding: '12px', borderRadius: 8, background: C.primary, color: '#FFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,127,234,0.3)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
                onMouseLeave={e => e.currentTarget.style.background = C.primary}
              >
                Sign In with Demo Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
