import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Key, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  logInWithEmail, 
  signUpWithEmail, 
  logInWithGoogle, 
  isConfigured, 
  firebaseConfig, 
  saveCustomFirebaseConfig 
} from './firebase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Custom Firebase config drawer
  const [showConfigDrawer, setShowConfigDrawer] = useState(!isConfigured && false);
  const [customApiKey, setCustomApiKey] = useState(firebaseConfig.apiKey || '');
  const [customAuthDomain, setCustomAuthDomain] = useState(firebaseConfig.authDomain || '');
  const [customProjectId, setCustomProjectId] = useState(firebaseConfig.projectId || '');
  const [customStorageBucket, setCustomStorageBucket] = useState(firebaseConfig.storageBucket || '');
  const [customMessagingSenderId, setCustomMessagingSenderId] = useState(firebaseConfig.messagingSenderId || '');
  const [customAppId, setCustomAppId] = useState(firebaseConfig.appId || '');

  // Keep mode in sync if changed by parent
  React.useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'signup') {
        res = await signUpWithEmail(email, password, displayName);
        setSuccessMsg(`Welcome ${res.user.displayName}! Your private workspace is ready.`);
      } else {
        res = await logInWithEmail(email, password);
        setSuccessMsg(`Welcome back, ${res.user.displayName}! Loading your saved finances...`);
      }
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err) {
      console.error("Auth error:", err);
      let friendly = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        friendly = 'Incorrect password. Please verify and try again.';
      } else if (err.code === 'auth/user-not-found') {
        friendly = `No account found with this email. Click "Create Account" below to register.`;
      } else if (err.code === 'auth/email-already-in-use') {
        friendly = 'An account with this email already exists. Please Sign In.';
      } else if (err.code === 'auth/weak-password') {
        friendly = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendly = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendly = 'Email/Password sign-in is not enabled yet in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password.';
      }
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await logInWithGoogle();
      setSuccessMsg(`Signed in as ${res.user.displayName || res.user.email}!`);
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err) {
      console.error("Google Auth error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google Sign-In popup was closed before completing authentication.');
      } else if (err.code === 'auth/configuration-missing') {
        setErrorMsg('Firebase project keys not found. Please click "Configure Firebase Keys" below to connect your Firebase Project.');
        setShowConfigDrawer(true);
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('This domain (localhost/127.0.0.1) is not authorized in your Firebase Console > Authentication > Settings > Authorized Domains.');
      } else {
        setErrorMsg(err.message || 'Google Sign-In failed. Please check your Firebase settings or use Email Sign In.');
        setShowConfigDrawer(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFirebaseConfig = (e) => {
    e.preventDefault();
    if (!customApiKey.trim() || !customProjectId.trim()) {
      setErrorMsg('Please enter at least the Firebase API Key and Project ID.');
      return;
    }
    const newCfg = {
      apiKey: customApiKey.trim(),
      authDomain: customAuthDomain.trim() || `${customProjectId.trim()}.firebaseapp.com`,
      projectId: customProjectId.trim(),
      storageBucket: customStorageBucket.trim() || `${customProjectId.trim()}.appspot.com`,
      messagingSenderId: customMessagingSenderId.trim(),
      appId: customAppId.trim()
    };
    saveCustomFirebaseConfig(newCfg);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(34, 34, 30, 0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.16), 0 8px 24px rgba(0, 0, 0, 0.08)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Top Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <ShieldCheck size={19} strokeWidth={2.4} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {mode === 'signin' ? 'Sign In to Budget Coach' : 'Create Your Account'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Secure, isolated personal financial workspace
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Tab Switcher: Sign In vs Sign Up */}
          <div style={{ padding: '16px 28px 0', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'signin' ? 'var(--dark-accent)' : 'var(--bg-surface)',
                color: mode === 'signin' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'signup' ? 'var(--dark-accent)' : 'var(--bg-surface)',
                color: mode === 'signup' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Alerts / Error messages */}
          {errorMsg && (
            <div style={{
              margin: '16px 28px 0',
              padding: '10px 14px',
              background: 'var(--danger-light)',
              border: '1px solid rgba(228, 87, 69, 0.25)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.78rem',
              color: 'var(--danger)',
              fontWeight: 600,
              lineHeight: 1.4
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              margin: '16px 28px 0',
              padding: '10px 14px',
              background: 'var(--success-light)',
              border: '1px solid rgba(54, 168, 121, 0.25)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              color: 'var(--success)',
              fontWeight: 600
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ padding: '20px 28px 24px' }}>
            
            {/* Google Auth Button */}
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: '#FFFFFF',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
            >
              {/* Google G Logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '18px 0',
              color: 'var(--text-muted)',
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 12px' }}>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Full Name / Username
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px'
                  }}>
                    <User size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                    <input
                      type="text"
                      placeholder="e.g. Chris"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 12px'
                }}>
                  <Mail size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Password
                  </label>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 12px'
                }}>
                  <Lock size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-coral"
                style={{
                  width: '100%',
                  padding: '11px',
                  marginTop: '6px',
                  fontSize: '0.88rem',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-coral)'
                }}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Note on persistent isolated memory */}
            <div style={{
              marginTop: '16px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)'
            }}>
              <Info size={14} color="var(--coral)" style={{ flexShrink: 0 }} />
              <span>
                Each account has isolated SQLite memory. Your budgets, expenses, and savings goals are linked strictly to your credentials.
              </span>
            </div>

            {/* Firebase Project Keys Toggle */}
            <div style={{
              marginTop: '14px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Configure Firebase Web App Credentials"
              >
                <Settings size={13} />
                <span>{showConfigDrawer ? 'Hide Firebase Keys' : 'Configure Firebase Keys for Google Auth'}</span>
              </button>
            </div>

            {/* Collapsible Firebase Project Keys Setup */}
            {showConfigDrawer && (
              <div style={{
                marginTop: '12px',
                padding: '14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.74rem'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} color="var(--coral)" />
                  <span>Firebase Web App Credentials</span>
                </div>
                <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.3 }}>
                  Paste credentials from Firebase Console (Project Settings &gt; General &gt; Your apps &gt; Web) to enable real Google Sign-In:
                </p>
                <form onSubmit={handleSaveFirebaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="apiKey (e.g. AIzaSy...)"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    style={{ padding: '7px 9px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.73rem' }}
                  />
                  <input
                    type="text"
                    placeholder="projectId"
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    style={{ padding: '7px 9px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.73rem' }}
                  />
                  <input
                    type="text"
                    placeholder="authDomain (optional)"
                    value={customAuthDomain}
                    onChange={(e) => setCustomAuthDomain(e.target.value)}
                    style={{ padding: '7px 9px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.73rem' }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '7px 14px',
                      borderRadius: '4px',
                      background: 'var(--dark-accent)',
                      color: '#FFF',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Save Keys & Reload
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
