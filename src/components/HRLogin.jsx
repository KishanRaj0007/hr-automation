import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HRLogin() {
  const navigate = useNavigate();
  const { login, quickLogin, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user) => {
    setLoading(true);
    setError('');
    try {
      // Use quickLogin to set session directly without DB check
      quickLogin(user.email, user.name, user.role, user.team);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Quick login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick login buttons with all data
  const quickLogins = [
    { 
      email: 'superadmin@jarurat.com', 
      label: 'Super Admin', 
      color: '#dc2626', 
      name: 'Super Admin',
      role: 'super_admin',
      team: 'leadership'
    },
    { 
      email: 'hrlead@jarurat.com', 
      label: 'HR Lead', 
      color: '#2563eb', 
      name: 'HR Lead',
      role: 'hr_lead',
      team: 'leadership'
    },
    { 
      email: 'projectmanager@jarurat.com', 
      label: 'Project Manager', 
      color: '#7c3aed', 
      name: 'Project Manager',
      role: 'project_manager',
      team: 'leadership'
    },
    { 
      email: 'assignment1@jarurat.com', 
      label: 'Assignment Team', 
      color: '#f59e0b', 
      name: 'Assignment Team Member 1',
      role: 'assignment_team',
      team: 'assignment'
    },
    { 
      email: 'assignment2@jarurat.com', 
      label: 'Assignment Team 2', 
      color: '#f59e0b', 
      name: 'Assignment Team Member 2',
      role: 'assignment_team',
      team: 'assignment'
    },
    { 
      email: 'scheduling1@jarurat.com', 
      label: 'Scheduling Team', 
      color: '#10b981', 
      name: 'Scheduling Team Member 1',
      role: 'scheduling_team',
      team: 'scheduling'
    },
    { 
      email: 'scheduling2@jarurat.com', 
      label: 'Scheduling Team 2', 
      color: '#10b981', 
      name: 'Scheduling Team Member 2',
      role: 'scheduling_team',
      team: 'scheduling'
    },
    { 
      email: 'panelist1@jarurat.com', 
      label: 'R1 Panelist 1', 
      color: '#8b5cf6', 
      name: 'Panelist R1-1',
      role: 'r1_panelist',
      team: 'panel_r1'
    },
    { 
      email: 'panelist2@jarurat.com', 
      label: 'R1 Panelist 2', 
      color: '#8b5cf6', 
      name: 'Panelist R1-2',
      role: 'r1_panelist',
      team: 'panel_r1'
    },
    { 
      email: 'panelist3@jarurat.com', 
      label: 'R2 Panelist 1', 
      color: '#8b5cf6', 
      name: 'Panelist R2-1',
      role: 'r2_panelist',
      team: 'panel_r2'
    },
    { 
      email: 'panelist4@jarurat.com', 
      label: 'R2 Panelist 2', 
      color: '#8b5cf6', 
      name: 'Panelist R2-2',
      role: 'r2_panelist',
      team: 'panel_r2'
    }
  ];

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f4f8'
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
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #1e40af',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading...</p>
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '480px',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="/jarurat-logo.png" 
            alt="Jarurat Care Logo" 
            style={{ height: '50px', marginBottom: '12px' }} 
          />
          <h1 style={{ 
            color: '#1e3a8a', 
            fontSize: '24px', 
            fontWeight: '800', 
            margin: '0 0 4px 0' 
          }}>
            HR Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Sign in to manage recruitment
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            color: '#991b1b',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#475569', 
              marginBottom: '6px' 
            }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                color: '#1a202c',
                background: '#fff'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#94a3b8' : '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#1e3a8a';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#1e40af';
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Development Quick Access */}
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ 
              fontSize: '11px', 
              color: '#94a3b8', 
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ⚡ Development Quick Access
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px', 
            justifyContent: 'center' 
          }}>
            {quickLogins.map((user) => (
              <button
                key={user.email}
                onClick={() => handleQuickLogin(user)}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${user.color}`,
                  background: `${user.color}10`,
                  color: user.color,
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = user.color;
                    e.target.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = `${user.color}10`;
                    e.target.style.color = user.color;
                  }
                }}
              >
                {user.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
            Only authorized HR personnel can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HRLogin;