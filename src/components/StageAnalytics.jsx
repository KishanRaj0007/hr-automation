// components/StageAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { calculateStageAnalytics } from '../utils/analyticsHelpers';

const StageAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Get current month and week
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedQuarter(getCurrentQuarter(now));
    setSelectedWeek(getCurrentWeekNumber(now));
  }, []);

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
      case 'all':
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
      case 'all':
      default: return 'All Time';
    }
  }

  function navigateWeek(direction) {
    const newWeek = (selectedWeek || getCurrentWeekNumber(new Date())) + direction;
    setSelectedWeek(newWeek);
    fetchAllData();
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
    fetchAllData();
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
    fetchAllData();
  }

  async function fetchAllData() {
    setLoading(true);
    try {
      const range = getDateRange(timeframe, selectedMonth, selectedQuarter, selectedWeek);

      let candidatesQuery = supabase.from('candidates').select('*');
      let assignmentsQuery = supabase.from('assignments').select('*');
      let interviewsQuery = supabase.from('interviews').select('*');

      if (range.start && range.end) {
        candidatesQuery = candidatesQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
        
        assignmentsQuery = assignmentsQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
        
        interviewsQuery = interviewsQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
      }

      const [candidatesRes, assignmentsRes, interviewsRes] = await Promise.all([
        candidatesQuery,
        assignmentsQuery,
        interviewsQuery
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];

      const analytics = calculateStageAnalytics(candidates, assignments, interviews);
      
      analytics.timeframe = {
        label: getTimeframeLabel(timeframe, selectedMonth, selectedQuarter, selectedWeek),
        range: range
      };
      
      setData(analytics);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [timeframe, selectedMonth, selectedQuarter, selectedWeek]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</div>;
  }

  // Common button style for dark mode
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

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
          📊 Stage Analytics
          <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '12px' }}>
            ({data.timeframe?.label || 'All Time'})
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
              className="btn-glass"
              style={{ padding: '8px 12px' }}
            >
              ◀
            </button>
          )}
          
          {['today', 'week', 'month', 'quarter', 'all'].map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
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
              className="btn-glass"
              style={{ padding: '8px 12px' }}
            >
              ▶
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <StageCard title="📝 STAGE 1: ASSIGNMENTS">
          <MetricRow label="Submission Rate" value={data.assignment.submissionRate} suffix="%" status={data.assignment.status.submissionRate} tooltip="Submitted / Assignment Sent × 100" thresholds={{ good: '60%+', watch: '50-60%', flag: 'below 40%' }} />
          <MetricRow label="Evaluation TAT" value={data.assignment.evaluationTAT} suffix=" days" status={data.assignment.status.evaluationTAT} tooltip="Evaluation Date - Submission Date" thresholds={{ good: '1 day', watch: '2 days', flag: '3+ days' }} />
          <MetricRow label="Assignment Pass Rate" value={data.assignment.passRate} suffix="%" status={data.assignment.status.passRate} tooltip="Passed ÷ Evaluated × 100" thresholds={{ good: '50-70%', watch: '35-50%', flag: 'below 35%', too_easy: '85%+' }} />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Sent: {data.assignment.sent} | Submitted: {data.assignment.submitted} | Evaluated: {data.assignment.evaluated} | Passed: {data.assignment.passed} | Late: {data.assignment.lateSubmissions}</span>
          </div>
        </StageCard>

        <StageCard title="📅 STAGE 2: R1 SCHEDULING">
          <MetricRow label="R1 TAT" value={data.r1Scheduling.r1TAT} suffix=" days" status={data.r1Scheduling.status.r1TAT} tooltip="R1 Scheduled Date - Assignment Pass Date" thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }} />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Total R1 Interviews: {data.r1Scheduling.total}</span>
          </div>
        </StageCard>

        <StageCard title="🎯 STAGE 3: R1 INTERVIEWS">
          <MetricRow label="Conducted Rate" value={data.r1Interview.conductedRate} suffix="%" status={data.r1Interview.status.conductedRate} tooltip="Conducted / Scheduled × 100" thresholds={{ good: '50%+', watch: '45-50%', flag: 'below 45%' }} />
          <MetricRow label="Moving Forward Rate" value={data.r1Interview.movingForwardRate} suffix="%" status={data.r1Interview.status.movingForwardRate} tooltip="R1 Passed / Conducted × 100" thresholds={{ good: '50%+', watch: '30-50%', flag: 'below 30%' }} />
          <MetricRow label="Reschedule Rate" value={data.r1Interview.rescheduleRate} suffix="%" status={data.r1Interview.status.rescheduleRate} tooltip="Total Reschedules / Total Scheduled × 100" thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }} isLowerBetter />
          <MetricRow label="Non-Response Rate" value={data.r1Interview.nonResponseRate} suffix="%" status={data.r1Interview.status.nonResponseRate} tooltip="Invitations Not Accepted / Total Scheduled × 100" thresholds={{ good: 'under 25%', watch: '25-30%', flag: '30%+' }} isLowerBetter />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Scheduled: {data.r1Interview.scheduled} | Conducted: {data.r1Interview.conducted} | Passed: {data.r1Interview.passed} | Rescheduled: {data.r1Interview.rescheduled}</span>
          </div>
        </StageCard>

        <StageCard title="📅 STAGE 4: R2 SCHEDULING">
          <MetricRow label="R2 TAT" value={data.r2Scheduling.r2TAT} suffix=" days" status={data.r2Scheduling.status.r2TAT} tooltip="R2 Scheduled Date - R1 Pass Date" thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }} />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Total R2 Interviews: {data.r2Scheduling.total}</span>
          </div>
        </StageCard>

        <StageCard title="🎯 STAGE 5: R2 INTERVIEWS">
          <MetricRow label="Conducted Rate" value={data.r2Interview.conductedRate} suffix="%" status={data.r2Interview.status.conductedRate} tooltip="Conducted / Scheduled × 100" thresholds={{ good: '70%+', watch: '60-70%', flag: 'below 60%' }} />
          <MetricRow label="Moving Forward Rate" value={data.r2Interview.movingForwardRate} suffix="%" status={data.r2Interview.status.movingForwardRate} tooltip="R2 Passed / Conducted × 100" thresholds={{ good: '70%+', watch: '50-70%', flag: 'below 50%' }} />
          <MetricRow label="Reschedule Rate" value={data.r2Interview.rescheduleRate} suffix="%" status={data.r2Interview.status.rescheduleRate} tooltip="Total Reschedules / Total Scheduled × 100" thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }} isLowerBetter />
          <MetricRow label="Non-Response Rate" value={data.r2Interview.nonResponseRate} suffix="%" status={data.r2Interview.status.nonResponseRate} tooltip="Invitations Not Accepted / Total Scheduled × 100" thresholds={{ good: 'under 10%', watch: '10-15%', flag: '15%+' }} isLowerBetter />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Scheduled: {data.r2Interview.scheduled} | Conducted: {data.r2Interview.conducted} | Passed: {data.r2Interview.passed} | Rescheduled: {data.r2Interview.rescheduled}</span>
          </div>
        </StageCard>

        <StageCard title="⚠️ GENERAL">
          <MetricRow label="Withdrawal Rate" value={data.general.withdrawalRate} suffix="%" status={data.general.status.withdrawalRate} tooltip="Total Withdrawals / Total Candidates × 100" thresholds={{ good: 'under 10%', watch: '10-15%', flag: '15%+' }} isLowerBetter />
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📊 Total Candidates: {data.general.totalCandidates} | Withdrawn: {data.general.totalWithdrawn}</span>
          </div>
        </StageCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <StageCard title="📊 SOURCE ANALYTICS">
          {data.sources.topSources.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No source data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Source</th>
                    <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Total</th>
                    <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Selected</th>
                    <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Rejected</th>
                    <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.topSources.map((source, index) => (
                    <tr key={source.source} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#fff' }}>{index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}{source.source}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#fff' }}>{source.total}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#34d399', fontWeight: '600' }}>{source.selected}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#f87171', fontWeight: '600' }}>{source.rejected}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: '700' }}>
                        <span style={{ color: source.conversionRate > 20 ? '#34d399' : source.conversionRate > 10 ? '#fbbf24' : '#f87171' }}>
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StageCard>

        <StageCard title="📋 HR WORKLOAD">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Reviews</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#fbbf24' }}>{data.workload.pendingReviews}</div>
            </div>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Interviews</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#60a5fa' }}>{data.workload.pendingInterviews}</div>
            </div>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Scheduling</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#c084fc' }}>{data.workload.pendingScheduling}</div>
            </div>
            <div style={{ padding: '24px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '1px solid var(--primary)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#93c5fd', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pending Action</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#fff' }}>{data.workload.totalPending}</div>
            </div>
          </div>
        </StageCard>
      </div>
    </div>
  );
};

// Sub-component: Stage Card (Updated to Glass)
const StageCard = ({ title, children }) => (
  <div className="glass-panel" style={{ padding: '30px' }}>
    <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#fff', letterSpacing: '1px', fontWeight: '700' }}>
      {title}
    </h3>
    {children}
  </div>
);

// Sub-component: Metric Row (Updated for Dark Mode)
const MetricRow = ({ label, value, suffix, status, tooltip, thresholds, isLowerBetter = false }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'good': return '#34d399'; // green
      case 'watch': return '#fbbf24'; // yellow
      case 'flag': return '#f87171'; // red
      case 'too_easy': return '#c084fc'; // purple
      default: return '#94a3b8'; // gray
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'good': return 'Optimal';
      case 'watch': return 'Warning';
      case 'flag': return 'Critical';
      case 'too_easy': return 'Anomalous';
      default: return 'No Data';
    }
  };

  const displayValue = typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : '0.0';
  const color = getStatusColor(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>{label}</span>
        {tooltip && <span style={{ fontSize: '14px', cursor: 'help', color: 'var(--text-muted)' }} title={tooltip}>ℹ️</span>}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {thresholds && `(${thresholds.good} / ${thresholds.watch} / ${thresholds.flag})`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{displayValue}<span style={{fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500'}}>{suffix}</span></span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: color, background: `${color}15`, border: `1px solid ${color}40`, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
};

export default StageAnalytics;