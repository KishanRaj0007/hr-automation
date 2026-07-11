import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TeamPerformance from '../components/TeamPerformance';
import TeamActivityTracker from '../components/TeamActivityTracker';

function HRAdminAnalytics() {
  const navigate = useNavigate();
  const { userRole, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('week');
  
  // All data states
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [onboardingData, setOnboardingData] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeCandidates: 0,
    selected: 0,
    rejected: 0,
    onHold: 0,
    probation: 0,
    onboardingDone: 0,
    terminated: 0,
    internshipDiscontinued: 0,
    withdrawn: 0,
    waitlist: 0,
    stageDistribution: {},
    
    // Funnel stages
    leads: 0,
    assignmentsSent: 0,
    assignmentsSubmitted: 0,
    assignmentsPassed: 0,
    round1Completed: 0,
    round2Completed: 0,
    selectedCount: 0,
    probationStarted: 0,
    probationPassed: 0,
    internshipCompleted: 0,
    
    // Conversion rates
    assignmentConversionRate: 0,
    assignmentPassRate: 0,
    round1PassRate: 0,
    round2PassRate: 0,
    selectionRate: 0,
    probationPassRate: 0,
    onboardingCompletionRate: 0,
    
    // Source analytics
    sourceDistribution: {},
    sourceSubmissions: {},
    sourceSelected: {},
    sourceProbationPass: {},
    bestSources: [],
    
    // HR Workload
    candidatesPerHR: {},
    reviewsPending: 0,
    interviewsPending: 0,
    lateSubmissions: 0,
    bottleneckStages: [],
    
    // Interviewer Analytics
    interviewerStats: {},
    
    // Reviewer Analytics
    reviewerStats: {}
  });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'performance') {
      fetchAllData();
    }
  }, [timeframe, activeTab]);

  async function fetchAllData() {
    setLoading(true);
    try {
      // Fetch all candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

      // Fetch interviews
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interviews')
        .select('*');

      if (interviewsError) throw interviewsError;
      setInterviews(interviewsData || []);

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch onboarding
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding')
        .select('*');

      if (onboardingError) throw onboardingError;
      setOnboardingData(onboardingData || []);

      // Calculate all stats
      calculateStats(candidatesData || [], interviewsData || [], assignmentsData || [], onboardingData || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(candidates, interviews, assignments, onboarding) {
    // Basic stats
    const total = candidates.length;
    const active = candidates.filter(c => 
      !['Rejected', 'Withdrawn', 'Terminated', 'Internship Discontinued'].includes(c.current_stage)
    ).length;
    const selected = candidates.filter(c => c.current_stage === 'Selected').length;
    const rejected = candidates.filter(c => c.current_stage === 'Rejected').length;
    const onHold = candidates.filter(c => c.current_stage === 'On Hold').length;
    const probation = candidates.filter(c => c.current_stage === 'Probation').length;
    const onboardingDone = candidates.filter(c => c.current_stage === 'Onboarding Done').length;
    const terminated = candidates.filter(c => c.current_stage === 'Terminated').length;
    const internshipDiscontinued = candidates.filter(c => c.current_stage === 'Internship Discontinued').length;
    const withdrawn = candidates.filter(c => c.current_stage === 'Withdrawn').length;
    const waitlist = candidates.filter(c => c.current_stage === 'Waitlist').length;

    // Stage distribution
    const stageDist = {};
    candidates.forEach(c => {
      const stage = c.current_stage || 'Unknown';
      stageDist[stage] = (stageDist[stage] || 0) + 1;
    });

    // Funnel stages
    const leads = candidates.length;
    const assignmentsSent = assignments.filter(a => a.assignment_status === 'Assigned' || a.assignment_status === 'Submitted' || a.assignment_status === 'Evaluated').length;
    const assignmentsSubmitted = assignments.filter(a => a.assignment_status === 'Submitted' || a.assignment_status === 'Evaluated').length;
    const assignmentsPassed = assignments.filter(a => {
      if (!a.content_score) return false;
      const total = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
      return total >= 6 || a.hr_scorecard_approved === true;
    }).length;
    const round1Completed = candidates.filter(c => c.r1_status === 'Passed' || c.r1_status === 'Selected').length;
    const round2Completed = candidates.filter(c => c.r2_status === 'Passed' || c.r2_status === 'Selected').length;
    const selectedCount = selected;
    const probationStarted = probation + onboardingDone + terminated + internshipDiscontinued;
    const probationPassed = onboardingDone;
    const internshipCompleted = onboardingDone;

    // Conversion rates
    const assignmentConversionRate = assignmentsSent > 0 ? (assignmentsSubmitted / assignmentsSent) * 100 : 0;
    const assignmentPassRate = assignmentsSubmitted > 0 ? (assignmentsPassed / assignmentsSubmitted) * 100 : 0;
    const round1PassRate = round1Completed > 0 ? (selectedCount / round1Completed) * 100 : 0;
    const round2PassRate = round2Completed > 0 ? (selectedCount / round2Completed) * 100 : 0;
    const selectionRate = total > 0 ? (selectedCount / total) * 100 : 0;
    const probationPassRate = probationStarted > 0 ? (probationPassed / probationStarted) * 100 : 0;
    const onboardingCompletionRate = total > 0 ? (onboardingDone / total) * 100 : 0;

    // Source analytics
    const sourceDist = {};
    const sourceSub = {};
    const sourceSel = {};
    const sourceProb = {};
    
    candidates.forEach(c => {
      const source = c.source || 'Unknown';
      sourceDist[source] = (sourceDist[source] || 0) + 1;
      
      // Check if assignment was submitted
      const hasAssignment = assignments.some(a => a.candidate_id === c.id && a.submitted_at);
      if (hasAssignment) {
        sourceSub[source] = (sourceSub[source] || 0) + 1;
      }
      
      if (c.current_stage === 'Selected' || c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done') {
        sourceSel[source] = (sourceSel[source] || 0) + 1;
      }
      
      if (c.current_stage === 'Onboarding Done') {
        sourceProb[source] = (sourceProb[source] || 0) + 1;
      }
    });

    // Best sources ranking
    const bestSources = Object.entries(sourceDist)
      .map(([source, count]) => ({
        source,
        leads: count,
        submissions: sourceSub[source] || 0,
        selected: sourceSel[source] || 0,
        conversionRate: count > 0 ? ((sourceSel[source] || 0) / count) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);

    // HR Workload - find pending reviews
    const reviewsPending = assignments.filter(a => a.assignment_status === 'Submitted').length;
    const interviewsPending = interviews.filter(i => i.result === 'Pending' && i.status === 'Scheduled').length;
    const lateSubmissions = assignments.filter(a => a.is_late_submission === true).length;

    // Bottleneck stages
    const stageCounts = {
      'Applied': candidates.filter(c => c.current_stage === 'Applied').length,
      'Assignment': candidates.filter(c => c.current_stage === 'Assignment').length,
      'Interview': candidates.filter(c => c.current_stage === 'Interview').length,
      'On Hold': onHold,
      'Selected': selected,
      'Probation': probation,
      'Onboarding Done': onboardingDone
    };
    const bottleneckStages = Object.entries(stageCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Interviewer Analytics
    const interviewerStats = {};
    interviews.forEach(i => {
      const panelists = i.panelists || [];
      panelists.forEach(panelist => {
        if (!interviewerStats[panelist]) {
          interviewerStats[panelist] = {
            assigned: 0,
            evaluated: 0,
            pending: 0,
            passed: 0,
            rejected: 0,
            completionRate: 0
          };
        }
        interviewerStats[panelist].assigned++;
        if (i.result === 'Selected') {
          interviewerStats[panelist].evaluated++;
          interviewerStats[panelist].passed++;
        } else if (i.result === 'Rejected') {
          interviewerStats[panelist].evaluated++;
          interviewerStats[panelist].rejected++;
        } else if (i.result === 'Pending') {
          interviewerStats[panelist].pending++;
        }
      });
    });

    // Calculate completion rates for interviewers
    Object.keys(interviewerStats).forEach(key => {
      const stats = interviewerStats[key];
      stats.completionRate = stats.assigned > 0 ? (stats.evaluated / stats.assigned) * 100 : 0;
    });

    // Reviewer Analytics (Assignment evaluators)
    const reviewerStats = {};
    assignments.forEach(a => {
      if (a.evaluated_by && a.assignment_status === 'Evaluated') {
        if (!reviewerStats[a.evaluated_by]) {
          reviewerStats[a.evaluated_by] = {
            total: 0,
            passed: 0,
            rejected: 0,
            passRate: 0
          };
        }
        reviewerStats[a.evaluated_by].total++;
        const totalScore = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
        if (totalScore >= 6 || a.hr_scorecard_approved === true) {
          reviewerStats[a.evaluated_by].passed++;
        } else {
          reviewerStats[a.evaluated_by].rejected++;
        }
      }
    });

    // Calculate pass rates for reviewers
    Object.keys(reviewerStats).forEach(key => {
      const stats = reviewerStats[key];
      stats.passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    });

    setStats({
      totalCandidates: total,
      activeCandidates: active,
      selected: selected,
      rejected: rejected,
      onHold: onHold,
      probation: probation,
      onboardingDone: onboardingDone,
      terminated: terminated,
      internshipDiscontinued: internshipDiscontinued,
      withdrawn: withdrawn,
      waitlist: waitlist,
      stageDistribution: stageDist,
      
      // Funnel
      leads: leads,
      assignmentsSent: assignmentsSent,
      assignmentsSubmitted: assignmentsSubmitted,
      assignmentsPassed: assignmentsPassed,
      round1Completed: round1Completed,
      round2Completed: round2Completed,
      selectedCount: selectedCount,
      probationStarted: probationStarted,
      probationPassed: probationPassed,
      internshipCompleted: internshipCompleted,
      
      // Conversion rates
      assignmentConversionRate,
      assignmentPassRate,
      round1PassRate,
      round2PassRate,
      selectionRate,
      probationPassRate,
      onboardingCompletionRate,
      
      // Source analytics
      sourceDistribution: sourceDist,
      sourceSubmissions: sourceSub,
      sourceSelected: sourceSel,
      sourceProbationPass: sourceProb,
      bestSources: bestSources,
      
      // HR Workload
      candidatesPerHR: {},
      reviewsPending: reviewsPending,
      interviewsPending: interviewsPending,
      lateSubmissions: lateSubmissions,
      bottleneckStages: bottleneckStages,
      
      // Interviewer Analytics
      interviewerStats: interviewerStats,
      
      // Reviewer Analytics
      reviewerStats: reviewerStats
    });
  }

  // Export functions
  const exportReport = async (type) => {
    setExportLoading(true);
    try {
      let data = [];
      let filename = '';
      let headers = [];

      switch(type) {
        case 'candidate':
          data = candidates;
          headers = ['ID', 'Name', 'Email', 'Phone', 'Domain', 'Source', 'Stage', 'Created At'];
          filename = 'candidate_report.csv';
          break;
        case 'source':
          data = stats.bestSources;
          headers = ['Source', 'Leads', 'Submissions', 'Selected', 'Conversion Rate (%)'];
          filename = 'source_report.csv';
          break;
        case 'interview':
          data = Object.entries(stats.interviewerStats).map(([name, s]) => ({
            name,
            assigned: s.assigned,
            evaluated: s.evaluated,
            pending: s.pending,
            passed: s.passed,
            rejected: s.rejected,
            completionRate: Math.round(s.completionRate)
          }));
          headers = ['Interviewer', 'Assigned', 'Evaluated', 'Pending', 'Passed', 'Rejected', 'Completion Rate (%)'];
          filename = 'interview_report.csv';
          break;
        case 'probation':
          const probationCandidates = candidates.filter(c => 
            c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done'
          );
          data = probationCandidates.map(c => ({
            name: c.name,
            email: c.email,
            stage: c.current_stage,
            joined: c.created_at
          }));
          headers = ['Name', 'Email', 'Stage', 'Joined'];
          filename = 'probation_report.csv';
          break;
        default:
          return;
      }

      // Create CSV
      const csvRows = [];
      csvRows.push(headers.join(','));
      
      data.forEach(row => {
        const values = Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        );
        csvRows.push(values.join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && activeTab === 'overview') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h3 style={{ color: '#334155' }}>Loading Analytics...</h3>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      padding: '30px 40px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
    }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: '700' }}>
          📊 Analytics
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchAllData}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.target.style.background = '#fff'}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: activeTab === 'overview' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: activeTab === 'overview' ? '#eff6ff' : '#fff',
            color: activeTab === 'overview' ? '#1d4ed8' : '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📈 Overview
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: activeTab === 'performance' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: activeTab === 'performance' ? '#eff6ff' : '#fff',
            color: activeTab === 'performance' ? '#1d4ed8' : '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📊 Team Performance
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: activeTab === 'activity' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
            background: activeTab === 'activity' ? '#f5f3ff' : '#fff',
            color: activeTab === 'activity' ? '#6d28d9' : '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📋 Activity Log
          <span style={{
            fontSize: '10px',
            background: activeTab === 'activity' ? '#8b5cf6' : '#e2e8f0',
            color: activeTab === 'activity' ? '#fff' : '#64748b',
            padding: '1px 8px',
            borderRadius: '10px',
            marginLeft: '4px'
          }}>
            Live
          </span>
        </button>
        {/* Export Reports Tab */}
        <button
          onClick={() => setActiveTab('export')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: activeTab === 'export' ? '2px solid #059669' : '1px solid #e2e8f0',
            background: activeTab === 'export' ? '#ecfdf5' : '#fff',
            color: activeTab === 'export' ? '#065f46' : '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📤 Export Reports
        </button>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <>
          {/* Timeframe Filter */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '24px', 
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}>
            {['week', 'month', 'year', 'all'].map(t => (
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
                {t === 'all' ? 'All Time' : t + 'ly'}
              </button>
            ))}
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '16px', 
            marginBottom: '30px' 
          }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Total Leads</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {stats.totalCandidates}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Assignments Sent</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                {stats.assignmentsSent}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Assignments Submitted</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#a855f7', marginTop: '4px' }}>
                {stats.assignmentsSubmitted}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Assignments Passed</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
                {stats.assignmentsPassed}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Round 1 Completed</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6', marginTop: '4px' }}>
                {stats.round1Completed}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Round 2 Completed</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>
                {stats.round2Completed}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Selected</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                {stats.selectedCount}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Probation Started</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                {stats.probationStarted}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Probation Passed</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#22c55e', marginTop: '4px' }}>
                {stats.probationPassed}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Internship Completed</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                {stats.internshipCompleted}
              </div>
            </div>
          </div>

          {/* Conversion Rates */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '30px' 
          }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Assignment Sent → Submitted</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb', marginTop: '4px' }}>
                {stats.assignmentConversionRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Submitted → Passed</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', marginTop: '4px' }}>
                {stats.assignmentPassRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Round 1 Pass Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', marginTop: '4px' }}>
                {stats.round1PassRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Round 2 Pass Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1', marginTop: '4px' }}>
                {stats.round2PassRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Selection Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>
                {stats.selectionRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Probation Pass Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e', marginTop: '4px' }}>
                {stats.probationPassRate.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Onboarding Completion</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
                {stats.onboardingCompletionRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Two Column Layout: Stage Distribution + Source Analytics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px', 
            marginBottom: '30px' 
          }}>
            {/* Stage Distribution */}
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
                Stage Distribution
              </h3>
              {Object.entries(stats.stageDistribution).map(([stage, count]) => {
                const colors = {
                  'Applied': '#94a3b8',
                  'Assignment': '#f59e0b',
                  'Interview': '#a855f7',
                  'On Hold': '#fbbf24',
                  'Selected': '#6366f1',
                  'Probation': '#3b82f6',
                  'Onboarding Done': '#10b981',
                  'Waitlist': '#8b5cf6',
                  'Withdrawn': '#8b5cf6',
                  'Internship Discontinued': '#f97316',
                  'Terminated': '#dc2626',
                  'Rejected': '#ef4444'
                };
                const percentage = stats.totalCandidates > 0 
                  ? Math.round((count / stats.totalCandidates) * 100) 
                  : 0;
                
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ width: '150px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                      {stage}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors[stage] || '#2563eb',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease'
                      }}></div>
                    </div>
                    <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '600', color: '#0f172a', minWidth: '60px' }}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Source Analytics */}
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
                Top Sources
              </h3>
              {stats.bestSources.slice(0, 5).map((source, index) => (
                <div key={source.source} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: index === 0 ? '#fef3c7' : '#f8fafc',
                  borderRadius: '6px',
                  border: index === 0 ? '1px solid #f59e0b' : '1px solid #e2e8f0'
                }}>
                  <span style={{ 
                    fontSize: '20px', 
                    marginRight: '12px'
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                      {source.source}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {source.leads} leads · {source.selected} selected · {source.conversionRate.toFixed(1)}% conversion
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: source.conversionRate > 20 ? '#10b981' : '#f59e0b'
                  }}>
                    {source.conversionRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* HR Workload & Bottlenecks */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px', 
            marginBottom: '30px' 
          }}>
            {/* HR Workload */}
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
                📋 HR Workload
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Reviews Pending</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>
                    {stats.reviewsPending}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Interviews Pending</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6' }}>
                    {stats.interviewsPending}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Late Submissions</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#ef4444' }}>
                    {stats.lateSubmissions}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Active Candidates</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>
                    {stats.activeCandidates}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottleneck Stages */}
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
                🚧 Bottleneck Stages
              </h3>
              {stats.bottleneckStages.length > 0 ? (
                stats.bottleneckStages.map(([stage, count]) => (
                  <div key={stage} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '12px',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    borderRadius: '6px',
                    border: '1px solid #fecaca'
                  }}>
                    <span style={{ fontSize: '20px', marginRight: '12px' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                        {stage}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                        {count} candidates waiting
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#991b1b'
                    }}>
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                  No bottlenecks detected ✅
                </p>
              )}
            </div>
          </div>

          {/* Interviewer Analytics */}
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
              🎯 Interviewer Analytics
            </h3>
            {Object.keys(stats.interviewerStats).length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Interviewer</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Assigned</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Evaluated</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Pending</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Passed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Rejected</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.interviewerStats).map(([name, s]) => (
                      <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '500' }}>{name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.assigned}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.evaluated}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.pending}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#10b981' }}>{s.passed}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{s.rejected}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>
                          <span style={{
                            color: s.completionRate > 70 ? '#10b981' : s.completionRate > 40 ? '#f59e0b' : '#ef4444'
                          }}>
                            {s.completionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                No interviewer data available yet.
              </p>
            )}
          </div>

          {/* Reviewer Analytics */}
          <div style={{ 
            background: '#fff', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0' 
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
              📝 Reviewer Analytics (Assignment Evaluation)
            </h3>
            {Object.keys(stats.reviewerStats).length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Reviewer</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Total</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Passed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Rejected</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.reviewerStats).map(([name, s]) => (
                      <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '500' }}>{name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.total}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#10b981' }}>{s.passed}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{s.rejected}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>
                          <span style={{
                            color: s.passRate > 50 ? '#10b981' : '#ef4444'
                          }}>
                            {s.passRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                No reviewer data available yet.
              </p>
            )}
          </div>
        </>
      )}

      {/* ===== TEAM PERFORMANCE TAB ===== */}
      {activeTab === 'performance' && (
        <TeamPerformance />
      )}

      {/* ===== ACTIVITY LOG TAB ===== */}
      {activeTab === 'activity' && (
        <div style={{ marginTop: '10px' }}>
          <TeamActivityTracker />
        </div>
      )}

      {/* ===== EXPORT REPORTS TAB ===== */}
      {activeTab === 'export' && (
        <div style={{ 
          background: '#fff', 
          padding: '32px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '22px' }}>
            📤 Export Reports
          </h2>
          <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>
            Export data as CSV files for further analysis
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <button
              onClick={() => exportReport('candidate')}
              disabled={exportLoading}
              style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                opacity: exportLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                Candidate Report
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {candidates.length} candidates
              </div>
            </button>

            <button
              onClick={() => exportReport('source')}
              disabled={exportLoading}
              style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                opacity: exportLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#8b5cf6';
                }
              }}
              onMouseLeave={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                Source Report
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {stats.bestSources.length} sources
              </div>
            </button>

            <button
              onClick={() => exportReport('interview')}
              disabled={exportLoading}
              style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                opacity: exportLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                Interview Report
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {Object.keys(stats.interviewerStats).length} interviewers
              </div>
            </button>

            <button
              onClick={() => exportReport('probation')}
              disabled={exportLoading}
              style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                opacity: exportLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#f59e0b';
                }
              }}
              onMouseLeave={(e) => {
                if (!exportLoading) {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                Probation Report
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {candidates.filter(c => c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done').length} candidates
              </div>
            </button>
          </div>

          {exportLoading && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              background: '#eff6ff', 
              borderRadius: '6px', 
              textAlign: 'center',
              color: '#2563eb',
              fontWeight: '500'
            }}>
              ⏳ Generating report...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HRAdminAnalytics;