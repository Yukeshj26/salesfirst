'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ id: '', name: '', email: '', avatar: '', title: '', company: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('salesfirst_user');
    if (savedUser) {
      try {
        setProfile(JSON.parse(savedUser));
      } catch {}
    } else {
      router.push('/');
    }
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('salesfirst_user', JSON.stringify(profile));
    showToast('Profile updated successfully!', 'success');
  };

  const handleSignOut = () => {
    localStorage.removeItem('salesfirst_user');
    router.push('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC', padding: '4rem 2rem', fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, padding: '12px 20px', borderRadius: 8, background: toast.type === 'success' ? '#10B981' : '#EF4444', color: '#FFF', fontWeight: 600, zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: 600, margin: '0 auto', background: '#1E293B', padding: '2.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700 }}>Edit Profile</h1>
          <button 
            onClick={() => router.push('/dashboard')} 
            style={{ background: 'transparent', border: '1px solid #94A3B8', color: '#94A3B8', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Avatar Edit Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '2px solid #6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700 }}>{profile.name?.[0] || 'U'}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>PROFILE PICTURE URL</label>
              <input 
                type="text" 
                value={profile.avatar || ''} 
                onChange={e => setProfile({...profile, avatar: e.target.value})}
                placeholder="Paste an image URL to change..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#FFF', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Locked Identity Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>EMAIL ADDRESS (Locked)</label>
              <input 
                type="email" 
                value={profile.email || ''} 
                disabled
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.03)', color: '#64748B', cursor: 'not-allowed', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>USER ID (Locked to Email)</label>
              <input 
                type="text" 
                value={profile.id || ''} 
                disabled
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.03)', color: '#64748B', cursor: 'not-allowed', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Editable Details */}
          <div>
            <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>FULL NAME</label>
            <input 
              type="text" 
              value={profile.name || ''} 
              onChange={e => setProfile({...profile, name: e.target.value})}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>JOB TITLE</label>
              <input 
                type="text" 
                value={profile.title || ''} 
                onChange={e => setProfile({...profile, title: e.target.value})}
                placeholder="e.g. Account Executive"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 6 }}>COMPANY</label>
              <input 
                type="text" 
                value={profile.company || ''} 
                onChange={e => setProfile({...profile, company: e.target.value})}
                placeholder="e.g. SalesFirst Inc."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: 14 }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button 
              type="button" 
              onClick={handleSignOut}
              style={{ padding: '10px 18px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              Log Out
            </button>
            <button 
              type="submit" 
              style={{ padding: '10px 28px', borderRadius: 8, background: '#6366F1', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(99,102,241,0.3)', transition: 'transform 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              Save Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}