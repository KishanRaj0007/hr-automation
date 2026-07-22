// components/TeamPerformance.jsx - COMPLETE WITH WAITLIST LOGIC
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function TeamPerformance() {
  const { userRole, isAdmin, isHR, user } = useAuth();
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
      const dateRange = getDateRange(timeframe);

      const [candidatesRes, assignmentsRes, interviewsRes, hrUsersRes] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('assignments').select('*'),
        supabase.from('interviews').select('*'),
        supabase.from('hr_users').select('name, email, role, team, is_active')
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];
      const hrUsers = hrUsersRes.data || [];

      const filteredCandidates = candidates.filter(c => 
        c.created_at && new Date(c.created_at) >= new Date(dateRange.start) && new Date(c.created_at) <= new Date(dateRange.end)
      );

      const filteredAssignments = assignments.filter(a => 
        a.created_at && new Date(a.created_at) >= new Date(dateRange.start) && new Date(a.created_at) <= new Date(dateRange.end)
      );

      const filteredInterviews = interviews.filter(i => 
        i.created_at && new Date(i.created_at) >= new Date(dateRange.start) && new Date(i.created_at) <= new Date(dateRange.end)
      );

      // 1. Assignment Team Performance
      const assignmentTeam = calculateAssignmentTeamPerformance(assignments, candidates, hrUsers);

      // 2. Scheduling Team Performance
      const schedulingTeam = calculateSchedulingTeamPerformance(interviews, hrUsers, dateRange);

      // 3. R1 Panelists - WITH WAITLIST
      const panelR1 = calculatePanelPerformance(interviews, 'R1', candidates, hrUsers);

      // 4. R2 Panelists - WITH WAITLIST
      const panelR2 = calculatePanelPerformance(interviews, 'R2', candidates, hrUsers);

      // 5. Summary
      const summary = {
        newCandidates: filteredCandidates.length,
        totalAssignments: filteredAssignments.length,
        totalInterviews: filteredInterviews.length,
        totalSelected: filteredCandidates.filter(c => c.current_stage === 'Selected' || c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done').length,
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

  // Helper: Get user name from email
  function getUserName(email, hrUsers) {
    if (!email) return 'Unknown';
    const user = hrUsers.find(u => u.email === email);
    return user?.name || email;
  }

  // ============================================================
  // ASSIGNMENT TEAM - WITH WAITLIST LOGIC
  // ============================================================
  function calculateAssignmentTeamPerformance(assignments, candidates, hrUsers) {
    const evaluatorMap = {};
    
    assignments.forEach(a => {
      const senderEmail = a.sent_by;
      const hrUser = hrUsers.find(u => u.email === senderEmail);
      let senderName = hrUser?.name || senderEmail;
      
      if (!senderName || senderName === 'System Admin' || senderName === '') {
        if (a.evaluated_by) {
          const evaluator = hrUsers.find(u => u.email === a.evaluated_by);
          senderName = evaluator?.name || a.evaluated_by;
        }
      }
      
      if (!senderName || senderName === 'System Admin' || senderName === '') {
        return;
      }
      
      if (!evaluatorMap[senderName]) {
        evaluatorMap[senderName] = {
          evaluator_name: senderName,
          evaluator_email: senderEmail,
          sent: 0,
          evaluated: 0,
          passed: 0,
          rejected: 0,
          late: 0,
          waitlisted: 0,
          total_score: 0
        };
      }

      evaluatorMap[senderName].sent++;

      if (a.assignment_status === 'Evaluated') {
        evaluatorMap[senderName].evaluated++;
        
        const totalScore = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
        evaluatorMap[senderName].total_score += totalScore;
        
        if (totalScore >= 6 || a.hr_scorecard_approved === true) {
          evaluatorMap[senderName].passed++;
        } else {
          evaluatorMap[senderName].rejected++;
        }
      }

      if (a.is_late_submission) {
        evaluatorMap[senderName].late++;
      }

      // ✅ WAITLIST LOGIC FOR ASSIGNMENT TEAM
      if (a.candidate_id) {
        const candidate = candidates.find(c => c.id === a.candidate_id);
        if (candidate) {
          // Check if candidate is waitlisted at Assignment stage
          const isWaitlistedAtAssignment = 
            candidate.current_stage === 'Waitlist' && 
            (candidate.waitlist_restore_stage === 'Assignment' || 
             candidate.waitlist_restore_stage === 'Applied' ||
             candidate.waitlist_restore_stage === null);
          
          if (isWaitlistedAtAssignment) {
            evaluatorMap[senderName].waitlisted++;
          }
        }
      }
    });

    return Object.values(evaluatorMap).map(e => ({
      ...e,
      pass_rate: e.evaluated > 0 ? Math.round((e.passed / e.evaluated) * 100) : 0,
      avg_score: e.evaluated > 0 ? Math.round((e.total_score / e.evaluated) * 10) / 10 : 0
    })).sort((a, b) => b.evaluated - a.evaluated);
  }

  // ============================================================
  // SCHEDULING TEAM
  // ============================================================
  function calculateSchedulingTeamPerformance(interviews, hrUsers, dateRange) {
    const schedulingMap = {};
    
    const filteredInterviews = interviews.filter(i => 
      i.created_at && new Date(i.created_at) >= new Date(dateRange.start) && new Date(i.created_at) <= new Date(dateRange.end)
    );
    
    const schedulers = [...new Set(filteredInterviews.map(i => i.scheduled_by).filter(Boolean))];
    
    if (schedulers.length === 0) {
      return [];
    }

    schedulers.forEach(email => {
      const hrUser = hrUsers.find(u => u.email === email);
      const name = hrUser?.name || email || 'Unknown';
      
      const userInterviews = filteredInterviews.filter(i => i.scheduled_by === email);
      
      if (userInterviews.length > 0) {
        schedulingMap[name] = {
          name: name,
          email: email,
          r1_scheduled: userInterviews.filter(i => i.round === 'R1' || i.round === 1).length,
          r2_scheduled: userInterviews.filter(i => i.round === 'R2' || i.round === 2).length,
          rescheduled: userInterviews.filter(i => (i.reschedule_count || 0) > 0).length
        };
      }
    });

    return Object.values(schedulingMap).sort((a, b) => (b.r1_scheduled + b.r2_scheduled) - (a.r1_scheduled + a.r2_scheduled));
  }

  // ============================================================
  // PANEL PERFORMANCE (R1 & R2) - WITH WAITLIST LOGIC
  // ============================================================
  function calculatePanelPerformance(interviews, round, candidates, hrUsers) {
    const panelMap = {};
    
    const roundInterviews = interviews.filter(i => {
      const isRound = i.round === round || i.round === parseInt(round) || 
                       i.round?.toString() === round?.toString();
      const isStatus = i.status === 'Completed' || i.status === 'Evaluated' || 
                       i.status === 'completed' || i.status === 'evaluated';
      const hasResult = i.result && i.result !== 'Pending' && i.result !== 'pending';
      
      return isRound && (isStatus || hasResult);
    });

    roundInterviews.forEach(i => {
      let panelists = [];
      if (Array.isArray(i.panelists)) {
        panelists = i.panelists;
      } else if (typeof i.panelists === 'string') {
        panelists = i.panelists.split(',').map(p => p.trim());
      }

      panelists.forEach(panelist => {
        if (!panelist || panelist === '') return;
        
        const hrUser = hrUsers.find(u => u.name === panelist || u.email === panelist);
        const panelistName = hrUser?.name || panelist || 'Unknown';
        
        if (!panelMap[panelistName]) {
          panelMap[panelistName] = {
            panelist_name: panelistName,
            panelist_email: hrUser?.email || panelist,
            evaluated: 0,
            passed: 0,
            failed: 0,
            on_hold: 0,
            waitlisted: 0,
            total_score: 0
          };
        }
        
        panelMap[panelistName].evaluated++;
        panelMap[panelistName].total_score += (i.total_score || 0);
        
        if (i.result === 'Selected' || i.result === 'Passed' || i.result === 'Accept' || 
            i.result === 'selected' || i.result === 'passed' || i.result === 'accept') {
          panelMap[panelistName].passed++;
        } else if (i.result === 'Rejected' || i.result === 'rejected') {
          panelMap[panelistName].failed++;
        } else if (i.result === 'On Hold' || i.result === 'on hold') {
          panelMap[panelistName].on_hold++;
        }
      });
    });

    // ✅ WAITLIST LOGIC FOR R1 AND R2 PANELISTS
    candidates.forEach(c => {
      if (c.current_stage === 'Waitlist') {
        const restoreStage = c.waitlist_restore_stage || '';
        
        // For R1: Check if waitlisted at R1 stage
        const isR1Waitlisted = restoreStage === 'Interview' || 
                              restoreStage === 'R1 Scheduling' || 
                              restoreStage === 'R1 Interview' ||
                              restoreStage === 'R1' ||
                              restoreStage === 'R1 Selected' ||
                              restoreStage === 'R1 Passed';
        
        // For R2: Check if waitlisted at R2 stage
        const isR2Waitlisted = restoreStage === 'R2 Scheduling' || 
                              restoreStage === 'R2 Interview' ||
                              restoreStage === 'R2' ||
                              restoreStage === 'R2 Selected' ||
                              restoreStage === 'R2 Passed';
        
        const isRelevantWaitlist = (round === 'R1' && isR1Waitlisted) || 
                                   (round === 'R2' && isR2Waitlisted);
        
        if (isRelevantWaitlist) {
          // Find interviews for this candidate at this round
          const candidateInterviews = interviews.filter(i => 
            i.candidate_id === c.id && 
            (i.round === round || i.round === parseInt(round))
          );
          
          candidateInterviews.forEach(i => {
            let panelists = [];
            if (Array.isArray(i.panelists)) {
              panelists = i.panelists;
            } else if (typeof i.panelists === 'string') {
              panelists = i.panelists.split(',').map(p => p.trim());
            }
            
            panelists.forEach(panelist => {
              if (!panelist || panelist === '') return;
              const hrUser = hrUsers.find(u => u.name === panelist || u.email === panelist);
              const panelistName = hrUser?.name || panelist || 'Unknown';
              if (panelMap[panelistName]) {
                panelMap[panelistName].waitlisted++;
              }
            });
          });
        }
      }
    });

    return Object.values(panelMap).map(p => ({
      ...p,
      pass_rate: p.evaluated > 0 ? Math.round((p.passed / p.evaluated) * 100) : 0,
      fail_rate: p.evaluated > 0 ? Math.round((p.failed / p.evaluated) * 100) : 0,
      avg_score: p.evaluated > 0 ? Math.round((p.total_score / p.evaluated) * 10) / 10 : 0
    })).sort((a, b) => b.evaluated - a.evaluated);
  }

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p>Loading team performance data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Assignment Team */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Assignment Team
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.assignmentTeam.reduce((sum, t) => sum + t.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.assignmentTeam.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No assignment data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Evaluator</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Sent</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Evaluated</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Pass Rate</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Late</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Rejected</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Waitlisted</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.assignmentTeam.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{item.evaluator_name}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.sent || 0}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.evaluated}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: item.pass_rate >= 50 ? '#10b981' : '#ef4444' }}>
                        {item.pass_rate}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.late > 0 ? '#ef4444' : '#94a3b8' }}>
                        {item.late}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.rejected > 0 ? '#ef4444' : '#94a3b8' }}>
                        {item.rejected}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.waitlisted > 0 ? '#8b5cf6' : '#94a3b8' }}>
                        {item.waitlisted}
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
              {teamData.schedulingTeam.reduce((sum, t) => sum + t.r1_scheduled + t.r2_scheduled, 0)} total scheduled
            </span>
          </h4>
          {teamData.schedulingTeam.length === 0 || teamData.schedulingTeam.every(m => m.r1_scheduled === 0 && m.r2_scheduled === 0) ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No scheduling activity found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>R1 Scheduled</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>R2 Scheduled</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Rescheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.schedulingTeam.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.r1_scheduled}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.r2_scheduled}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: item.rescheduled > 0 ? '#f59e0b' : '#94a3b8' }}>
                        {item.rescheduled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* R1 Panelists */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> R1 Panelists
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#94a3b8', marginLeft: 'auto' }}>
              {teamData.panelR1.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
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
                    <th style={{ padding: '6px', textAlign: 'center' }}>Evaluated</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Pass %</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Fail %</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>On Hold</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Waitlisted</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR1.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '6px', fontWeight: '500' }}>{item.panelist_name}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{item.evaluated}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.pass_rate >= 50 ? '#10b981' : '#ef4444' }}>
                        {item.pass_rate}%
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.fail_rate > 50 ? '#ef4444' : '#94a3b8' }}>
                        {item.fail_rate}%
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', color: item.on_hold > 0 ? '#f59e0b' : '#94a3b8' }}>
                        {item.on_hold}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', color: item.waitlisted > 0 ? '#8b5cf6' : '#94a3b8' }}>
                        {item.waitlisted}
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
              {teamData.panelR2.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
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
                    <th style={{ padding: '6px', textAlign: 'center' }}>Evaluated</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Pass %</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Fail %</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>On Hold</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Waitlisted</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR2.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '6px', fontWeight: '500' }}>{item.panelist_name}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{item.evaluated}</td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.pass_rate >= 50 ? '#10b981' : '#ef4444' }}>
                        {item.pass_rate}%
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: item.fail_rate > 50 ? '#ef4444' : '#94a3b8' }}>
                        {item.fail_rate}%
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', color: item.on_hold > 0 ? '#f59e0b' : '#94a3b8' }}>
                        {item.on_hold}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', color: item.waitlisted > 0 ? '#8b5cf6' : '#94a3b8' }}>
                        {item.waitlisted}
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