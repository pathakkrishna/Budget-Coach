import React from 'react';
import { 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  BarChart3, 
  Cpu, 
  Database, 
  PieChart, 
  CheckCircle2, 
  Lock, 
  LogIn, 
  UserPlus, 
  TrendingUp, 
  Layers,
  ChevronRight
} from 'lucide-react';

export default function LandingPage({ onOpenAuth }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. TOP NAVIGATION BAR                                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: 'var(--coral)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: 'var(--shadow-coral)'
          }}>
            <Wallet size={20} strokeWidth={2.2} />
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Personal Finance <span style={{ color: 'var(--coral)' }}>Budget Coach</span>
            </span>
            <span className="pill-badge pill-neutral" style={{ marginLeft: '10px', fontSize: '0.68rem' }}>
              v2.0 Fintech
            </span>
          </div>
        </div>

        {/* Auth CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onOpenAuth('signin')}
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => onOpenAuth('signup')}
            className="btn-coral"
            style={{
              padding: '9px 20px',
              fontSize: '0.84rem',
              boxShadow: 'var(--shadow-coral)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={15} />
            <span>Get Started Free</span>
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. HERO SECTION                                            */}
      {/* ────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '70px 48px 50px',
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Pill Highlight */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--coral-light)',
          color: 'var(--coral)',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '20px',
          border: '1px solid rgba(242, 100, 61, 0.18)'
        }}>
          <Sparkles size={14} />
          <span>Multi-Agent Financial Intelligence &amp; SQLite Memory</span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: '3.1rem',
          fontWeight: 900,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          maxWidth: '900px',
          margin: '0 auto 20px'
        }}>
          Master Your Budget with <br />
          <span style={{ color: 'var(--coral)' }}>Autonomous AI Agents</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Track multi-month spending, apply the 50/30/20 rule, build long-term savings in isolated SQLite persistent memory, and receive structured coaching tailored to your personal account.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button
            onClick={() => onOpenAuth('signup')}
            className="btn-coral"
            style={{
              padding: '14px 32px',
              fontSize: '1rem',
              fontWeight: 800,
              boxShadow: 'var(--shadow-coral)'
            }}
          >
            <span>Create Your Free Account</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => onOpenAuth('signin')}
            style={{
              padding: '14px 28px',
              borderRadius: 'var(--radius-full)',
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            <LogIn size={18} color="var(--coral)" />
            <span>Sign In to Existing Workspace</span>
          </button>
        </div>

        {/* Trust Points */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={15} color="var(--success)" />
            <span>Isolated User Memory (SQLite)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="var(--coral)" />
            <span>Safety Guardrail Enforced</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={15} color="var(--dark-accent)" />
            <span>Private Account Access Only</span>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. KEY CAPABILITIES (3-COLUMN FINTECH GRID)               */}
      {/* ────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '30px 48px 80px',
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Built for Serious Financial Clarity
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Every component is engineered for accuracy, data isolation, and actionable personal guidance.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Card 1 */}
          <div className="fintech-card" style={{ padding: '32px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--coral-light)',
              color: 'var(--coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Database size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
              Account-Linked SQLite Memory
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your financial records are strictly linked to your account. When you log in with your credentials, all of your past recorded months and active savings goals are restored immediately.
            </p>
          </div>

          {/* Card 2 */}
          <div className="fintech-card" style={{ padding: '32px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--success-light)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <PieChart size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
              50/30/20 Rule &amp; RAG Knowledge
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Powered by TF-IDF vector retrieval and strict 50/30/20 mathematical models. Easily classify your expenses into Needs, Wants, and Savings with real-time budget overspending alerts.
            </p>
          </div>

          {/* Card 3 */}
          <div className="fintech-card" style={{ padding: '32px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(34, 34, 30, 0.08)',
              color: 'var(--dark-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
              5 Coordinated Specialized Agents
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              From transaction categorization to safety compliance, our 5-agent pipeline collaborates sequentially to generate structured, actionable, and guardrail-approved budgeting reports.
            </p>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. CALL TO ACTION FOOTER BANNER                           */}
      {/* ────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--dark-accent)',
        color: '#FFFFFF',
        padding: '60px 48px',
        marginTop: 'auto',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '14px', letterSpacing: '-0.02em' }}>
            Ready to Take Control of Your Finances?
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#B0B0B0', marginBottom: '28px', lineHeight: 1.6 }}>
            Sign in or create your private account now to unlock your personalized budgeting workspace and multi-month coach analytics.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onOpenAuth('signup')}
              className="btn-coral"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onOpenAuth('signin')}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </section>

      {/* Copyright */}
      <footer style={{
        background: '#1A1A17',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 48px',
        textAlign: 'center',
        fontSize: '0.76rem',
        color: '#888888'
      }}>
        Personal Finance Budget Coach &copy; {new Date().getFullYear()} — Powered by Multi-Agent AI Framework &amp; SQLite Persistent Memory.
      </footer>

    </div>
  );
}
