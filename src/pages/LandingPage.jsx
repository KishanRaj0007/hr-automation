// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="aurora-bg"></div>
      
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        
        {/* Company Logo */}
        <img 
          src="/jarurat-logo.png" 
          alt="Jarurat Care Foundation Logo" 
          className="animate-fade-up"
          style={{ height: '85px', objectFit: 'contain', marginBottom: '24px' }}
        />

        {/* Subtle top badge */}
        <div className="glass-panel animate-fade-up delay-100" style={{ padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '30px', color: '#cbd5e1' }}>
          Jarurat Care Foundation • Recruitment Portal
        </div>

        {/* Hero Headline */}
        <h1 className="animate-fade-up delay-200" style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: '800', margin: '0 0 24px 0', lineHeight: '1.1', maxWidth: '900px', letterSpacing: '-1px' }}>
          Join India's Mission to <br />
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Transform Cancer Care.
          </span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-300" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 0 48px 0', lineHeight: '1.6', fontWeight: '400' }}>
          This is more than an internship. It is a technological movement to support patients, caregivers, and healthcare communities across the nation.
        </p>

        {/* Action Buttons */}
        <div className="animate-fade-up delay-300" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className="btn-premium"
            onClick={() => navigate('/login')}
          >
            Apply as Candidate
          </button>
          <button 
            className="btn-glass"
            onClick={() => navigate('/hr-login')}
          >
            HR Workspace
          </button>
        </div>

        {/* Bottom Trust indicators */}
        <div className="animate-fade-up delay-300" style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '40px', color: 'var(--glass-border)', fontSize: '14px', fontWeight: '500' }}>
          <span>Compassion</span>
          <span>•</span>
          <span>Innovation</span>
          <span>•</span>
          <span>Excellence</span>
        </div>
      </div>
    </>
  );
}