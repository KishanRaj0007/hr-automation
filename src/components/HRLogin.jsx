// src/components/HRLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HRLogin() {
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/hr-dashboard'); // Updated to point to the new HR dashboard route
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Premium Dark Mode Loading State
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Authenticating Workspace...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Input styles matching the global design system
  const inputStyle = {
    width: '100%', 
    padding: '12px 16px', 
    boxSizing: 'border-box', 
    border: '1px solid var(--glass-border)', 
    borderRadius: '8px', 
    outline: 'none', 
    fontSize: '14px', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    color: '#fff', 
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
    fontFamily: 'inherit'
  };

  const labelStyle = { 
    display: 'block', 
    textAlign: 'left', 
    fontSize: '13px', 
    fontWeight: '500', 
    color: '#e2e8f0', 
    marginBottom: '6px' 
  };

  return (
    <>
      <div className="aurora-bg"></div>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        zIndex: 1,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        <div className="glass-panel animate-fade-up" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img 
              src="/jarurat-logo.png" 
              alt="Jarurat Care Logo" 
              style={{ height: '60px', objectFit: 'contain', marginBottom: '16px' }} 
            />
            <h1 style={{ 
              color: '#fff', 
              fontSize: '24px', 
              fontWeight: '800', 
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>
              HR Command Center
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Authorized personnel only.
            </p>
          </div>

          {error && (
            <div className="animate-fade-up" style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderLeft: '4px solid #ef4444',
              color: '#fca5a5',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>
                Organizational Email
              </label>
              <input
                type="email"
                placeholder="hr@jarurat.care"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={labelStyle}>
                Security Passcode
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '45px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium"
              style={{
                width: '100%',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Authenticating...' : 'Access Workspace'}
            </button>
          </form>

          <div style={{ 
            marginTop: '32px', 
            paddingTop: '24px', 
            borderTop: '1px solid var(--glass-border)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
              Access is strictly restricted to authorized Jarurat Care Foundation administrators. System activities are logged.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default HRLogin;