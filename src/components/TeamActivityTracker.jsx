// components/TeamActivityTracker.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function TeamActivityTracker() {
  const { userRole, hrUser, isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  async function fetchActivities() {
    setLoading(true);
    try {
      let query = supabase
        .from('team_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('team', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error(' Error fetching activities:', error);
      } else {
        setActivities(data || []);
      }
    } catch (error) {
      console.error(' Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const getActionIcon = (action) => {
    const icons = {
      'assignment_sent': '📝',
      'assignment_evaluated': '✅',
      'interview_scheduled': '📅',
      'interview_evaluated': '🎯',
      'status_updated': '🔄',
      'candidate_selected': '🏆',
      'candidate_rejected': '❌',
      'candidate_hold': '⏸️',
      'probation_started': '🚀',
      'probation_meeting_scheduled': '📆',
      'onboarding_completed': '🎉',
      'internship_discontinued': '⏹️',
      'candidate_terminated': '⛔',
      'candidate_withdrawn': '👋',
      'candidate_waitlisted': '⏳',
      'candidate_restored_from_waitlist': '♻️',
      'candidate_restored_from_on_hold': '▶️',
      'interview_rescheduled_by_hr': '⏱️',
      'probation_pending': '⌛',
      'candidate_force_scheduled': '⚡',
      'candidate_rejected_low_score': '📉',
      'hr_replied_to_question': '💬',
      'faq_added': '📚',
      'faq_marked_from_question': '📌',
      'test_activity': '🧪'
    };
    return icons[action] || '📌';
  };

  const getActionColor = (action) => {
    const colors = {
      'assignment_sent': '#60a5fa',
      'assignment_evaluated': '#a78bfa',
      'interview_scheduled': '#fbbf24',
      'interview_evaluated': '#34d399',
      'status_updated': '#818cf8',
      'candidate_selected': '#34d399',
      'candidate_rejected': '#f87171',
      'candidate_hold': '#fbbf24',
      'probation_started': '#60a5fa',
      'probation_meeting_scheduled': '#a78bfa',
      'onboarding_completed': '#34d399',
      'internship_discontinued': '#fb923c',
      'candidate_terminated': '#f87171',
      'candidate_withdrawn': '#a78bfa',
      'candidate_waitlisted': '#a78bfa',
      'candidate_restored_from_waitlist': '#34d399',
      'interview_rescheduled_by_hr': '#fbbf24',
      'probation_pending': '#fbbf24',
      'test_activity': '#94a3b8'
    };
    return colors[action] || '#94a3b8';
  };

  const getTeamLabel = (team) => {
    const labels = {
      'assignment': 'Assignment',
      'scheduling': 'Scheduling',
      'panel_r1': 'R1 Panel',
      'panel_r2': 'R2 Panel',
      'leadership': 'Leadership'
    };
    return labels[team] || team || 'Unknown';
  };

  return (
    <div className="glass-panel animate-fade-up" style={{ padding: '30px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: '700' }}>
          📋 Global Activity Ledger
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all" style={{ color: '#000' }}>All Teams</option>
            <option value="assignment" style={{ color: '#000' }}>Assignment Team</option>
            <option value="scheduling" style={{ color: '#000' }}>Scheduling Team</option>
            <option value="panel_r1" style={{ color: '#000' }}>R1 Panelists</option>
            <option value="panel_r2" style={{ color: '#000' }}>R2 Panelists</option>
            <option value="leadership" style={{ color: '#000' }}>Leadership</option>
          </select>
          <button
            onClick={fetchActivities}
            className="btn-glass"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            🔄 Sync Ledger
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Decrypting logs...</p>
        </div>
      ) : activities.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          📭 Ledger is empty. Activities will stream here in real-time.
        </p>
      ) : (
        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
          {activities.map((activity, index) => {
            const panelName = activity.details?.panel || activity.details?.panelist || '';
            const isPanelistUnknown = !panelName || panelName === 'Unknown' || panelName === '' || panelName === 'Panelist Not Assigned';
            const actionColor = getActionColor(activity.action);

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '20px',
                  borderBottom: index < activities.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  transition: 'background 0.2s',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: '12px',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${actionColor}15`,
                  border: `1px solid ${actionColor}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginRight: '20px',
                  flexShrink: 0
                }}>
                  {getActionIcon(activity.action)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#fff' }}>
                      {activity.user_name || 'System'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#e2e8f0',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {getTeamLabel(activity.team)}
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      color: actionColor,
                      fontWeight: '600',
                      letterSpacing: '0.5px'
                    }}>
                      {activity.action?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    {activity.details?.candidate_name && (
                      <span style={{ color: '#fff', fontWeight: '500' }}>{activity.details.candidate_name}</span>
                    )}
                    {activity.action === 'interview_scheduled' && panelName && !isPanelistUnknown && (
                      <span> • Panel: <span style={{color: '#fff'}}>{panelName}</span></span>
                    )}
                    {activity.action === 'interview_scheduled' && isPanelistUnknown && (
                      <span> • <span style={{color: '#f87171'}}>Panelist Unassigned</span></span>
                    )}
                    {activity.details?.round && (
                      <span> • {activity.details.round}</span>
                    )}
                    {activity.details?.total_score && (
                      <span> • Score: <span style={{color: '#fff', fontWeight: '600'}}>{activity.details.total_score}</span></span>
                    )}
                    {activity.details?.domain && (
                      <span> • {activity.details.domain}</span>
                    )}
                    {activity.details?.message && (
                      <span> • "{activity.details.message}"</span>
                    )}
                    {activity.details?.reason && (
                      <span> • Reason: <span style={{fontStyle: 'italic'}}>{activity.details.reason}</span></span>
                    )}
                    {activity.details?.new_status && (
                      <span> • Status: <span style={{color: '#fff'}}>{activity.details.new_status}</span></span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', fontWeight: '500' }}>
                     {new Date(activity.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {activities.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--glass-border)',
          fontSize: '13px',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          Displaying top {activities.length} ledger entries in real-time
        </div>
      )}
    </div>
  );
}

export default TeamActivityTracker;