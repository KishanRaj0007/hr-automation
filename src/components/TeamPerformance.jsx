// components/TeamPerformance.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function TeamPerformance() {
  const { userRole, isAdmin, isHR, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
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

  // Get current month and week
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedQuarter(getCurrentQuarter(now));
    setSelectedWeek(getCurrentWeekNumber(now));
  }, []);

  useEffect(() => {
    fetchTeamPerformance();
  }, [timeframe, selectedMonth, selectedQuarter, selectedWeek]);

  function getCurrentQuarter(date) {
    const month = date.getMonth();
    return Math.floor(month / 3);
  }

  function getCurrentWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  function getWeekRange(weekNumber, year) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay();
    const start = new Date(year, 0, 1 + daysOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  function getDateRange(timeframe, month, quarter, week) {
    const now = new Date();
    const year = now.getFullYear();
    let start = new Date();
    let end = new Date();

    switch(timeframe) {
      case 'today': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'week': {
        const currentDay = now.getDay();
        const diffToSunday = currentDay;
        start = new Date(now);
        start.setDate(now.getDate() - diffToSunday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'month': {
        const selectedMonthNum = month !== null ? month : now.getMonth();
        start = new Date(year, selectedMonthNum, 1);
        end = new Date(year, selectedMonthNum + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'quarter': {
        const selectedQuarterNum = quarter !== null ? quarter : getCurrentQuarter(now);
        const quarterStartMonth = selectedQuarterNum * 3;
        start = new Date(year, quarterStartMonth, 1);
        end = new Date(year, quarterStartMonth + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      default: {
        return { start: null, end: null };
      }
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  function getTimeframeLabel(timeframe, month, quarter, week) {
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
    
    switch(timeframe) {
      case 'today': return 'Today';
      case 'week': {
        const selectedWeek = week !== null ? week : getCurrentWeekNumber(now);
        const range = getWeekRange(selectedWeek, year);
        const startStr = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Week ${selectedWeek} (${startStr} - ${endStr})`;
      }
      case 'month': {
        const selectedMonthNum = month !== null ? month : now.getMonth();
        return `${monthNames[selectedMonthNum]} ${year}`;
      }
      case 'quarter': {
        const selectedQuarterNum = quarter !== null ? quarter : getCurrentQuarter(now);
        return `${quarterNames[selectedQuarterNum]} ${year}`;
      }
      default: return 'All Time';
    }
  }

  function navigateWeek(direction) {
    const newWeek = (selectedWeek || getCurrentWeekNumber(new Date())) + direction;
    setSelectedWeek(newWeek);
  }

  function navigateMonth(direction) {
    const newMonth = (selectedMonth !== null ? selectedMonth : new Date().getMonth()) + direction;
    if (newMonth < 0) {
      setSelectedMonth(11);
    } else if (newMonth > 11) {
      setSelectedMonth(0);
    } else {
      setSelectedMonth(newMonth);
    }
  }

  function navigateQuarter(direction) {
    const newQuarter = (selectedQuarter !== null ? selectedQuarter : getCurrentQuarter(new Date())) + direction;
    if (newQuarter < 0) {
      setSelectedQuarter(3);
    } else if (newQuarter > 3) {
      setSelectedQuarter(0);
    } else {
      setSelectedQuarter(newQuarter);
    }
  }

  async function fetchTeamPerformance() {
    setLoading(true);
    try {
      const dateRange = getDateRange(timeframe, selectedMonth, selectedQuarter, selectedWeek);

      let candidatesQuery = supabase.from('candidates').select('*');
      let assignmentsQuery = supabase.from('assignments').select('*');
      let interviewsQuery = supabase.from('interviews').select('*');
      let hrUsersQuery = supabase.from('hr_users').select('name, email, role, team, is_active');

      if (dateRange.start && dateRange.end) {
        candidatesQuery = candidatesQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
        
        assignmentsQuery = assignmentsQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
        
        interviewsQuery = interviewsQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const [candidatesRes, assignmentsRes, interviewsRes, hrUsersRes] = await Promise.all([
        candidatesQuery,
        assignmentsQuery,
        interviewsQuery,
        hrUsersQuery
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

      const assignmentTeam = calculateAssignmentTeamPerformance(assignments, candidates, hrUsers);
      const schedulingTeam = calculateSchedulingTeamPerformance(interviews, hrUsers, dateRange);
      const panelR1 = calculatePanelPerformance(interviews, 'R1', candidates, hrUsers);
      const panelR2 = calculatePanelPerformance(interviews, 'R2', candidates, hrUsers);

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

  function getUserName(email, hrUsers) {
    if (!email) return 'Unknown';
    const user = hrUsers.find(u => u.email === email);
    return user?.name || email;
  }

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

      if (a.candidate_id) {
        const candidate = candidates.find(c => c.id === a.candidate_id);
        if (candidate && candidate.current_stage === 'Waitlist' && candidate.waitlist_restore_stage === 'Assignment') {
          evaluatorMap[senderName].waitlisted++;
        }
      }
    });

    return Object.values(evaluatorMap).map(e => ({
      ...e,
      pass_rate: e.evaluated > 0 ? Math.round((e.passed / e.evaluated) * 100) : 0,
      avg_score: e.evaluated > 0 ? Math.round((e.total_score / e.evaluated) * 10) / 10 : 0
    })).sort((a, b) => b.evaluated - a.evaluated);
  }

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

    candidates.forEach(c => {
      if (c.current_stage === 'Waitlist') {
        const restoreStage = c.waitlist_restore_stage || '';
        const isR1Waitlisted = restoreStage === 'Interview' || 
                              restoreStage === 'R1 Scheduling' || 
                              restoreStage === 'R1 Interview' ||
                              restoreStage === 'R1' ||
                              restoreStage === 'R1 Selected' ||
                              restoreStage === 'R1 Passed';
        const isR2Waitlisted = restoreStage === 'R2 Scheduling' || 
                              restoreStage === 'R2 Interview' ||
                              restoreStage === 'R2' ||
                              restoreStage === 'R2 Selected' ||
                              restoreStage === 'R2 Passed';
        
        const isRelevantWaitlist = (round === 'R1' && isR1Waitlisted) || 
                                   (round === 'R2' && isR2Waitlisted);
        
        if (isRelevantWaitlist) {
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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading team performance data...</p>
      </div>
    );
  }

  const navBtnStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textTransform: 'capitalize'
  };

  const activeBtnStyle = {
    ...navBtnStyle,
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid var(--primary)',
    color: '#fff',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
  };

  const tableHeaderStyle = { padding: '16px 12px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontWeight: '600' };
  const tableCellStyle = { padding: '16px 12px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.02)' };

  return (
    <div className="animate-fade-up">
      {/* Timeframe Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
          👥 Team Performance
          <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '12px' }}>
            ({getTimeframeLabel(timeframe, selectedMonth, selectedQuarter, selectedWeek)})
          </span>
        </h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(-1);
                else if (timeframe === 'month') navigateMonth(-1);
                else if (timeframe === 'quarter') navigateQuarter(-1);
              }}
              className="btn-glass" style={{ padding: '8px 12px' }}
            >
              ◀
            </button>
          )}
          
          {['today', 'week', 'month', 'quarter', 'all'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTimeframe(t);
                if (t === 'all') {
                  setSelectedMonth(null); setSelectedQuarter(null); setSelectedWeek(null);
                }
              }}
              style={timeframe === t ? activeBtnStyle : navBtnStyle}
              onMouseEnter={(e) => { if (timeframe !== t) e.target.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { if (timeframe !== t) e.target.style.background = 'rgba(255,255,255,0.03)' }}
            >
              {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t + 'ly'}
            </button>
          ))}

          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(1);
                else if (timeframe === 'month') navigateMonth(1);
                else if (timeframe === 'quarter') navigateQuarter(1);
              }}
              className="btn-glass" style={{ padding: '8px 12px' }}
            >
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'New Candidates', value: teamData.summary.newCandidates, color: '#fff' },
          { label: 'Assignments', value: teamData.summary.totalAssignments, color: '#fbbf24' },
          { label: 'Interviews', value: teamData.summary.totalInterviews, color: '#c084fc' },
          { label: 'Selected', value: teamData.summary.totalSelected, color: '#34d399' },
          { label: 'Rejected', value: teamData.summary.totalRejected, color: '#f87171' }
        ].map(card => (
          <div key={card.label} className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{card.label}</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Team Performance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        
        {/* Assignment Team */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Assignment Team
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
              {teamData.assignmentTeam.reduce((sum, t) => sum + t.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.assignmentTeam.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No assignment data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Evaluator</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Sent</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Evaluated</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Late</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.assignmentTeam.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.evaluator_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.sent || 0}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>{item.pass_rate}%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.late > 0 ? '#f87171' : 'var(--text-muted)'}}>{item.late}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.rejected > 0 ? '#f87171' : 'var(--text-muted)'}}>{item.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scheduling Team */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span> Scheduling Team
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
              {teamData.schedulingTeam.reduce((sum, t) => sum + t.r1_scheduled + t.r2_scheduled, 0)} scheduled
            </span>
          </h4>
          {teamData.schedulingTeam.length === 0 || teamData.schedulingTeam.every(m => m.r1_scheduled === 0 && m.r2_scheduled === 0) ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No scheduling activity found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>R1</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>R2</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Rescheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.schedulingTeam.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.r1_scheduled}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.r2_scheduled}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.rescheduled > 0 ? '#fbbf24' : 'var(--text-muted)'}}>{item.rescheduled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* R1 Panelists */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> R1 Panelists
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
              {teamData.panelR1.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.panelR1.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No R1 interview data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Panelist</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Eval.</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Fail %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Hold</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR1.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.panelist_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>{item.pass_rate}%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.fail_rate > 50 ? '#f87171' : 'var(--text-muted)'}}>{item.fail_rate}%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.on_hold > 0 ? '#fbbf24' : 'var(--text-muted)'}}>{item.on_hold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* R2 Panelists */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> R2 Panelists
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
              {teamData.panelR2.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.panelR2.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No R2 interview data found.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Panelist</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Eval.</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Fail %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Hold</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR2.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.panelist_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>{item.pass_rate}%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.fail_rate > 50 ? '#f87171' : 'var(--text-muted)'}}>{item.fail_rate}%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.on_hold > 0 ? '#fbbf24' : 'var(--text-muted)'}}>{item.on_hold}</td>
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