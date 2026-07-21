// components/StageAnalytics.jsx - WITH CALENDAR-BASED TIMEFRAMES
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
        // Get current week (Sunday to Saturday)
        const currentDay = now.getDay();
        const diffToSunday = currentDay; // Sunday is 0
        start = new Date(now);
        start.setDate(now.getDate() - diffToSunday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'month': {
        // Get current month (1st to last day)
        const selectedMonthNum = month !== null ? month : now.getMonth();
        start = new Date(year, selectedMonthNum, 1);
        end = new Date(year, selectedMonthNum + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'quarter': {
        // Get current quarter
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

  // Navigation functions
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
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p>Loading analytics...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data available</div>;
  }

  // Get current date info for navigation display
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '700' }}>
          📊 Stage Analytics Dashboard
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '400', 
            color: '#64748b',
            marginLeft: '12px'
          }}>
            ({data.timeframe?.label || 'All Time'})
          </span>
        </h2>
        
        {/* Timeframe Filter Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '6px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Navigation Arrows (for week/month/quarter) */}
          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(-1);
                else if (timeframe === 'month') navigateMonth(-1);
                else if (timeframe === 'quarter') navigateQuarter(-1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#4b5563',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.background = '#fff'}
            >
              ◀
            </button>
          )}
          
          <button
            onClick={() => setTimeframe('today')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: timeframe === 'today' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === 'today' ? '#eff6ff' : '#fff',
              color: timeframe === 'today' ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: timeframe === 'today' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Today
          </button>
          
          <button
            onClick={() => setTimeframe('week')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: timeframe === 'week' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === 'week' ? '#eff6ff' : '#fff',
              color: timeframe === 'week' ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: timeframe === 'week' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Week
          </button>
          
          <button
            onClick={() => setTimeframe('month')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: timeframe === 'month' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === 'month' ? '#eff6ff' : '#fff',
              color: timeframe === 'month' ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: timeframe === 'month' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Month
          </button>
          
          <button
            onClick={() => setTimeframe('quarter')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: timeframe === 'quarter' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === 'quarter' ? '#eff6ff' : '#fff',
              color: timeframe === 'quarter' ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: timeframe === 'quarter' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Quarter
          </button>
          
          <button
            onClick={() => setTimeframe('all')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: timeframe === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: timeframe === 'all' ? '#eff6ff' : '#fff',
              color: timeframe === 'all' ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: timeframe === 'all' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All Time
          </button>

          {/* Navigation Arrows (right) */}
          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(1);
                else if (timeframe === 'month') navigateMonth(1);
                else if (timeframe === 'quarter') navigateQuarter(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#4b5563',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.background = '#fff'}
            >
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Stage 1: Assignments */}
      <StageCard title="📝 STAGE 1: ASSIGNMENTS">
        <MetricRow 
          label="Submission Rate" 
          value={data.assignment.submissionRate} 
          suffix="%" 
          status={data.assignment.status.submissionRate}
          tooltip="Submitted / Assignment Sent × 100"
          thresholds={{ good: '60%+', watch: '50-60%', flag: 'below 40%' }}
        />
        <MetricRow 
          label="Evaluation TAT" 
          value={data.assignment.evaluationTAT} 
          suffix=" days" 
          status={data.assignment.status.evaluationTAT}
          tooltip="Evaluation Date - Submission Date"
          thresholds={{ good: '1 day', watch: '2 days', flag: '3+ days' }}
        />
        <MetricRow 
          label="Assignment Pass Rate" 
          value={data.assignment.passRate} 
          suffix="%" 
          status={data.assignment.status.passRate}
          tooltip="Passed ÷ Evaluated × 100"
          thresholds={{ good: '50-70%', watch: '35-50%', flag: 'below 35%', too_easy: '85%+' }}
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Sent: {data.assignment.sent} | Submitted: {data.assignment.submitted} | 
            Evaluated: {data.assignment.evaluated} | Passed: {data.assignment.passed} | 
            Late: {data.assignment.lateSubmissions}
          </span>
        </div>
      </StageCard>

      {/* Stage 2: R1 Scheduling */}
      <StageCard title="📅 STAGE 2: R1 SCHEDULING">
        <MetricRow 
          label="R1 TAT" 
          value={data.r1Scheduling.r1TAT} 
          suffix=" days" 
          status={data.r1Scheduling.status.r1TAT}
          tooltip="R1 Scheduled Date - Assignment Pass Date"
          thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }}
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Total R1 Interviews: {data.r1Scheduling.total}
          </span>
        </div>
      </StageCard>

      {/* Stage 3: R1 Interviews */}
      <StageCard title="🎯 STAGE 3: R1 INTERVIEWS">
        <MetricRow 
          label="Conducted Rate" 
          value={data.r1Interview.conductedRate} 
          suffix="%" 
          status={data.r1Interview.status.conductedRate}
          tooltip="Conducted / Scheduled × 100"
          thresholds={{ good: '50%+', watch: '45-50%', flag: 'below 45%' }}
        />
        <MetricRow 
          label="Moving Forward Rate" 
          value={data.r1Interview.movingForwardRate} 
          suffix="%" 
          status={data.r1Interview.status.movingForwardRate}
          tooltip="R1 Passed / Conducted × 100"
          thresholds={{ good: '50%+', watch: '30-50%', flag: 'below 30%' }}
        />
        <MetricRow 
          label="Reschedule Rate" 
          value={data.r1Interview.rescheduleRate} 
          suffix="%" 
          status={data.r1Interview.status.rescheduleRate}
          tooltip="Total Reschedules / Total Scheduled × 100"
          thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }}
          isLowerBetter
        />
        <MetricRow 
          label="Non-Response Rate" 
          value={data.r1Interview.nonResponseRate} 
          suffix="%" 
          status={data.r1Interview.status.nonResponseRate}
          tooltip="Invitations Not Accepted / Total Scheduled × 100"
          thresholds={{ good: 'under 25%', watch: '25-30%', flag: '30%+' }}
          isLowerBetter
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Scheduled: {data.r1Interview.scheduled} | Conducted: {data.r1Interview.conducted} | 
            Passed: {data.r1Interview.passed} | Rescheduled: {data.r1Interview.rescheduled}
          </span>
        </div>
      </StageCard>

      {/* Stage 4: R2 Scheduling */}
      <StageCard title="📅 STAGE 4: R2 SCHEDULING">
        <MetricRow 
          label="R2 TAT" 
          value={data.r2Scheduling.r2TAT} 
          suffix=" days" 
          status={data.r2Scheduling.status.r2TAT}
          tooltip="R2 Scheduled Date - R1 Pass Date"
          thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }}
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Total R2 Interviews: {data.r2Scheduling.total}
          </span>
        </div>
      </StageCard>

      {/* Stage 5: R2 Interviews */}
      <StageCard title="🎯 STAGE 5: R2 INTERVIEWS">
        <MetricRow 
          label="Conducted Rate" 
          value={data.r2Interview.conductedRate} 
          suffix="%" 
          status={data.r2Interview.status.conductedRate}
          tooltip="Conducted / Scheduled × 100"
          thresholds={{ good: '70%+', watch: '60-70%', flag: 'below 60%' }}
        />
        <MetricRow 
          label="Moving Forward Rate" 
          value={data.r2Interview.movingForwardRate} 
          suffix="%" 
          status={data.r2Interview.status.movingForwardRate}
          tooltip="R2 Passed / Conducted × 100"
          thresholds={{ good: '70%+', watch: '50-70%', flag: 'below 50%' }}
        />
        <MetricRow 
          label="Reschedule Rate" 
          value={data.r2Interview.rescheduleRate} 
          suffix="%" 
          status={data.r2Interview.status.rescheduleRate}
          tooltip="Total Reschedules / Total Scheduled × 100"
          thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }}
          isLowerBetter
        />
        <MetricRow 
          label="Non-Response Rate" 
          value={data.r2Interview.nonResponseRate} 
          suffix="%" 
          status={data.r2Interview.status.nonResponseRate}
          tooltip="Invitations Not Accepted / Total Scheduled × 100"
          thresholds={{ good: 'under 10%', watch: '10-15%', flag: '15%+' }}
          isLowerBetter
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Scheduled: {data.r2Interview.scheduled} | Conducted: {data.r2Interview.conducted} | 
            Passed: {data.r2Interview.passed} | Rescheduled: {data.r2Interview.rescheduled}
          </span>
        </div>
      </StageCard>

      {/* General: Withdrawal Rate */}
      <StageCard title="⚠️ GENERAL">
        <MetricRow 
          label="Withdrawal Rate" 
          value={data.general.withdrawalRate} 
          suffix="%" 
          status={data.general.status.withdrawalRate}
          tooltip="Total Withdrawals / Total Candidates × 100"
          thresholds={{ good: 'under 10%', watch: '10-15%', flag: '15%+' }}
          isLowerBetter
        />
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            📊 Total Candidates: {data.general.totalCandidates} | Withdrawn: {data.general.totalWithdrawn}
          </span>
        </div>
      </StageCard>

      {/* Source Analytics */}
      <StageCard title="📊 SOURCE ANALYTICS">
        {data.sources.topSources.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No source data available.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Source</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Selected</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Rejected</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.topSources.map((source, index) => (
                  <tr key={source.source} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                      {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}
                      {source.source}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{source.total}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#10b981' }}>{source.selected}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{source.rejected}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>
                      <span style={{
                        color: source.conversionRate > 20 ? '#10b981' : 
                               source.conversionRate > 10 ? '#f59e0b' : '#ef4444'
                      }}>
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

      {/* HR Workload */}
      <StageCard title="📋 HR WORKLOAD">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Reviews</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>
              {data.workload.pendingReviews}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Interviews</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>
              {data.workload.pendingInterviews}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Scheduling</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>
              {data.workload.pendingScheduling}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '2px solid #2563eb' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Total Pending</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>
              {data.workload.totalPending}
            </div>
          </div>
        </div>
      </StageCard>
    </div>
  );
};

// Sub-component: Stage Card
const StageCard = ({ title, children }) => (
  <div style={{
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  }}>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
      {title}
    </h3>
    {children}
  </div>
);

// Sub-component: Metric Row
const MetricRow = ({ label, value, suffix, status, tooltip, thresholds, isLowerBetter = false }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'good': return '#10b981';
      case 'watch': return '#f59e0b';
      case 'flag': return '#ef4444';
      case 'too_easy': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'good': return '✅ Good';
      case 'watch': return '⚠️ Watch';
      case 'flag': return '🚨 Flag';
      case 'too_easy': return '💜 Too Easy';
      default: return '📊';
    }
  };

  const displayValue = typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : '0.0';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderBottom: '1px solid #f1f5f9',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
          {label}
        </span>
        {tooltip && (
          <span style={{ fontSize: '14px', cursor: 'help', color: '#94a3b8' }} title={tooltip}>
            ℹ️
          </span>
        )}
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {thresholds && `(${thresholds.good} / ${thresholds.watch} / ${thresholds.flag}${thresholds.too_easy ? ' / ' + thresholds.too_easy : ''})`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontSize: '18px',
          fontWeight: '700',
          color: getStatusColor(status)
        }}>
          {displayValue}{suffix}
        </span>
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: getStatusColor(status),
          background: `${getStatusColor(status)}10`,
          padding: '2px 10px',
          borderRadius: '12px'
        }}>
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
};

export default StageAnalytics;