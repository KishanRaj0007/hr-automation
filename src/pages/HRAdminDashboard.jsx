// src/pages/HRAdminDashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegisterUser from '../components/RegisterUser';
import ChangePasswordModal from '../components/ChangePasswordModal';

function HRAdminDashboard() {
  const navigate = useNavigate();
  const { user, userName, userRole, canRegisterUsers, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  
  const [metrics, setMetrics] = useState({ 
    total: 0, 
    applied: 0, 
    assignment: 0, 
    interview: 0, 
    selected: 0, 
    rejected: 0, 
    'on hold': 0, 
    probation: 0, 
    'onboarding done': 0, 
    'internship discontinued': 0,
    withdrawn: 0,
    waitlist: 0,
    terminated: 0
  });

  // Color mapping for each stage (Adapted for Dark Mode)
  const stageColors = {
    'Applied': '#94a3b8',
    'Assignment': '#fbbf24',
    'Interview': '#c084fc',
    'On Hold': '#fcd34d',
    'Selected': '#818cf8',
    'Probation': '#60a5fa',
    'Onboarding Done': '#34d399',
    'Waitlist': '#a78bfa',
    'Withdrawn': '#a78bfa',
    'Internship Discontinued': '#fb923c',
    'Terminated': '#f87171',
    'Rejected': '#f87171'
  };

  useEffect(() => {
    // Check if user is logged in
    const storedEmail = localStorage.getItem('hrEmail');
    if (!storedEmail && !user) {
      navigate('/hr-login');
      return;
    }
    
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = data || [];
      setCandidates(list);

      const counts = { 
        total: list.length, 
        applied: 0, 
        assignment: 0, 
        interview: 0, 
        selected: 0, 
        rejected: 0, 
        'on hold': 0, 
        probation: 0, 
        'onboarding done': 0, 
        'internship discontinued': 0,
        withdrawn: 0,
        waitlist: 0,
        terminated: 0
      };

      list.forEach(c => {
        const stage = c.current_stage?.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(counts, stage)) {
          counts[stage]++;
        }
      });
      setMetrics(counts);
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCandidates = candidates.filter((candidate) => {
    const nameMatch = (candidate.name || candidate.full_name || '').toLowerCase().includes(search.toLowerCase());
    const domainMatch = domainFilter === '' || candidate.domain === domainFilter;
    const stageMatch = stageFilter === '' || candidate.current_stage === stageFilter;
    return nameMatch && domainMatch && stageMatch;
  });

  const uniqueDomains = [...new Set(candidates.map(c => c.domain).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const handleLogout = async () => {
    await logout();
    navigate('/hr-login');
  };

  const handleRegistrationSuccess = (newUser) => {
    setRegistrationSuccess(`✅ ${newUser.name} registered successfully!`);
    setTimeout(() => setRegistrationSuccess(null), 5000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // KPI Data - WITHOUT TOTAL
  const kpiData = [
    { label: 'APPLIED', count: metrics.applied, color: '#94a3b8', filterValue: 'Applied' },
    { label: 'ASSIGNMENT', count: metrics.assignment, color: '#fbbf24', filterValue: 'Assignment' },
    { label: 'INTERVIEW', count: metrics.interview, color: '#c084fc', filterValue: 'Interview' },
    { label: 'ON HOLD', count: metrics['on hold'], color: '#fcd34d', filterValue: 'On Hold' },
    { label: 'SELECTED', count: metrics.selected, color: '#818cf8', filterValue: 'Selected' },
    { label: 'PROBATION', count: metrics.probation, color: '#60a5fa', filterValue: 'Probation' },
    { label: 'ONBOARDING', count: metrics['onboarding done'], color: '#34d399', filterValue: 'Onboarding Done' },
    { label: 'WAITLIST', count: metrics.waitlist, color: '#a78bfa', filterValue: 'Waitlist' },
    { label: 'WITHDRAWN', count: metrics.withdrawn, color: '#a78bfa', filterValue: 'Withdrawn' },
    { label: 'DISCONTINUED', count: metrics['internship discontinued'], color: '#fb923c', filterValue: 'Internship Discontinued' },
    { label: 'TERMINATED', count: metrics.terminated, color: '#f87171', filterValue: 'Terminated' },
    { label: 'REJECTED', count: metrics.rejected, color: '#f87171', filterValue: 'Rejected' }
  ];

  // Get user name from AuthContext
  const displayName = userName || user?.name || localStorage.getItem('userName') || 'HR User';
  const displayRole = userRole || localStorage.getItem('userRole') || 'team_member';

  // Common input styling
  const inputStyle = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s'
  };

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ minHeight: '100vh', padding: '40px 60px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: 'relative', zIndex: 1 }}>
        
        {/* ===== NAVIGATION BAR ===== */}
        <div className="glass-panel animate-fade-up" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          padding: '16px 24px',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: window.location.pathname === '/' ? '1px solid var(--primary)' : '1px solid transparent',
                background: window.location.pathname === '/' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: window.location.pathname === '/' ? '#60a5fa' : 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => navigate('/analytics')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: window.location.pathname === '/analytics' ? '1px solid var(--primary)' : '1px solid transparent',
                background: window.location.pathname === '/analytics' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: window.location.pathname === '/analytics' ? '#60a5fa' : 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              📈 Analytics
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* User Info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '6px 16px 6px 6px',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {displayRole.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canRegisterUsers() && (
              <button onClick={() => setShowRegisterModal(true)} className="btn-premium" style={{ padding: '10px 20px', fontSize: '13px' }}>
                ➕ Register User
              </button>
            )}

            <button onClick={() => setShowChangePassword(true)} className="btn-glass" style={{ padding: '10px 20px', fontSize: '13px' }}>
              🔑 Password
            </button>

            <button onClick={handleLogout} className="btn-glass" style={{ padding: '10px 20px', fontSize: '13px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Registration Success Message */}
        {registrationSuccess && (
          <div className="animate-fade-up" style={{
            padding: '16px 24px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#6ee7b7',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            {registrationSuccess}
          </div>
        )}

        <h1 className="animate-fade-up delay-100" style={{ color: '#fff', marginBottom: '40px', fontWeight: '800', fontSize: '48px', letterSpacing: '-1px' }}>
          Workspace Overview
        </h1>
        
        {/* KPI Cards */}
        <div className="animate-fade-up delay-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {kpiData.map(m => (
            <div 
              key={m.label} 
              onClick={() => setStageFilter(m.filterValue)} 
              style={{ 
                background: stageFilter === m.filterValue ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                padding: '20px 16px', 
                borderRadius: '16px', 
                border: '1px solid var(--glass-border)',
                borderTop: `4px solid ${m.color}`, 
                cursor: 'pointer', 
                textAlign: 'center',
                transform: stageFilter === m.filterValue ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(16px)',
                boxShadow: stageFilter === m.filterValue ? `0 10px 30px ${m.color}20` : 'none'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>{m.label}</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: stageFilter === m.filterValue ? m.color : '#fff' }}>{m.count}</div>
            </div>
          ))}
        </div>

        {/* Filter Row */}
        <div className="glass-panel animate-fade-up delay-300" style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '30px', 
          flexWrap: 'nowrap', 
          alignItems: 'center',
          padding: '16px 24px',
        }}>
          {/* Search */}
          <input 
            type="text" 
            placeholder="Search candidate..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
          
          {/* All Domains Dropdown */}
          <select 
            value={domainFilter} 
            onChange={(e) => setDomainFilter(e.target.value)} 
            style={{ ...inputStyle, minWidth: '180px', cursor: 'pointer' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          >
            <option value="" style={{ color: '#000' }}>All Domains</option>
            {uniqueDomains.map(d => <option key={d} value={d} style={{ color: '#000' }}>{d}</option>)}
          </select>

          {/* Total Button */}
          <button
            onClick={() => setStageFilter('')}
            className={stageFilter === '' ? 'btn-premium' : 'btn-glass'}
            style={{ padding: '10px 24px', minWidth: '120px' }}
          >
            Total ({metrics.total})
          </button>

          {/* View All Questions Button */}
          <button 
            onClick={() => navigate('/questions')}
            className="btn-premium"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', padding: '10px 24px' }}
          >
            💬 Support Hub
          </button>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchDashboardData()}
            className="btn-glass"
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sync Data"
          >
            🔄
          </button>
        </div>

        {/* Table */}
        <div className="glass-panel animate-fade-up delay-300" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Name</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Domain</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Stage</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                    No candidates found matching current parameters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const stage = c.current_stage || '';
                  const stageKey = stage === 'Internship Discontinued' ? 'Internship Discontinued' : stage;
                  
                  const nameColor = stageColors[stageKey] || '#60a5fa';
                  const isFiltered = stageFilter === stage;
                  
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => navigate(`/candidate/${c.id}`)} 
                      style={{ 
                        borderBottom: '1px solid var(--glass-border)', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                        backgroundColor: isFiltered ? 'rgba(255,255,255,0.04)' : 'transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isFiltered ? 'rgba(255,255,255,0.04)' : 'transparent'; }}
                    >
                      <td style={{ padding: '20px 24px', fontWeight: '600', color: '#fff', fontSize: '15px' }}>
                        {c.name || c.full_name}
                      </td>
                      <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>{c.domain}</td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          background: `rgba(${parseInt(nameColor.slice(1,3),16)}, ${parseInt(nameColor.slice(3,5),16)}, ${parseInt(nameColor.slice(5,7),16)}, 0.15)`,
                          color: nameColor,
                          border: `1px solid rgba(${parseInt(nameColor.slice(1,3),16)}, ${parseInt(nameColor.slice(3,5),16)}, ${parseInt(nameColor.slice(5,7),16)}, 0.3)`
                        }}>
                          {c.current_stage}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>{c.source}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modals remain structurally identical, ensuring backend logic isn't broken */}
        {showRegisterModal && (
          <RegisterUser 
            onClose={() => setShowRegisterModal(false)}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </>
  );
}

export default HRAdminDashboard;