// components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const ChangePasswordModal = ({ onClose }) => {
  const { hrUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('❌ Please fill in all fields');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('❌ New passwords do not match!');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('❌ Password must be at least 6 characters!');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setMessage('❌ New password must be different from current password!');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      // First, verify current password by trying to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: hrUser?.email,
        password: currentPassword
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log to audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'hr_users',
          record_id: hrUser?.id,
          action: 'password_change',
          new_data: {
            user_name: hrUser?.name,
            user_email: hrUser?.email,
            changed_at: new Date().toISOString()
          },
          performed_by: hrUser?.email
        });

      setMessage('✅ Password changed successfully! Please login again.');
      setMessageType('success');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after 3 seconds
      setTimeout(() => {
        // Logout user to force re-login with new password
        supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/hr-login';
      }, 3000);

    } catch (error) {
      setMessage('❌ ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="password-modal" style={{
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
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '12px',
        maxWidth: '440px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'slideIn 0.3s ease'
      }}>
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Close button */}
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

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔑</div>
          <h2 style={{ margin: '0', color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>
            Change Password
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Update your password to something only you know
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            background: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
            borderLeft: `4px solid ${messageType === 'success' ? '#22c55e' : '#ef4444'}`,
            color: messageType === 'success' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{messageType === 'success' ? '✅' : '❌'}</span>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: '45px',
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
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  fontSize: '18px'
                }}
              >
                {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength="6"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: '45px',
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
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  fontSize: '18px'
                }}
              >
                {showNewPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Password must be at least 6 characters
            </div>
          </div>

          {/* Confirm New Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '4px'
            }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: '45px',
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
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  fontSize: '18px'
                }}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && newPassword.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                gap: '4px',
                height: '4px',
                marginBottom: '4px'
              }}>
                <div style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: '2px',
                  background: newPassword.length >= 6 ? '#22c55e' : '#e2e8f0'
                }} />
                <div style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: '2px',
                  background: newPassword.length >= 8 ? '#22c55e' : '#e2e8f0'
                }} />
                <div style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: '2px',
                  background: newPassword.length >= 10 ? '#22c55e' : '#e2e8f0'
                }} />
                <div style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: '2px',
                  background: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#22c55e' : '#e2e8f0'
                }} />
              </div>
              <div style={{
                fontSize: '11px',
                color: newPassword.length >= 6 ? '#22c55e' : '#94a3b8'
              }}>
                {newPassword.length < 6 ? 'Too short' : 
                 newPassword.length < 8 ? 'Weak' :
                 newPassword.length < 10 ? 'Medium' : 'Strong'}
              </div>
            </div>
          )}

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                background: loading ? '#94a3b8' : '#3b82f6',
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
                if (!loading) e.target.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#3b82f6';
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            For security, you'll be logged out after changing your password
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;