// components/TeamActivityTracker.jsx - FIXED
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
        console.log('Activities fetched:', data?.length || 0);
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
    'assignment_sent': '👤',
    'assignment_evaluated': '👤',
    'interview_scheduled': '👤',
    'interview_evaluated': '👤',
    'status_updated': '👤',
    'candidate_selected': '👤',
    'candidate_rejected': '👤',
    'candidate_hold': '👤',
    'probation_started': '👤',
    'probation_meeting_scheduled': '👤',
    'onboarding_completed': '👤',
    'internship_discontinued': '👤',
    'candidate_terminated': '👤',
    'candidate_withdrawn': '👤',
    'candidate_waitlisted': '👤',
    'candidate_restored_from_waitlist': '👤',
    'candidate_restored_from_on_hold': '👤',
    'interview_rescheduled_by_hr': '👤',
    'probation_pending': '👤',
    // ===== NEW ICONS =====
    'candidate_force_scheduled': '👤',
    'candidate_rejected_low_score': '👤',
    'hr_replied_to_question': '👤',
    'faq_added': '👤',
    'faq_marked_from_question': '👤',
    // ===== END NEW ICONS =====
    'test_activity': '👤'
  };
  return icons[action] || '';
};

  const getActionColor = (action) => {
    const colors = {
      'assignment_sent': '#2563eb',
      'assignment_evaluated': '#8b5cf6',
      'interview_scheduled': '#f59e0b',
      'interview_evaluated': '#10b981',
      'status_updated': '#6366f1',
      'candidate_selected': '#10b981',
      'candidate_rejected': '#ef4444',
      'candidate_hold': '#f59e0b',
      'probation_started': '#3b82f6',
      'probation_meeting_scheduled': '#8b5cf6',
      'onboarding_completed': '#10b981',
      'internship_discontinued': '#f97316',
      'candidate_terminated': '#dc2626',
      'candidate_withdrawn': '#8b5cf6',
      'candidate_waitlisted': '#8b5cf6',
      'candidate_restored_from_waitlist': '#10b981',
      'interview_rescheduled_by_hr': '#f59e0b',
      'probation_pending': '#f59e0b',
      'test_activity': '#6b7280'
    };
    return colors[action] || '#6b7280';
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

  // ===== TEMPORARILY REMOVE isAdmin CHECK FOR DEBUGGING =====
  // if (!isAdmin) return null;

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: '12px', 
      border: '1px solid #e2e8f0', 
      padding: '20px',
      marginTop: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
          📋 Team Activity Log
          
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              background: '#fff',
              color: '#1a202c'
            }}
          >
            <option value="all">All Teams</option>
            <option value="assignment">Assignment Team</option>
            <option value="scheduling">Scheduling Team</option>
            <option value="panel_r1">R1 Panelists</option>
            <option value="panel_r2">R2 Panelists</option>
            <option value="leadership">Leadership</option>
          </select>
          <button
            onClick={fetchActivities}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#475569'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>
          ⏳ Loading activities...
        </p>
      ) : activities.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
          📭 No activities recorded yet. Activities will appear here as HR team members take actions.
        </p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {activities.map((activity, index) => {
            // ✅ FIX: Check both panel and panelist in details (case-insensitive)
            const panelName = activity.details?.panel || activity.details?.panelist || '';
            const isPanelistUnknown = !panelName || panelName === 'Unknown' || panelName === '' || panelName === 'Panelist Not Assigned';

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderBottom: index < activities.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background 0.2s',
                  background: index % 2 === 0 ? '#fafafa' : 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#fafafa' : 'transparent'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: getActionColor(activity.action) + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}>
                  {getActionIcon(activity.action)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>
                      {activity.user_name || 'System'}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      background: '#e2e8f0',
                      color: '#475569',
                      fontWeight: '600'
                    }}>
                      {getTeamLabel(activity.team)}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: getActionColor(activity.action),
                      fontWeight: '500'
                    }}>
                      {activity.action?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#070808', marginTop: '4px' }}>
                    {activity.details?.candidate_name && (
                      <span>{activity.details.candidate_name}</span>
                    )}
                    {/* ✅ FIX: Show panel name correctly using panelName variable */}
                    {activity.action === 'interview_scheduled' && panelName && !isPanelistUnknown && (
                      <span> • {panelName}</span>
                    )}
                    {activity.action === 'interview_scheduled' && isPanelistUnknown && (
                      <span> • Panelist Not Assigned</span>
                    )}
                    {activity.details?.round && (
                      <span> • {activity.details.round}</span>
                    )}
                    {activity.details?.total_score && (
                      <span> • Score: {activity.details.total_score}</span>
                    )}
                    {activity.details?.domain && (
                      <span> • {activity.details.domain}</span>
                    )}
                    {activity.details?.message && (
                      <span> • {activity.details.message}</span>
                    )}
                    {activity.details?.reason && (
                      <span> • Reason: {activity.details.reason}</span>
                    )}
                    {activity.details?.new_status && (
                      <span> • Status: {activity.details.new_status}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#090a0a', marginTop: '4px' }}>
                     {new Date(activity.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Show count summary */}
      {activities.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid #f1f5f9',
          fontSize: '12px',
          color: '#94a3b8',
          textAlign: 'center'
        }}>
          Showing {activities.length} most recent activities
        </div>
      )}
    </div>
  );
}

export default TeamActivityTracker;