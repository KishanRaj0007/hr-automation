// components/RegisterUser.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const RegisterUser = ({ onClose, onSuccess }) => {
  const { canRegisterUsers, registerUser, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'panelist',
    team: 'panel_r1'
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

      // Get auth users using a different approach
      // Since admin.listUsers might need service role, let's try a different method
      const authEmails = [];
      
      // Try to get auth users via the users table
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

      // If we couldn't get auth users, just show the regular registration form
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

  // Only show if user can register
  if (!canRegisterUsers()) {
    return (
      <div className="register-modal" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Access Denied</h3>
          <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>
            You don't have permission to manage users.
            <br />
            <small style={{ color: '#94a3b8' }}>
              Only HR Lead and Project Manager can manage users.
            </small>
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
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

    try {
      const result = await registerUser(formData);
      
      if (result.success) {
        setMessage(result.message);
        setTempPassword(result.tempPassword);
        setMessageType('success');
        setShowSuccess(true);
        setRegisteredUser(result.user);
        
        // Reset form fields
        setFormData({
          email: '',
          name: '',
          role: 'panelist',
          team: 'panel_r1'
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

      // Create auth user for existing hr_user
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

      // Update hr_user with the auth user ID
      await supabase
        .from('hr_users')
        .update({ id: authData.user.id })
        .eq('email', selectedUser.email);

      // Log to audit_logs
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
      
      // Remove from list
      setUsersWithoutAuth(prev => prev.filter(u => u.email !== selectedUser.email));
      
      // If there are more users, select the next one
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
      setMessage('✅ Password copied to clipboard!');
      setMessageType('info');
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
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
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
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              background: messageType === 'success' ? '#f0fdf4' : 
                        messageType === 'error' ? '#fef2f2' : '#eff6ff',
              borderLeft: `4px solid ${
                messageType === 'success' ? '#22c55e' : 
                messageType === 'error' ? '#ef4444' : '#3b82f6'
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
                marginBottom: '4px'
              }}>
                User Name
              </label>
              <input
                type="text"
                value={selectedUser?.name || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#f1f5f9',
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
                marginBottom: '4px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={selectedUser?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#f1f5f9',
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
                marginBottom: '4px'
              }}>
                Role
              </label>
              <input
                type="text"
                value={selectedUser?.role || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#f1f5f9',
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
                marginBottom: '4px'
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
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
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
                  borderRadius: '6px',
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
                  borderRadius: '6px',
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
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '12px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          ✕
        </button>

        <h2 style={{
          margin: '0 0 8px 0',
          color: '#1e293b',
          fontSize: '24px',
          fontWeight: '700'
        }}>
          Register New User
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          color: '#64748b',
          fontSize: '14px'
        }}>
          Create a new team member account. A temporary password will be generated.
        </p>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            background: messageType === 'success' ? '#f0fdf4' : 
                      messageType === 'error' ? '#fef2f2' : '#eff6ff',
            borderLeft: `4px solid ${
              messageType === 'success' ? '#22c55e' : 
              messageType === 'error' ? '#ef4444' : '#3b82f6'
            }`,
            color: messageType === 'success' ? '#166534' : 
                   messageType === 'error' ? '#991b1b' : '#1e40af'
          }}>
            {message}
          </div>
        )}

        {/* SUCCESS SECTION - Shows until user closes the modal */}
        {showSuccess && tempPassword && (
          <div style={{
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: '#f0fdf4',
            border: '2px solid #22c55e',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#166534' }}>
              User Registered Successfully!
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '14px' }}>
              <strong>Name:</strong> {registeredUser?.name || formData.name}
            </p>
            <p style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '14px' }}>
              <strong>Email:</strong> {registeredUser?.email || formData.email}
            </p>
            
            <div style={{
              background: '#f1f5f9',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>
                <strong>Temporary Password:</strong>
              </p>
              <code style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
                padding: '8px',
                background: 'white',
                borderRadius: '4px',
                letterSpacing: '1px'
              }}>
                {tempPassword}
              </code>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '8px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📋 Copy Password
              </button>
            </div>

            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#fef3c7',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#92400e'
            }}>
              ⚠️ <strong>Important:</strong> Share this password with the user. 
              They should change it after their first login.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                background: 'white',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="panelist">Panelist</option>
              <option value="assignment_team">Assignment Team</option>
              <option value="scheduling_team">Scheduling Team</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Team *
            </label>
            <select
              value={formData.team}
              onChange={(e) => setFormData({...formData, team: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                background: 'white',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="panel_r1">Panel R1</option>
              <option value="panel_r2">Panel R2</option>
              <option value="assignment">Assignment</option>
              <option value="scheduling">Scheduling</option>
            </select>
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
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
            >
              {showSuccess ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || showSuccess}
              style={{
                flex: 2,
                padding: '12px',
                background: loading || showSuccess ? '#94a3b8' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || showSuccess ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: loading || showSuccess ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && !showSuccess) e.target.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!loading && !showSuccess) e.target.style.background = '#3b82f6';
              }}
            >
              {loading ? 'Registering...' : showSuccess ? '✅ Registered!' : 'Register User'}
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
            color: '#10b981',
            fontWeight: '600'
          }}>
            ✓ Can register users
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterUser;