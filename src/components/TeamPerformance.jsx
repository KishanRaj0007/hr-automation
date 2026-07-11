import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function TeamPerformance() {
  const { userRole, isAdmin, isHR } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today');
  const [teamData, setTeamData] = useState({
    assignmentTeam: [],
    schedulingTeam: [],
    panelR1: [],
    panelR2: [],
    summary: {
      newCandidates: 0,
      totalAssignments: 0,
      totalInterviews: 0,
      totalSelected: 0,
      totalRejected: 0
    }
  });

  useEffect(() => {
    fetchTeamPerformance();
  }, [timeframe]);

  async function fetchTeamPerformance() {
    setLoading(true);
    try {
      // Get date range based on timeframe
      const dateRange = getDateRange(timeframe);

      // Fetch all data dynamically
      const [candidatesRes, assignmentsRes, interviewsRes] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('assignments').select('*'),
        supabase.from('interviews').select('*')
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];

      // Filter by date range
      const filteredCandidates = candidates.filter(c => 
        c.created_at && new Date(c.created_at) >= new Date(dateRange.start) && new Date(c.created_at) <= new Date(dateRange.end)
      );

      const filteredAssignments = assignments.filter(a => 
        a.created_at && new Date(a.created_at) >= new Date(dateRange.start) && new Date(a.created_at) <= new Date(dateRange.end)
      );

      const filteredInterviews = interviews.filter(i => 
        i.created_at && new Date(i.created_at) >= new Date(dateRange.start) && new Date(i.created_at) <= new Date(dateRange.end)
      );

      // 1. Assignment Team Performance - Calculate from assignments data
      const assignmentTeam = calculateAssignmentTeamPerformance(assignments);

      // 2. Scheduling Team Performance - Calculate from interviews and candidates
      const schedulingTeam = await calculateSchedulingTeamPerformance(dateRange);

      // 3. R1 Panelists - Calculate from interviews
      const panelR1 = calculatePanelPerformance(interviews, 'R1');

      // 4. R2 Panelists - Calculate from interviews
      const panelR2 = calculatePanelPerformance(interviews, 'R2');

      // 5. Summary
      const summary = {
        newCandidates: filteredCandidates.length,
        totalAssignments: filteredAssignments.length,
        totalInterviews: filteredInterviews.length,
        totalSelected: filteredCandidates.filter(c => c.current_stage === 'Selected').length,
        totalRejected: filteredCandidates.filter(c => c.current_stage === 'Rejected').length
      };

      setTeamData({
        assignmentTeam,
        schedulingTeam,
        panelR1,
        panelR2,
        summary
      });
    } catch (error) {
      console.error('Error fetching team performance:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDateRange(timeframe) {
    const now = new Date();
    const start = new Date(now);
    
    switch(timeframe) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }
    
    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  }

  function calculateAssignmentTeamPerformance(assignments) {
    const evaluatorMap = {};
    
    assignments.forEach(a => {
      if (a.assignment_status === 'Evaluated' && a.evaluated_by) {
        const evaluator = a.evaluated_by;
        if (!evaluatorMap[evaluator]) {
          evaluatorMap[evaluator] = {
            evaluator_name: evaluator,
            total_evaluated: 0,
            total_score: 0,
            late_submissions: 0
          };
        }
        evaluatorMap[evaluator].total_evaluated++;
        evaluatorMap[evaluator].total_score += (a.total_score || 0);
        if (a.is_late_submission) {
          evaluatorMap[evaluator].late_submissions++;
        }
      }
    });

    return Object.values(evaluatorMap).map(e => ({
      ...e,
      avg_score: e.total_evaluated > 0 ? Math.round((e.total_score / e.total_evaluated) * 10) / 10 : 0
    }));
  }

  async function calculateSchedulingTeamPerformance(dateRange) {
    // Get scheduling team members from hr_users
    const { data: schedulingUsers } = await supabase
      .from('hr_users')
      .select('name, email')
      .eq('team', 'scheduling')
      .eq('is_active', true);

    // Get activities in date range from team_activity_log
    const { data: activities } = await supabase
      .from('team_activity_log')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .in('action', ['interview_scheduled', 'status_updated', 'candidate_selected', 'candidate_rejected']);

    const metrics = [];
    schedulingUsers?.forEach(user => {
      const userActivities = activities?.filter(a => a.user_email === user.email) || [];
      metrics.push({
        name: user.name,
        email: user.email,
        scheduled: userActivities.filter(a => a.action === 'interview_scheduled').length,
        statusUpdates: userActivities.filter(a => a.action === 'status_updated').length,
        selected: userActivities.filter(a => a.action === 'candidate_selected').length,
        rejected: userActivities.filter(a => a.action === 'candidate_rejected').length
      });
    });

    return metrics;
  }

  function calculatePanelPerformance(interviews, round) {
    const panelMap = {};
    const roundInterviews = interviews.filter(i => i.round === round && i.result !== 'Pending' && i.result !== 'On Hold');

    roundInterviews.forEach(i => {
      let panelists = [];
      if (Array.isArray(i.panelists)) {
        panelists = i.panelists;
      } else if (typeof i.panelists === 'string') {
        panelists = i.panelists.split(',').map(p => p.trim());
      }

      panelists.forEach(panelist => {
        if (!panelist || panelist === '') return;
        if (!panelMap[panelist]) {
          panelMap[panelist] = {
            panelist_name: panelist,
            total_interviews: 0,
            selected_count: 0,
            rejected_count: 0,
            total_score: 0
          };
        }
        panelMap[panelist].total_interviews++;
        panelMap[panelist].total_score += (i.total_score || 0);
        if (i.result === 'Selected') panelMap[panelist].selected_count++;
        else if (i.result === 'Rejected') panelMap[panelist].rejected_count++;
      });
    });

    return Object.values(panelMap).map(p => ({
      ...p,
      avg_score: p.total_interviews > 0 ? Math.round((p.total_score / p.total_interviews) * 10) / 10 : 0,
      selection_rate: p.total_interviews > 0 ? Math.round((p.selected_count / p.total_interviews) * 100) : 0
    }));
  }

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <p>Loading team performance data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Timeframe Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['today', 'week', 'month', 'quarter'].map(t => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: timeframe === t ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === t ? '#eff6ff' : '#fff',
              color: timeframe === t ? '#1d4ed8' : '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'capitalize'
            }}
          >
            {t === 'quarter' ? 'Quarter' : t}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>New Candidates</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{teamData.summary.newCandidates}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Assignments</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>{teamData.summary.totalAssignments}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Interviews</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#a855f7' }}>{teamData.summary.totalInterviews}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Selected</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{teamData.summary.totalSelected}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Rejected</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>{teamData.summary.totalRejected}</div>
        </div>
      </div>

      {/* Team Performance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Assignment Team */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Assignment Team
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.assignmentTeam.reduce((sum, t) => sum + t.total_evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.assignmentTeam.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No assignment evaluations found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Evaluator</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Evaluated</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Avg Score</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Late</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.assignmentTeam.slice(0, 15).map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{item.evaluator_name}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.total_evaluated}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: item.avg_score >= 7 ? '#10b981' : item.avg_score >= 5 ? '#f59e0b' : '#ef4444' }}>
                        {item.avg_score}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.late_submissions > 0 ? '#ef4444' : '#94a3b8' }}>
                        {item.late_submissions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scheduling Team */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span> Scheduling Team
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.schedulingTeam.length} members
            </span>
          </h4>
          {teamData.schedulingTeam.length === 0 || teamData.schedulingTeam.every(m => m.scheduled === 0 && m.selected === 0 && m.rejected === 0) ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No scheduling activity found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {teamData.schedulingTeam.map((member, index) => (
                <div key={index} style={{
                  padding: '10px 12px',
                  borderBottom: index < teamData.schedulingTeam.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '13px', flexWrap: 'wrap' }}>
                    <span>📅 Scheduled: <strong>{member.scheduled}</strong></span>
                    <span>🔄 Updates: <strong>{member.statusUpdates}</strong></span>
                    <span style={{ color: '#10b981' }}>✅ Selected: <strong>{member.selected}</strong></span>
                    <span style={{ color: '#ef4444' }}>❌ Rejected: <strong>{member.rejected}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* R1 Panelists */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> R1 Panelists
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.panelR1.reduce((sum, p) => sum + p.total_interviews, 0)} interviews
            </span>
          </h4>
          {teamData.panelR1.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No R1 interview data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Panelist</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Interviews</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Selected</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Rejected</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Selection %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR1.slice(0, 15).map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '6px', fontWeight: '500' }}>{item.panelist_name}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{item.total_interviews}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#10b981' }}>{item.selected_count}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#ef4444' }}>{item.rejected_count}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.selection_rate >= 50 ? '#10b981' : '#f59e0b' }}>
                        {item.selection_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* R2 Panelists */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> R2 Panelists
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.panelR2.reduce((sum, p) => sum + p.total_interviews, 0)} interviews
            </span>
          </h4>
          {teamData.panelR2.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No R2 interview data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Panelist</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Interviews</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Selected</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Rejected</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Selection %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR2.slice(0, 15).map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '6px', fontWeight: '500' }}>{item.panelist_name}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{item.total_interviews}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#10b981' }}>{item.selected_count}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#ef4444' }}>{item.rejected_count}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.selection_rate >= 50 ? '#10b981' : '#f59e0b' }}>
                        {item.selection_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamPerformance;