import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

function HRAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  
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

  // Color mapping for each stage
  const stageColors = {
    'Applied': '#4b5563',
    'Assignment': '#f59e0b',
    'Interview': '#a855f7',
    'On Hold': '#fbbf24',
    'Selected': '#6366f1',
    'Probation': '#3b82f6',
    'Onboarding Done': '#10b981',
    'Waitlist': '#8b5cf6',
    'Withdrawn': '#8b5cf6',
    'Internship Discontinued': '#f97316',
    'Terminated': '#dc2626',
    'Rejected': '#ef4444'
  };

  // Background color for each stage when filtered
  const stageBgColors = {
    'Applied': '#f8fafc',
    'Assignment': '#fffbeb',
    'Interview': '#f5f3ff',
    'On Hold': '#fffbeb',
    'Selected': '#eff6ff',
    'Probation': '#eff6ff',
    'Onboarding Done': '#f0fdf4',
    'Waitlist': '#f5f3ff',
    'Withdrawn': '#f5f3ff',
    'Internship Discontinued': '#fffbeb',
    'Terminated': '#fef2f2',
    'Rejected': '#fef2f2'
  };

  useEffect(() => {
    fetchDashboardData();
    
    // ===== FIX: Auto-recover user name if missing =====
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('hrEmail');
    
    console.log('🔄 Dashboard mounted, checking session:', { storedName, storedEmail });
    
    // If no name but email exists, recover from email
    if ((!storedName || storedName === 'null' || storedName === 'undefined' || storedName === '') && storedEmail) {
      const recoveredName = storedEmail.split('@')[0];
      console.log('🔄 Auto-recovering name from email:', recoveredName);
      localStorage.setItem('userName', recoveredName);
      // Force re-render
      setLoading(false);
    }
    
    // If no session at all, redirect to login
    if (!storedEmail) {
      console.log('⚠️ No session found, redirecting to login');
      navigate('/hr-login');
    }
    // ===== END FIX =====
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

  if (loading) return <h3 style={{ padding: '30px', fontFamily: 'sans-serif', color: '#334155' }}>Loading Funnel Workspace...</h3>;

  // KPI Data - WITHOUT TOTAL
  const kpiData = [
    { label: 'APPLIED', count: metrics.applied, color: '#4b5563', filterValue: 'Applied' },
    { label: 'ASSIGNMENT', count: metrics.assignment, color: '#f59e0b', filterValue: 'Assignment' },
    { label: 'INTERVIEW', count: metrics.interview, color: '#a855f7', filterValue: 'Interview' },
    { label: 'ON HOLD', count: metrics['on hold'], color: '#fbbf24', filterValue: 'On Hold' },
    { label: 'SELECTED', count: metrics.selected, color: '#6366f1', filterValue: 'Selected' },
    { label: 'PROBATION', count: metrics.probation, color: '#3b82f6', filterValue: 'Probation' },
    { label: 'ONBOARDING', count: metrics['onboarding done'], color: '#10b981', filterValue: 'Onboarding Done' },
    { label: 'WAITLIST', count: metrics.waitlist, color: '#8b5cf6', filterValue: 'Waitlist' },
    { label: 'WITHDRAWN', count: metrics.withdrawn, color: '#8b5cf6', filterValue: 'Withdrawn' },
    { label: 'INTERNSHIP DISCONTINUED', count: metrics['internship discontinued'], color: '#f97316', filterValue: 'Internship Discontinued' },
    { label: 'TERMINATED', count: metrics.terminated, color: '#dc2626', filterValue: 'Terminated' },
    { label: 'REJECTED', count: metrics.rejected, color: '#ef4444', filterValue: 'Rejected' }
  ];

  // Get user name with proper fallbacks - RECOVERY VERSION
  const getUserName = () => {
    let name = localStorage.getItem('userName');
    const email = localStorage.getItem('hrEmail');
    
    // If name is null/undefined/empty, try to recover from email
    if (!name || name === 'null' || name === 'undefined' || name === '') {
      if (email) {
        name = email.split('@')[0];
        // Save it back for next time
        localStorage.setItem('userName', name);
        console.log('🔄 Recovered name from email:', name);
      } else {
        return 'HR User';
      }
    }
    return name;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfcfd', padding: '40px 60px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* ===== NAVIGATION BAR ===== */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '12px 20px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: window.location.pathname === '/' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: window.location.pathname === '/' ? '#eff6ff' : '#fff',
              color: window.location.pathname === '/' ? '#1d4ed8' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (window.location.pathname !== '/') {
                e.target.style.background = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (window.location.pathname !== '/') {
                e.target.style.background = '#fff';
              }
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: window.location.pathname === '/analytics' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: window.location.pathname === '/analytics' ? '#eff6ff' : '#fff',
              color: window.location.pathname === '/analytics' ? '#1d4ed8' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (window.location.pathname !== '/analytics') {
                e.target.style.background = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (window.location.pathname !== '/analytics') {
                e.target.style.background = '#fff';
              }
            }}
          >
            📈 Analytics
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            👤 {getUserName()}
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('hrEmail');
              localStorage.removeItem('userRole');
              localStorage.removeItem('userName');
              localStorage.removeItem('userTeam');
              localStorage.removeItem('panelistName');
              navigate('/hr-login');
            }}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            Logout
          </button>
        </div>
      </div>

      <h1 style={{ color: '#0f1e36', marginBottom: '30px', fontWeight: '800', fontSize: '56px', textAlign: 'center', letterSpacing: '-1px', lineHeight: '1.2' }}>
        HR Funnel Dashboard
      </h1>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '30px' }}>
        {kpiData.map(m => (
          <div 
            key={m.label} 
            onClick={() => setStageFilter(m.filterValue)} 
            style={{ 
              background: '#fff', 
              padding: '18px 12px', 
              borderRadius: '16px', 
              boxShadow: stageFilter === m.filterValue ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 4px 20px rgba(0, 0, 0, 0.02)', 
              borderTop: `4px solid ${m.color}`, 
              cursor: 'pointer', 
              textAlign: 'center',
              transform: stageFilter === m.filterValue ? 'scale(1.03)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderLeft: '1px solid #f3f4f6', 
              borderRight: '1px solid #f3f4f6', 
              borderBottom: '1px solid #f3f4f6',
              position: 'relative',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>{m.count}</div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '30px', 
        flexWrap: 'nowrap', 
        alignItems: 'center',
        background: '#fff',
        padding: '8px 16px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Search */}
        <input 
          type="text" 
          placeholder="Search candidate..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ 
            padding: '10px 16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb', 
            background: '#f8fafc', 
            color: '#1e293b', 
            flex: 1,
            minWidth: '180px',
            fontSize: '14px', 
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
        
        {/* All Domains Dropdown */}
        <select 
          value={domainFilter} 
          onChange={(e) => setDomainFilter(e.target.value)} 
          style={{ 
            padding: '10px 16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb', 
            fontSize: '14px', 
            background: '#f8fafc', 
            color: '#1e293b', 
            minWidth: '160px',
            outline: 'none', 
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">All Domains</option>
          {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Total Button */}
        <button
          onClick={() => setStageFilter('')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: stageFilter === '' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            background: stageFilter === '' ? '#eff6ff' : '#f8fafc',
            color: stageFilter === '' ? '#1d4ed8' : '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            minWidth: '100px'
          }}
        >
          Total ({metrics.total})
        </button>

        {/* View All Questions Button */}
        <button 
          onClick={() => navigate('/questions')}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            background: '#8b5cf6', 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#7c3aed'; }}
          onMouseLeave={(e) => { e.target.style.background = '#8b5cf6'; }}
        >
          💬 View All Questions
        </button>

        {/* Refresh Button */}
        <button 
          onClick={() => fetchDashboardData()}
          style={{ 
            padding: '10px 14px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            background: '#f8fafc', 
            color: '#475569', 
            fontSize: '18px', 
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; }}
          onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; }}
          title="Refresh Data"
        >
          🔄
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfe' }}>
              <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Name</th>
              <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Domain</th>
              <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Stage</th>
              <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>No candidates found matching current workspace filters.</td>
              </tr>
            ) : (
              filteredCandidates.map((c) => {
                const stage = c.current_stage || '';
                const stageKey = stage === 'Internship Discontinued' ? 'Internship Discontinued' : stage;
                
                const nameColor = stageColors[stageKey] || '#1d4ed8';
                const bgColor = stageFilter === stage ? stageBgColors[stageKey] || '#f8fafc' : 'transparent';
                const hoverBg = stageFilter === stage ? (stageBgColors[stageKey] || '#f8fafc') : '#f8fafc';
                
                let badgeBg = '#e4eaf2';
                let badgeColor = '#2d3748';
                if (stageFilter === stage) {
                  badgeBg = stageBgColors[stageKey] || '#e4eaf2';
                  badgeColor = stageColors[stageKey] || '#2d3748';
                }
                
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/candidate/${c.id}`)} 
                    style={{ 
                      borderBottom: '1px solid #f8fafc', 
                      cursor: 'pointer', 
                      transition: 'background-color 0.15s ease',
                      backgroundColor: bgColor
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = bgColor}
                  >
                    <td style={{ padding: '20px 24px', fontWeight: '600', color: nameColor, fontSize: '16px' }}>
                      {c.name || c.full_name}
                    </td>
                    <td style={{ padding: '20px 24px', color: '#4a5568', fontSize: '16px' }}>{c.domain}</td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ 
                        padding: '6px 14px', 
                        borderRadius: '12px', 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        background: stageFilter === stage ? badgeBg : '#e4eaf2',
                        color: stageFilter === stage ? badgeColor : '#2d3748' 
                      }}>
                        {c.current_stage}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: '#718096', fontSize: '16px' }}>{c.source}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default HRAdminDashboard;