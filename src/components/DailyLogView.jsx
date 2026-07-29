// components/DailyLogView.jsx
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
      
      const { data: activities } = await supabase
        .from('team_activity_log')
        .select('*')
        .gte('created_at', targetDate + 'T00:00:00')
        .lte('created_at', targetDate + 'T23:59:59')
        .order('created_at', { ascending: false });

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

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Decrypting daily telemetry...</p>;

  const totalActivities = logs.assignments.length + logs.interviews.length + logs.statusUpdates.length;

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: '2px solid #fff' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Events</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>{totalActivities}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: '2px solid #fbbf24' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Assignments</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24' }}>{logs.assignments.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: '2px solid #c084fc' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Interviews</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#c084fc' }}>{logs.interviews.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: '2px solid #60a5fa' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Updates</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa' }}>{logs.statusUpdates.length}</div>
        </div>
      </div>

      {totalActivities === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>📭 Telemetry silence. Zero events logged for this solar cycle.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
          {logs.interviews.map((log, index) => (
            <div key={index} style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
            >
              <span style={{ fontSize: '24px' }}>
                {log.action === 'candidate_selected' ? '🏆' : 
                 log.action === 'candidate_rejected' ? '❌' : 
                 log.action === 'candidate_hold' ? '⏸️' : '📌'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                  {log.user_name} <span style={{ color: 'var(--primary)', fontWeight: '700' }}>→</span> {log.action.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {log.details?.candidate_name && <span style={{color: '#e2e8f0'}}>Subject: {log.details.candidate_name}</span>}
                  {log.details?.round && ` • Phase: ${log.details.round}`}
                  {log.details?.total_score && ` • Score: ${log.details.total_score}`}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DailyLogView;