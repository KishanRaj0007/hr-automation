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
    setLoading(true); setMessage(''); setMessageType('');

    if (!currentPassword || !newPassword || !confirmPassword) { setMessage('❌ Please fill in all fields'); setMessageType('error'); setLoading(false); return; }
    if (newPassword !== confirmPassword) { setMessage('❌ Keys do not match!'); setMessageType('error'); setLoading(false); return; }
    if (newPassword.length < 6) { setMessage('❌ Entropy too low (min 6 chars)'); setMessageType('error'); setLoading(false); return; }
    if (currentPassword === newPassword) { setMessage('❌ New key must differ from current key'); setMessageType('error'); setLoading(false); return; }

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: hrUser?.email, password: currentPassword });
      if (verifyError) throw new Error('Current key verification failed');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      await supabase.from('audit_logs').insert({ table_name: 'hr_users', record_id: hrUser?.id, action: 'password_change', new_data: { user_name: hrUser?.name, user_email: hrUser?.email, changed_at: new Date().toISOString() }, performed_by: hrUser?.email });

      setMessage('✅ Security protocol updated. Re-authenticating...'); setMessageType('success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');

      setTimeout(() => {
        supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/hr-login';
      }, 3000);

    } catch (error) {
      setMessage('❌ ' + error.message); setMessageType('error');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '8px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="glass-panel animate-fade-up" style={{ padding: '40px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        
        <button onClick={onClose} className="btn-glass" style={{ position: 'absolute', top: '20px', right: '20px', padding: '6px 12px' }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '24px', fontWeight: '800' }}>Rotate Cryptographic Key</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Ensure your new key maintains high entropy to protect node access.</p>
        </div>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', background: messageType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${messageType === 'success' ? '#10b981' : '#ef4444'}`, color: messageType === 'success' ? '#6ee7b7' : '#fca5a5' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Current Master Key</label>
            <div style={{ position: 'relative' }}>
              <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{...inputStyle, paddingRight: '45px'}} />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>New Cipher Key (Min 6)</label>
            <div style={{ position: 'relative' }}>
              <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" style={{...inputStyle, paddingRight: '45px'}} />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</button>
            </div>
          </div>

          {/* Strength Indicator */}
          {newPassword && newPassword.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '8px' }}>
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 6 ? '#34d399' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 8 ? '#34d399' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: newPassword.length >= 10 ? '#34d399' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, borderRadius: '2px', background: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#34d399' : 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ fontSize: '11px', color: newPassword.length >= 6 ? '#6ee7b7' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Entropy: {newPassword.length < 6 ? 'Critical' : newPassword.length < 8 ? 'Weak' : newPassword.length < 10 ? 'Standard' : 'Fortified'}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Verify Cipher Key</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{...inputStyle, paddingRight: '45px'}} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-glass" style={{ flex: 1 }}>Abort</button>
            <button type="submit" disabled={loading} className="btn-premium" style={{ flex: 2 }}>{loading ? 'Processing...' : 'Deploy Security Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;