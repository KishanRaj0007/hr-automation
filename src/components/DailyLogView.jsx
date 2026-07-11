import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

function DailyLogView({ date }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState({
    assignments: [],
    interviews: [],
    statusUpdates: []
  });

  useEffect(() => {
    fetchDailyLogs();
  }, [date]);

  async function fetchDailyLogs() {
    setLoading(true);
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Fetch activities for the day
      const { data: activities } = await supabase
        .from('team_activity_log')
        .select('*')
        .gte('created_at', targetDate + 'T00:00:00')
        .lte('created_at', targetDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      // Group by type
      const grouped = {
        assignments: activities?.filter(a => a.action.includes('assignment')) || [],
        interviews: activities?.filter(a => a.action.includes('interview') || a.action.includes('candidate_')) || [],
        statusUpdates: activities?.filter(a => a.action === 'status_updated') || []
      };

      setLogs(grouped);
    } catch (error) {
      console.error('Error fetching daily logs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Loading daily logs...</p>;

  const totalActivities = logs.assignments.length + logs.interviews.length + logs.statusUpdates.length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Total Activities</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{totalActivities}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Assignments</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{logs.assignments.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Interviews</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#a855f7' }}>{logs.interviews.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Status Updates</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{logs.statusUpdates.length}</div>
        </div>
      </div>

      {totalActivities === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
          No activities recorded for this day.
        </p>
      ) : (
        <div>
          {logs.interviews.map((log, index) => (
            <div key={index} style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {log.action === 'candidate_selected' ? '✅' : 
                 log.action === 'candidate_rejected' ? '❌' : 
                 log.action === 'candidate_hold' ? '⏸️' : '📌'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                  {log.user_name} - {log.action.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {log.details?.candidate_name && `Candidate: ${log.details.candidate_name}`}
                  {log.details?.round && ` • ${log.details.round}`}
                  {log.details?.total_score && ` • Score: ${log.details.total_score}`}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {new Date(log.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DailyLogView;