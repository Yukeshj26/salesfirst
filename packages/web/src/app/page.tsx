'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; email: string; avatar: string } | null>(null);
  const googleInitializedRef = useRef(false);

  useEffect(() => {
    // Check if user is already signed in
    const savedUser = localStorage.getItem('salesfirst_user');
    if (savedUser) {
      try {
        setUserProfile(JSON.parse(savedUser));
      } catch {}
    }

    // Load Google script
    const scriptId = 'google-gsi-client-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = initializeGoogleSignIn;
    } else {
      initializeGoogleSignIn();
    }
  }, []);

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
        
        const btnContainer = document.getElementById('google-signin-btn-home');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 250,
            shape: 'pill'
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
        window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const parsed = JSON.parse(jsonPayload);
      
      // Lock ID deterministically to the email via Google's sub ID
      const profile = {
        id: parsed.sub || 'usr_' + btoa(parsed.email).replace(/=/g, '').slice(0, 15),
        name: parsed.name,
        email: parsed.email,
        avatar: parsed.picture
      };
      
      setUserProfile(profile);
      localStorage.setItem('salesfirst_user', JSON.stringify(profile));
      router.push('/dashboard');
    } catch {
      console.error('Failed to parse Google login token');
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0B0F19', 
      color: '#F8FAFC', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: "'Outfit', sans-serif" 
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
        Welcome to <span style={{ color: '#6366F1' }}>SalesFirst</span>
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#94A3B8', marginBottom: '3rem', textAlign: 'center', maxWidth: 600, lineHeight: 1.6 }}>
        AI-powered pipeline management, autonomous follow-ups, and dynamic priority queues built for modern sales teams.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {userProfile ? (
          <button 
            onClick={() => router.push('/dashboard')}
            style={{ 
              padding: '14px 32px', 
              borderRadius: 40, 
              background: '#6366F1', 
              color: '#FFF', 
              border: 'none', 
              fontSize: 16, 
              fontWeight: 700, 
              cursor: 'pointer', 
              boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Open Dashboard
          </button>
        ) : (
          <div id="google-signin-btn-home" style={{ minHeight: 44 }}></div>
        )}
      </div>
    </div>
  );
}