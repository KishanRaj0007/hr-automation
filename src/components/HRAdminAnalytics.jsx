import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TeamPerformance from '../components/TeamPerformance';
import TeamActivityTracker from '../components/TeamActivityTracker';
import RegisterUser from '../components/RegisterUser';
import ChangePasswordModal from '../components/ChangePasswordModal';
import StageAnalytics from '../components/StageAnalytics';

function HRAdminAnalytics() {
  const navigate = useNavigate();
  const { user, userName, userRole, canRegisterUsers, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('week');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  
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

  // Check session on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('hrEmail');
    if (!storedEmail && !user) {
      navigate('/hr-login');
      return;
    }
  }, []);

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

  const handleLogout = async () => {
    await logout();
    navigate('/hr-login');
  };

  const handleRegistrationSuccess = (newUser) => {
    setRegistrationSuccess(`✅ ${newUser.name} registered successfully!`);
    setTimeout(() => setRegistrationSuccess(null), 5000);
  };

  // Get user name from AuthContext
  const displayName = userName || user?.name || localStorage.getItem('userName') || 'HR User';
  const displayRole = userRole || localStorage.getItem('userRole') || 'team_member';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* User Info */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '4px 12px 4px 8px',
            borderRadius: '8px',
            background: '#fff',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>
                {displayRole.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Register Button - Only for HR Lead and Project Manager */}
          {canRegisterUsers() && (
            <button
              onClick={() => setShowRegisterModal(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#2563eb'; }}
              onMouseLeave={(e) => { e.target.style.background = '#3b82f6'; }}
            >
              <span>➕</span> Register User
            </button>
          )}

          {/* Change Password Button - Visible to ALL users */}
          <button
            onClick={() => setShowChangePassword(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#64748b',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            🔑 Change Password
          </button>

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

          <button
            onClick={handleLogout}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Registration Success Message */}
      {registrationSuccess && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          {registrationSuccess}
        </div>
      )}

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
          📊 Stage Analytics
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

      {/* ===== STAGE ANALYTICS TAB ===== */}
      {activeTab === 'overview' && <StageAnalytics />}

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

      {/* Register User Modal */}
      {showRegisterModal && (
        <RegisterUser 
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

export default HRAdminAnalytics;