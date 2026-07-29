// src/components/RegisterUser.jsx
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

  useEffect(() => {
    checkUsersWithoutAuth();
  }, []);

  async function checkUsersWithoutAuth() {
    try {
      const { data: hrUsers, error: hrError } = await supabase.from('hr_users').select('*').eq('is_active', true);
      if (hrError) throw hrError;
      const authEmails = [];
      try {
        const { data: authData, error: authError } = await supabase.from('users').select('email');
        if (!authError && authData) { authData.forEach(u => { if (u.email) authEmails.push(u.email); }); }
      } catch (e) { console.log('⚠️ Cannot fetch auth users directly.'); }

      if (authEmails.length === 0) return;

      const missing = hrUsers.filter(u => !authEmails.includes(u.email));
      setUsersWithoutAuth(missing);
      
      if (missing.length > 0) {
        setMode('set_password');
        setSelectedUser(missing[0]);
      }
    } catch (error) { console.error('Error checking users:', error); }
  }

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '8px' };

  if (!canRegisterUsers()) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div className="glass-panel animate-fade-up" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ color: '#fca5a5', margin: '0 0 12px 0', fontSize: '22px', fontWeight: '800' }}>Clearance Denied</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 30px 0', fontSize: '15px', lineHeight: '1.6' }}>You lack administrative privileges to provision new HR nodes. Ensure you have Lead or Project Manager clearance.</p>
          <button onClick={onClose} className="btn-glass" style={{ width: '100%' }}>Close Override</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(''); setTempPassword(''); setMessageType('info'); setShowSuccess(false);

    if (!formData.role || !formData.team) {
      setMessage('Please select both Role and Team clearance'); setMessageType('error'); setLoading(false); return;
    }

    try {
      const result = await registerUser(formData);
      if (result.success) {
        setTempPassword(result.tempPassword); setMessageType('success'); setShowSuccess(true); setRegisteredUser(result.user);
        setFormData({ email: '', name: '', role: '', team: '' });
        if (onSuccess) { onSuccess(result.user); }
      } else {
        setMessage(result.error || 'Provisioning failed'); setMessageType('error');
      }
    } catch (error) {
      setMessage(error.message || 'Provisioning failed'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(''); setMessageType('info');
    try {
      if (!selectedUser) throw new Error('No node selected');
      const password = document.getElementById('newPassword').value;
      if (!password || password.length < 6) throw new Error('Encryption key must be >= 6 chars');

      const { data: authData, error: authError } = await supabase.auth.signUp({ email: selectedUser.email, password: password, options: { data: { name: selectedUser.name, role: selectedUser.role } } });
      if (authError) throw new Error('Failed to mint auth key: ' + authError.message);

      await supabase.from('hr_users').update({ id: authData.user.id }).eq('email', selectedUser.email);
      await supabase.from('audit_logs').insert({ table_name: 'hr_users', record_id: authData.user.id, action: 'set_password', new_data: { email: selectedUser.email, name: selectedUser.name, set_by: user?.email || 'system' }, performed_by: user?.email || 'system' });

      setMessage(`✅ Auth key minted for ${selectedUser.name}! Node active.`); setMessageType('success');
      setUsersWithoutAuth(prev => prev.filter(u => u.email !== selectedUser.email));
      
      const remaining = usersWithoutAuth.filter(u => u.email !== selectedUser.email);
      if (remaining.length > 0) { setSelectedUser(remaining[0]); } 
      else { setSelectedUser(null); setMode('register'); setMessage(''); }
    } catch (error) {
      setMessage(error.message || 'Minting failed'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    if (tempPassword) { navigator.clipboard.writeText(tempPassword); setToastMessage('✅ Decryption key copied!'); setShowToast(true); }
  };

  const ModalWrapper = ({ children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      {showToast && (
        <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#6ee7b7', padding: '14px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          {toastMessage}
        </div>
      )}
      <div className="glass-panel animate-fade-up" style={{ padding: '40px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} className="btn-glass" style={{ position: 'absolute', top: '20px', right: '20px', padding: '6px 12px' }}>✕</button>
        {children}
      </div>
    </div>
  );

  if (mode === 'set_password' && usersWithoutAuth.length > 0 && selectedUser) {
    return (
      <ModalWrapper>
        <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '24px', fontWeight: '800' }}>🔑 Mount Auth Key</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>This node exists in the ledger but requires an active authentication key to connect.</p>
        
        {message && <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '24px', background: messageType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${messageType === 'success' ? '#10b981' : '#ef4444'}`, color: messageType === 'success' ? '#6ee7b7' : '#fca5a5', fontSize: '14px' }}>{message}</div>}

        <form onSubmit={handleSetPassword}>
          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Target Node</label><input type="text" value={selectedUser?.name || ''} disabled style={{...inputStyle, opacity: 0.7}} /></div>
          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Identifier (Email)</label><input type="email" value={selectedUser?.email || ''} disabled style={{...inputStyle, opacity: 0.7}} /></div>
          <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Clearance Role</label><input type="text" value={selectedUser?.role || ''} disabled style={{...inputStyle, opacity: 0.7}} /></div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Mint Password *</label>
            <input id="newPassword" type="password" placeholder="Min 6 characters" required minLength="6" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-glass" style={{ flex: 1 }}>Skip for Now</button>
            <button type="submit" disabled={loading} className="btn-premium" style={{ flex: 2 }}>{loading ? 'Minting...' : '✅ Commit & Activate Node'}</button>
          </div>
        </form>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper>
      {!showSuccess && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '24px', fontWeight: '800' }}>👤 Provision HR Node</h2>
          <p style={{ margin: '0', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>Initialize a new team member into the central workspace. A secure key will be generated.</p>
        </div>
      )}

      {message && !showSuccess && (
        <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '24px', background: messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${messageType === 'error' ? '#ef4444' : '#3b82f6'}`, color: messageType === 'error' ? '#fca5a5' : '#93c5fd', fontSize: '14px' }}>{message}</div>
      )}

      {showSuccess && tempPassword && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ margin: '0 0 24px 0', color: '#34d399', fontSize: '22px', fontWeight: '800' }}>Node Successfully Provisioned!</h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px 16px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Name:</span><span style={{ color: '#fff', fontWeight: '600' }}>{registeredUser?.name || formData.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>Email:</span><span style={{ color: '#fff', fontWeight: '600' }}>{registeredUser?.email || formData.email}</span>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Decryption Key (Temp)</p>
            <code style={{ display: 'block', fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '2px' }}>{tempPassword}</code>
          </div>
          <button onClick={copyToClipboard} className="btn-premium" style={{ width: '100%', marginBottom: '16px' }}>📋 Copy Credentials to Clipboard</button>
          <p style={{ color: '#fbbf24', fontSize: '13px', margin: 0 }}>⚠️ Deliver this key securely. The node will enforce a password rotation upon first connection.</p>
        </div>
      )}

      {!showSuccess && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Full Name *</label><input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={inputStyle} /></div>
          <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Organizational Email *</label><input type="email" placeholder="john@jarurat.care" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={inputStyle} /></div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Clearance Role *</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required style={{...inputStyle, color: '#000'}}>
              <option value="">Select Protocol</option>
              <option value="panelist">Panel Evaluator</option>
              <option value="assignment_team">Assignment Controller</option>
              <option value="scheduling_team">Scheduler Node</option>
            </select>
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Department Vector *</label>
            <select value={formData.team} onChange={(e) => setFormData({...formData, team: e.target.value})} required style={{...inputStyle, color: '#000'}}>
              <option value="">Assign Vector</option>
              <option value="panel_r1">Panel R1</option>
              <option value="panel_r2">Panel R2</option>
              <option value="assignment">Assignment Hub</option>
              <option value="scheduling">Scheduling Core</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-glass" style={{ flex: 1 }}>Abort</button>
            <button type="submit" disabled={loading} className="btn-premium" style={{ flex: 2 }}>{loading ? 'Compiling...' : 'Execute Provisioning'}</button>
          </div>
        </form>
      )}
    </ModalWrapper>
  );
};

export default RegisterUser;