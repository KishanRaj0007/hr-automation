// components/RegisterUser.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const RegisterUser = ({ onClose, onSuccess }) => {
  const { canRegisterUsers, registerUser, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: '',
    team: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [tempPassword, setTempPassword] = useState('');
  const [mode, setMode] = useState('register');
  const [usersWithoutAuth, setUsersWithoutAuth] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Check for users without auth accounts
  useEffect(() => {
    checkUsersWithoutAuth();
  }, []);

  async function checkUsersWithoutAuth() {
    try {
      const { data: hrUsers, error: hrError } = await supabase
        .from('hr_users')
        .select('*')
        .eq('is_active', true);

      if (hrError) throw hrError;

      const authEmails = [];
      
      try {
        const { data: authData, error: authError } = await supabase
          .from('users')
          .select('email');
        
        if (!authError && authData) {
          authData.forEach(u => {
            if (u.email) authEmails.push(u.email);
          });
        }
      } catch (e) {
        console.log('⚠️ Cannot fetch auth users directly.');
      }

      if (authEmails.length === 0) {
        console.log('ℹ️ Cannot check auth users. Showing registration form.');
        return;
      }

      const missing = hrUsers.filter(u => !authEmails.includes(u.email));
      setUsersWithoutAuth(missing);
      
      if (missing.length > 0) {
        setMode('set_password');
        setSelectedUser(missing[0]);
      }
    } catch (error) {
      console.error('Error checking users:', error);
    }
  }

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Only show if user can register
  if (!canRegisterUsers()) {
    return (
      <div className="register-modal" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px 0', fontSize: '22px' }}>Access Denied</h3>
          <p style={{ color: '#64748b', margin: '0 0 24px 0', fontSize: '15px' }}>
            You don't have permission to manage users.
            <br />
            <small style={{ color: '#94a3b8' }}>
              Only HR Lead and Project Manager can manage users.
            </small>
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 32px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTempPassword('');
    setMessageType('info');
    setShowSuccess(false);

    // Validate that role and team are selected
    if (!formData.role || !formData.team) {
      setMessage('Please select both Role and Team');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const result = await registerUser(formData);
      
      if (result.success) {
        setTempPassword(result.tempPassword);
        setMessageType('success');
        setShowSuccess(true);
        setRegisteredUser(result.user);
        
        setFormData({
          email: '',
          name: '',
          role: '',
          team: ''
        });

        if (onSuccess) {
          onSuccess(result.user);
        }
      } else {
        setMessage(result.error || 'Registration failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(error.message || 'Registration failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('info');

    try {
      if (!selectedUser) {
        throw new Error('No user selected');
      }

      const password = document.getElementById('newPassword').value;
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: selectedUser.email,
        password: password,
        options: {
          data: {
            name: selectedUser.name,
            role: selectedUser.role
          }
        }
      });

      if (authError) {
        throw new Error('Failed to create auth user: ' + authError.message);
      }

      await supabase
        .from('hr_users')
        .update({ id: authData.user.id })
        .eq('email', selectedUser.email);

      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'hr_users',
          record_id: authData.user.id,
          action: 'set_password',
          new_data: {
            email: selectedUser.email,
            name: selectedUser.name,
            set_by: user?.email || 'system'
          },
          performed_by: user?.email || 'system'
        });

      setMessage(`✅ Password set successfully for ${selectedUser.name}! They can now login.`);
      setMessageType('success');
      
      setUsersWithoutAuth(prev => prev.filter(u => u.email !== selectedUser.email));
      
      const remaining = usersWithoutAuth.filter(u => u.email !== selectedUser.email);
      if (remaining.length > 0) {
        setSelectedUser(remaining[0]);
      } else {
        setSelectedUser(null);
        setMode('register');
        setMessage('');
      }

    } catch (error) {
      setMessage(error.message || 'Failed to set password');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const copyToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setToastMessage('✅ Password copied to clipboard!');
      setShowToast(true);
    }
  };

  // If there are users without auth accounts, show the set password UI
  if (mode === 'set_password' && usersWithoutAuth.length > 0 && selectedUser) {
    return (
      <div className="register-modal" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'visible',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          position: 'relative'
        }}>
          <button
            onClick={handleClose}
            style={{
              position: 'sticky',
              top: '0',
              right: '0',
              float: 'right',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#475569'; }}
            onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = '#94a3b8'; }}
          >
            ✕
          </button>

          <h2 style={{
            margin: '0 0 8px 0',
            color: '#1e293b',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            🔑 Set Password for User
          </h2>
          <p style={{
            margin: '0 0 8px 0',
            color: '#64748b',
            fontSize: '14px'
          }}>
            This user exists in the database but doesn't have a login yet.
          </p>
          <p style={{
            margin: '0 0 24px 0',
            color: '#f59e0b',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            ⚡ {usersWithoutAuth.length} user(s) need password setup
          </p>

          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              background: messageType === 'success' ? '#f0fdf4' : 
                        messageType === 'error' ? '#fef2f2' : '#eff6ff',
              border: `1px solid ${
                messageType === 'success' ? '#bbf7d0' : 
                messageType === 'error' ? '#fecaca' : '#bfdbfe'
              }`,
              color: messageType === 'success' ? '#166534' : 
                     messageType === 'error' ? '#991b1b' : '#1e40af'
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSetPassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                User Name
              </label>
              <input
                type="text"
                value={selectedUser?.name || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#f8fafc',
                  color: '#475569',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={selectedUser?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#f8fafc',
                  color: '#475569',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Role
              </label>
              <input
                type="text"
                value={selectedUser?.role || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: '#f8fafc',
                  color: '#475569',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Set Password *
              </label>
              <input
                id="newPassword"
                type="password"
                placeholder="Enter a password (min 6 characters)"
                required
                minLength="6"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  color: '#1a202c',
                  background: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fafafa';
                }}
              />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Password must be at least 6 characters
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: loading ? '#94a3b8' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = '#059669';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = '#10b981';
                }}
              >
                {loading ? 'Setting Password...' : '✅ Set Password & Create Login'}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              {user?.name} ({user?.role})
            </span>
            <span style={{
              fontSize: '11px',
              color: '#f59e0b'
            }}>
              {usersWithoutAuth.length} users need passwords
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular registration form
  return (
    <div className="register-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e293b',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: '500',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideDown 0.4s ease-out',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          {toastMessage}
          <button
            onClick={() => setShowToast(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 0 0 12px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
          >
            ✕
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        background: 'white',
        padding: '40px 36px',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        overflowX: 'visible',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'sticky',
            top: '0',
            right: '0',
            float: 'right',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#475569'; }}
          onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = '#94a3b8'; }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '32px' }}>👤</span>
            <h2 style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              Register New User
            </h2>
          </div>
          <p style={{
            margin: '4px 0 0 0',
            color: '#64748b',
            fontSize: '14px',
            paddingLeft: '44px'
          }}>
            Create a new team member account. A temporary password will be generated.
          </p>
        </div>

        {/* Error/Info Message */}
        {message && !showSuccess && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            background: messageType === 'error' ? '#fef2f2' : '#eff6ff',
            border: `1px solid ${messageType === 'error' ? '#fecaca' : '#bfdbfe'}`,
            color: messageType === 'error' ? '#991b1b' : '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{messageType === 'error' ? '❌' : 'ℹ️'}</span>
            {message}
          </div>
        )}

        {/* SUCCESS SECTION */}
        {showSuccess && tempPassword && (
          <div style={{
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '2px solid #86efac',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '20px' }}>
              User Registered Successfully!
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '6px 16px',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.7)',
              padding: '12px 16px',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#475569', fontWeight: '500' }}>Name:</span>
              <span style={{ color: '#0f172a', fontWeight: '600' }}>{registeredUser?.name || formData.name}</span>
              <span style={{ color: '#475569', fontWeight: '500' }}>Email:</span>
              <span style={{ color: '#0f172a', fontWeight: '600' }}>{registeredUser?.email || formData.email}</span>
            </div>
            
            <div style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '16px',
              border: '1px solid #bbf7d0'
            }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569' }}>
                🔑 Temporary Password
              </p>
              <code style={{
                display: 'block',
                fontSize: '22px',
                fontWeight: '700',
                color: '#0f172a',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: '6px',
                letterSpacing: '1px',
                fontFamily: 'monospace'
              }}>
                {tempPassword}
              </code>
            </div>

            <button
              onClick={copyToClipboard}
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.background = '#2563eb'}
            >
              📋 Copy Password
            </button>

            <div style={{
              marginTop: '14px',
              padding: '8px 14px',
              background: '#fef3c7',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center'
            }}>
              ⚠️ Share this password with the user. They should change it after their first login.
            </div>
          </div>
        )}

        {/* Form */}
        {!showSuccess && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  color: '#1a202c',
                  background: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  color: '#1a202c',
                  background: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fafafa';
                }}
              />
            </div>

            <div style={{ marginBottom: '18px', position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Role <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '40px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: formData.role ? '#fff' : '#fafafa',
                    color: formData.role ? '#1a202c' : '#94a3b8',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    appearance: 'auto',
                    WebkitAppearance: 'auto',
                    MozAppearance: 'auto',
                    cursor: 'pointer',
                    minHeight: '48px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    e.target.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                    if (!formData.role) e.target.style.background = '#fafafa';
                  }}
                >
                  <option value="">Select Role</option>
                  <option value="panelist">Panelist</option>
                  <option value="assignment_team">Assignment Team</option>
                  <option value="scheduling_team">Scheduling Team</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '6px'
              }}>
                Team <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.team}
                  onChange={(e) => setFormData({...formData, team: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '40px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: formData.team ? '#fff' : '#fafafa',
                    color: formData.team ? '#1a202c' : '#94a3b8',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    appearance: 'auto',
                    WebkitAppearance: 'auto',
                    MozAppearance: 'auto',
                    cursor: 'pointer',
                    minHeight: '48px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    e.target.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                    if (!formData.team) e.target.style.background = '#fafafa';
                  }}
                >
                  <option value="">Select Team</option>
                  <option value="panel_r1">Panel R1</option>
                  <option value="panel_r2">Panel R2</option>
                  <option value="assignment">Assignment</option>
                  <option value="scheduling">Scheduling</option>
                </select>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; e.target.style.color = '#1e293b'; }}
                onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#475569'; }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px 20px',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Registering...
                  </span>
                ) : 'Register User'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981'
            }} />
            {user?.name} ({user?.role})
          </span>
          <span style={{
            fontSize: '12px',
            color: '#10b981',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ✓ Can register users
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterUser;