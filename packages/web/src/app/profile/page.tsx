'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

const STYLES = {
  colors: {
    primary: '#6366F1',
    primaryHover: '#818CF8',
    bg: '#0B0F19',
    cardBg: '#1E293B',
    border: 'rgba(255, 255, 255, 0.08)',
    textDark: '#F8FAFC',
    textMuted: '#94A3B8',
    red: '#EF4444',
    green: '#10B981',
  }
};

type UserProfile = {
  id?: string;
  name: string;
  email: string;
  avatar: string;
  title?: string;
  company?: string;
};

// Preset avatar options
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', // Female developer
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', // Male developer
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', // Professional female
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', // Professional male
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('salesfirst_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setAvatar(parsed.avatar || '');
        setTitle(parsed.title || 'Founder & CEO');
        setCompany(parsed.company || 'My SaaS Corp');
      } catch (e) {
        // Fallback profile if parsing fails
        initializeDefaultProfile();
      }
    } else {
      // Redirect to homepage if user tries to access profile without logging in
      router.push('/');
    }
  }, []);

  function initializeDefaultProfile() {
    const defaultUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: 'Yukesh Kumar',
      email: 'yukesh@salesarc.com',
      avatar: '',
      title: 'Founder & CEO',
      company: 'SalesArc Inc',
    };
    setUser(defaultUser);
    setName(defaultUser.name);
    setEmail(defaultUser.email);
    setAvatar(defaultUser.avatar);
    setTitle(defaultUser.title);
    setCompany(defaultUser.company);
    localStorage.setItem('salesfirst_user', JSON.stringify(defaultUser));
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and Email are required', 'error');
      return;
    }

    const updatedProfile: UserProfile = {
      ...user,
      id: user?.id || 'usr_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      avatar,
      title,
      company
    };

    setUser(updatedProfile);
    localStorage.setItem('salesfirst_user', JSON.stringify(updatedProfile));
    showToast('Profile updated successfully!', 'success');
  }

  function handleLogout() {
    localStorage.removeItem('salesfirst_user');
    router.push('/');
  }

  // Handle local file upload & base64 conversion
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be under 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        showToast('Avatar uploaded! Click Save to apply.', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  // Unknown person SVG component
  const UnknownPersonSVG = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '60%', height: '60%', color: STYLES.colors.textMuted }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: STYLES.colors.bg,
      color: STYLES.colors.textDark,
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: '#FFF',
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {toast.message}
        </div>
      )}

      {/* Header bar */}
      <div style={{
        width: '100%',
        maxWidth: 800,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
        borderBottom: `1px solid ${STYLES.colors.border}`,
        paddingBottom: 20
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: STYLES.colors.textMuted,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${STYLES.colors.border}`,
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
          onMouseLeave={e => e.currentTarget.style.color = STYLES.colors.textMuted}
          >
            Go to Dashboard
          </Link>

          {/* Integrated Profile Picture Icon */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `1.5px solid ${STYLES.colors.primary}`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.03)',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)'
          }}>
            {avatar ? (
              <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UnknownPersonSVG />
            )}
          </div>
        </div>
      </div>

      {/* Profile Card Container */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: STYLES.colors.cardBg,
        border: `1px solid ${STYLES.colors.border}`,
        borderRadius: 16,
        padding: '36px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>User Profile</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: 13, color: STYLES.colors.textMuted }}>Manage your personal details and app configuration</p>
        </div>

        {/* Profile Picture Upload & Presets Area */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', borderBottom: `1px solid ${STYLES.colors.border}`, paddingBottom: 24 }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: `3px solid ${STYLES.colors.primary}`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.03)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
            position: 'relative'
          }}>
            {avatar ? (
              <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UnknownPersonSVG />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Choose Profile Picture</span>
            
            {/* Presets */}
            <div style={{ display: 'flex', gap: 10 }}>
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setAvatar(preset)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: avatar === preset ? `2px solid ${STYLES.colors.primary}` : '2px solid transparent',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img src={preset} alt="preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
              <button
                onClick={() => setAvatar('')}
                title="Use empty/anonymous profile photo"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: avatar === '' ? `2px solid ${STYLES.colors.primary}` : `1px solid ${STYLES.colors.border}`,
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: STYLES.colors.textMuted
                }}
              >
                Ø
              </button>
            </div>

            {/* Custom URL or Upload */}
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${STYLES.colors.border}`,
                fontSize: 12,
                fontWeight: 600,
                color: STYLES.colors.textDark,
                cursor: 'pointer',
                textAlign: 'center'
              }}>
                Upload Image
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <input
                type="text"
                placeholder="Or paste image URL..."
                value={avatar.startsWith('data:') ? '' : avatar}
                onChange={e => setAvatar(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: '#FFF',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Profile details form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Read Only User ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted }}>User ID (Unique identification)</label>
            <input
              type="text"
              readOnly
              value={user?.id || 'usr_loading...'}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${STYLES.colors.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: STYLES.colors.textMuted,
                cursor: 'not-allowed',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted }}>Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#FFF',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = STYLES.colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = STYLES.colors.border}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#FFF',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = STYLES.colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = STYLES.colors.border}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted }}>Title / Role</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#FFF',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = STYLES.colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = STYLES.colors.border}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: STYLES.colors.textMuted }}>Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${STYLES.colors.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#FFF',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = STYLES.colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = STYLES.colors.border}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: STYLES.colors.red,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
            >
              Log Out
            </button>

            <button
              type="submit"
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                background: STYLES.colors.primary,
                color: '#FFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = STYLES.colors.primaryHover}
              onMouseLeave={e => e.currentTarget.style.background = STYLES.colors.primary}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
