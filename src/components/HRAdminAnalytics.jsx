// src/components/HRAdminAnalytics.jsx
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Loading Analytics...</p>
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
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ minHeight: '100vh', padding: '40px 60px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: 'relative', zIndex: 1 }}>
        
        {/* ===== NAVIGATION BAR ===== */}
        <div className="glass-panel animate-fade-up" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          padding: '16px 24px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/hr-dashboard')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid transparent',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ← Back to Dashboard
            </button>
            <h1 style={{ margin: '0 0 0 16px', color: '#fff', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '24px' }}>
              System Analytics
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* User Info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '6px 16px 6px 6px',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {displayRole.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canRegisterUsers() && (
              <button onClick={() => setShowRegisterModal(true)} className="btn-premium" style={{ padding: '10px 20px', fontSize: '13px' }}>
                ➕ Register User
              </button>
            )}

            <button onClick={() => setShowChangePassword(true)} className="btn-glass" style={{ padding: '10px 20px', fontSize: '13px' }}>
              🔑 Password
            </button>

            <button onClick={fetchAllData} className="btn-glass" style={{ padding: '10px 20px', fontSize: '13px' }}>
              🔄 Sync
            </button>

            <button onClick={handleLogout} className="btn-glass" style={{ padding: '10px 20px', fontSize: '13px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Registration Success Message */}
        {registrationSuccess && (
          <div className="animate-fade-up" style={{
            padding: '16px 24px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#6ee7b7',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            {registrationSuccess}
          </div>
        )}

        {/* Main Tabs */}
        <div className="glass-panel animate-fade-up delay-100" style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '30px',
          padding: '16px 24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'btn-premium' : 'btn-glass'}
            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📊 Stage Analytics
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={activeTab === 'performance' ? 'btn-premium' : 'btn-glass'}
            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            👥 Team Performance
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={activeTab === 'activity' ? 'btn-premium' : 'btn-glass'}
            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📋 Activity Log
            <span style={{
              fontSize: '10px',
              background: activeTab === 'activity' ? '#fff' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'activity' ? 'var(--primary)' : '#fff',
              padding: '2px 8px',
              borderRadius: '10px',
              marginLeft: '4px',
              fontWeight: '800'
            }}>
              Live
            </span>
          </button>
          
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

          {/* Export Reports Tab */}
          <button
            onClick={() => setActiveTab('export')}
            className={activeTab === 'export' ? 'btn-premium' : 'btn-glass'}
            style={{ 
              padding: '10px 24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: activeTab === 'export' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
              borderColor: activeTab === 'export' ? 'transparent' : 'var(--glass-border)'
            }}
          >
            📤 Export Center
          </button>
        </div>

        {/* ===== TAB RENDERERS ===== */}
        
        {/* Child Components will render here. They might currently be light-mode, 
            but this wrapper ensures the page structure remains premium. */}
        <div className="animate-fade-up delay-200">
          {activeTab === 'overview' && <StageAnalytics />}
          
          {activeTab === 'performance' && <TeamPerformance />}
          
          {activeTab === 'activity' && <TeamActivityTracker />}

          {/* ===== EXPORT REPORTS TAB ===== */}
          {activeTab === 'export' && (
            <div className="glass-panel" style={{ 
              padding: '40px', 
              maxWidth: '800px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                Data Export Center
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '15px' }}>
                Securely generate and download CSV reports for external auditing.
              </p>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '20px' 
              }}>
                <button
                  onClick={() => exportReport('candidate')}
                  disabled={exportLoading}
                  style={{
                    padding: '30px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    opacity: exportLoading ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '16px' }}>👥</div>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                    Candidate Report
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {candidates.length} records
                  </div>
                </button>

                <button
                  onClick={() => exportReport('source')}
                  disabled={exportLoading}
                  style={{
                    padding: '30px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    opacity: exportLoading ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '16px' }}>📊</div>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                    Source Matrix
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {stats.bestSources.length} channels
                  </div>
                </button>

                <button
                  onClick={() => exportReport('interview')}
                  disabled={exportLoading}
                  style={{
                    padding: '30px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    opacity: exportLoading ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '16px' }}>🎯</div>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                    Interview Audit
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {Object.keys(stats.interviewerStats).length} panelists
                  </div>
                </button>

                <button
                  onClick={() => exportReport('probation')}
                  disabled={exportLoading}
                  style={{
                    padding: '30px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    opacity: exportLoading ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                      e.currentTarget.style.borderColor = '#f59e0b';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!exportLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '16px' }}>📋</div>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                    Probation Cohort
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {candidates.filter(c => c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done').length} active
                  </div>
                </button>
              </div>

              {exportLoading && (
                <div style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  border: '1px solid var(--primary)',
                  borderRadius: '8px', 
                  textAlign: 'center',
                  color: '#60a5fa',
                  fontWeight: '600',
                  backdropFilter: 'blur(10px)'
                }}>
                  ⏳ Compiling cryptographically secure payload...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showRegisterModal && (
          <RegisterUser 
            onClose={() => setShowRegisterModal(false)}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </>
  );
}

export default HRAdminAnalytics;