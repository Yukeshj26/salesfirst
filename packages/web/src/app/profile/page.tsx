'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  primary: '#6366F1',
  bg: '#0B0F19',
  cardBg: '#1E293B',
  border: 'rgba(255, 255, 255, 0.08)',
  textDark: '#F8FAFC',
  textMuted: '#94A3B8',
  red: '#EF4444',
  green: '#10B981',
};

/** Returns the same stable user ID for a given email — always. */
function getOrCreateUserId(email: string): string {
  const registry: Record<string, string> = JSON.parse(
    localStorage.getItem('salesfirst_id_registry') || '{}'
  );
  if (registry[email]) return registry[email];
  const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  registry[email] = newId;
  localStorage.setItem('salesfirst_id_registry', JSON.stringify(registry));
  return newId;
}

type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title?: string;
  company?: string;
};

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width={26} height={26} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="plg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60AAFF" />
          <stop offset="100%" stopColor="#1D7FEA" />
        </linearGradient>
      </defs>
      <path d="M36 4L4 18l13 4 5 13 14-31z" fill="url(#plg)" />
      <path d="M17 22l7-7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, letterSpacing: '-0.5px' }}>
      <span style={{ fontWeight: 300, color: '#7EC8F8' }}>Sales</span>
      <span style={{ fontWeight: 800, color: '#1D7FEA' }}>First</span>
    </span>
  </div>
);

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('salesfirst_user');
    if (!raw) { router.push('/'); return; }
    try {
      const parsed: UserProfile = JSON.parse(raw);
      // Ensure the user's email always maps to the same stable ID
      const stableId = getOrCreateUserId(parsed.email);
      if (parsed.id !== stableId) {
        parsed.id = stableId;
        localStorage.setItem('salesfirst_user', JSON.stringify(parsed));
      }
      setUser(parsed);
      setName(parsed.name || '');
      setTitle(parsed.title || '');
      setCompany(parsed.company || '');
      setAvatar(parsed.avatar || '');
      setAvatarPreview(parsed.avatar || '');
    } catch { router.push('/'); }
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showToast('Image must be under 3 MB', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { showToast('Name is required', 'error'); return; }
    setSaving(true);
    // email and id are immutable — always preserved from stored user
    const updated: UserProfile = {
      ...user!,
      name: name.trim(),
      title: title.trim(),
      company: company.trim(),
      avatar,
    };
    localStorage.setItem('salesfirst_user', JSON.stringify(updated));
    setUser(updated);
    setTimeout(() => { setSaving(false); showToast('Profile saved!'); }, 400);
  }

  function handleLogout() {
    localStorage.removeItem('salesfirst_user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textDark, fontFamily: "'Inter', sans-serif", padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: toast.type === 'success' ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)', color: '#FFF', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 8px 20px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', zIndex: 1000, border: '1px solid rgba(255,255,255,0.12)' }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <a href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
        >
          ← Dashboard
        </a>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 680, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>

        {/* Top banner */}
        <div style={{ height: 110, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
        </div>

        <div style={{ padding: '0 36px 36px', position: 'relative' }}>

          {/* Avatar — overlapping banner */}
          <div style={{ position: 'relative', display: 'inline-block', marginTop: -54, marginBottom: 20 }}>
            <div style={{ width: 108, height: 108, borderRadius: '50%', border: `4px solid ${C.cardBg}`, overflow: 'hidden', background: '#1e1b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '55%', height: '55%', color: C.textMuted }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
              }
            </div>
            {/* Edit camera icon overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: 4, right: 4, width: 30, height: 30, borderRadius: '50%', background: C.primary, border: '2px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="Change profile picture"
            >
              <svg width={14} height={14} fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {/* User ID badge */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#818CF8', fontWeight: 600, fontFamily: 'monospace' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', display: 'inline-block' }} />
              ID: {user.id}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#FFF', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
              </div>

              {/* Email — read-only, locks the user ID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Email
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: 0 }}>LOCKED</span>
                </label>
                <input
                  value={user.email}
                  readOnly
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.04)`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: C.textMuted, outline: 'none', cursor: 'not-allowed' }}
                />
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Job Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Founder & CEO"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#FFF', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
              </div>

              {/* Company */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Company</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#FFF', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Profile picture upload hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width={18} height={18} fill="none" stroke="#818CF8" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#818CF8' }}>Upload profile picture</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>JPG, PNG, GIF · Max 3 MB</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: C.primary, color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1, boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = '#818CF8')}
                onMouseLeave={e => (e.currentTarget.style.background = C.primary)}
              >
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: C.red, border: '1px solid rgba(239,68,68,0.25)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
              >
                <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Log Out
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(148,163,184,0.5)', textAlign: 'center' }}>
        Your email is tied to your account ID and cannot be changed.
        Each email address has exactly one unique user ID.
      </p>
    </div>
  );
}
