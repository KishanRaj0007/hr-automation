// components/StageAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { calculateStageAnalytics } from '../utils/analyticsHelpers';

const StageAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [candidatesRes, assignmentsRes, interviewsRes] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('assignments').select('*'),
        supabase.from('interviews').select('*')
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];

      const analytics = calculateStageAnalytics(candidates, assignments, interviews);
      setData(analytics);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ margin: '0 0 24px 0', color: '#0f172a', fontSize: '24px', fontWeight: '700' }}>
        📊 Stage Analytics Dashboard
      </h2>

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

  // Format value
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