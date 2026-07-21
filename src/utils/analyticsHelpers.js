// utils/analyticsHelpers.js - COMPLETE FIXED VERSION

export const calculateStageAnalytics = (candidates, assignments, interviews) => {
  // Helper function to calculate average
  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Helper: Case-insensitive status check
  const isStatus = (item, statusValue) => {
    return item.status?.toLowerCase() === statusValue.toLowerCase();
  };

  // Helper: Case-insensitive result check
  const isResult = (item, resultValue) => {
    return item.result?.toLowerCase() === resultValue.toLowerCase();
  };

  // Helper: Case-insensitive round check
  const isRound = (item, roundValue) => {
    return item.round?.toString().toLowerCase() === roundValue.toString().toLowerCase();
  };

  // Helper: Check if interview is scheduled (any valid status)
  const isScheduled = (item) => {
    const status = item.status?.toLowerCase() || '';
    return status === 'scheduled' || 
           status === 'completed' || 
           status === 'evaluated' || 
           status === 'done' ||
           status === 'finished' ||
           status === 'confirmed' ||
           // If it has a result, it was definitely scheduled
           (item.result && item.result !== 'Pending' && item.result !== 'pending');
  };

  // Helper: Check if interview is conducted
  const isConducted = (item) => {
    const status = item.status?.toLowerCase() || '';
    return status === 'completed' || 
           status === 'evaluated' || 
           status === 'done' ||
           status === 'finished' ||
           // If it has a pass/reject result, it was conducted
           isResult(item, 'Passed') || 
           isResult(item, 'Selected') || 
           isResult(item, 'Rejected') || 
           isResult(item, 'Accept');
  };

  // ============ STAGE 1: ASSIGNMENTS ============
  const assignmentsSent = assignments.filter(a => 
    a.assignment_status === 'Assigned' || 
    a.assignment_status === 'Submitted' || 
    a.assignment_status === 'Evaluated'
  );
  
  const assignmentsSubmitted = assignments.filter(a => 
    a.assignment_status === 'Submitted' || 
    a.assignment_status === 'Evaluated'
  );
  
  const assignmentsEvaluated = assignments.filter(a => 
    a.assignment_status === 'Evaluated'
  );
  
  const assignmentsPassed = assignments.filter(a => {
    const totalScore = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
    return totalScore >= 6 || a.hr_scorecard_approved === true;
  });

  // Submission Rate: Submitted / Assignment Sent * 100
  const submissionRate = assignmentsSent.length > 0 
    ? (assignmentsSubmitted.length / assignmentsSent.length) * 100 
    : 0;

  // Evaluation TAT: Evaluation Date - Submission Date (in days)
  const evaluationTATs = assignmentsEvaluated
    .filter(a => a.evaluation_date && a.submitted_at)
    .map(a => {
      const evalDate = new Date(a.evaluation_date);
      const subDate = new Date(a.submitted_at);
      return Math.ceil((evalDate - subDate) / (1000 * 60 * 60 * 24));
    });
  const evaluationTAT = evaluationTATs.length > 0 ? avg(evaluationTATs) : 0;

  // Assignment Pass Rate: Passed / Evaluated * 100
  const passRate = assignmentsEvaluated.length > 0 
    ? (assignmentsPassed.length / assignmentsEvaluated.length) * 100 
    : 0;

  const lateSubmissions = assignments.filter(a => a.is_late_submission === true).length;

  // ============ STAGE 2: R1 SCHEDULING ============
  const r1Interviews = interviews.filter(i => isRound(i, 'R1') || isRound(i, '1'));
  
  // R1 TAT: R1 Scheduled Date - Assignment Pass Date (in days)
  const r1TATs = r1Interviews
    .filter(i => (i.scheduled_date || i.scheduled_date_time) && i.candidate_id)
    .map(i => {
      const candidate = candidates.find(c => c.id === i.candidate_id);
      if (!candidate) return null;
      const assignmentDate = candidate.assignment_score ? new Date(candidate.updated_at) : new Date(candidate.created_at);
      const scheduledDate = new Date(i.scheduled_date || i.scheduled_date_time);
      const diffDays = Math.ceil((scheduledDate - assignmentDate) / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : null;
    })
    .filter(d => d !== null);
  const r1TAT = r1TATs.length > 0 ? avg(r1TATs) : 0;

  // ============ STAGE 3: R1 INTERVIEWS ============
  // Use the helper functions to determine scheduled/conducted
  const r1Scheduled = r1Interviews.filter(i => isScheduled(i));
  const r1Conducted = r1Interviews.filter(i => isConducted(i));
  const r1Passed = r1Interviews.filter(i => 
    isResult(i, 'Passed') || 
    isResult(i, 'Selected') || 
    isResult(i, 'Accept')
  );
  const r1Rescheduled = r1Interviews.filter(i => (i.reschedule_count || 0) > 0);
  const r1NonResponse = r1Interviews.filter(i => 
    i.candidate_accepted === false || 
    i.candidate_accepted === null || 
    i.candidate_accepted === 'false'
  );

  const r1ConductedRate = r1Scheduled.length > 0 ? (r1Conducted.length / r1Scheduled.length) * 100 : 0;
  const r1MovingForwardRate = r1Conducted.length > 0 ? (r1Passed.length / r1Conducted.length) * 100 : 0;
  const r1RescheduleRate = r1Scheduled.length > 0 ? (r1Rescheduled.length / r1Scheduled.length) * 100 : 0;
  const r1NonResponseRate = r1Scheduled.length > 0 ? (r1NonResponse.length / r1Scheduled.length) * 100 : 0;

  // ============ STAGE 4: R2 SCHEDULING ============
  const r2Interviews = interviews.filter(i => isRound(i, 'R2') || isRound(i, '2'));
  
  // R2 TAT: R2 Scheduled Date - R1 Pass Date (in days)
  const r2TATs = r2Interviews
    .filter(i => (i.scheduled_date || i.scheduled_date_time) && i.candidate_id)
    .map(i => {
      const candidate = candidates.find(c => c.id === i.candidate_id);
      if (!candidate) return null;
      const r1Pass = interviews.find(interv => 
        interv.candidate_id === i.candidate_id && 
        (isRound(interv, 'R1') || isRound(interv, '1')) && 
        (isResult(interv, 'Passed') || isResult(interv, 'Selected') || isResult(interv, 'Accept'))
      );
      if (!r1Pass || !r1Pass.updated_at) return null;
      const passDate = new Date(r1Pass.updated_at);
      const scheduledDate = new Date(i.scheduled_date || i.scheduled_date_time);
      const diffDays = Math.ceil((scheduledDate - passDate) / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : null;
    })
    .filter(d => d !== null);
  const r2TAT = r2TATs.length > 0 ? avg(r2TATs) : 0;

  // ============ STAGE 5: R2 INTERVIEWS ============
  const r2Scheduled = r2Interviews.filter(i => isScheduled(i));
  const r2Conducted = r2Interviews.filter(i => isConducted(i));
  const r2Passed = r2Interviews.filter(i => 
    isResult(i, 'Passed') || 
    isResult(i, 'Selected') || 
    isResult(i, 'Accept')
  );
  const r2Rescheduled = r2Interviews.filter(i => (i.reschedule_count || 0) > 0);
  const r2NonResponse = r2Interviews.filter(i => 
    i.candidate_accepted === false || 
    i.candidate_accepted === null || 
    i.candidate_accepted === 'false'
  );

  const r2ConductedRate = r2Scheduled.length > 0 ? (r2Conducted.length / r2Scheduled.length) * 100 : 0;
  const r2MovingForwardRate = r2Conducted.length > 0 ? (r2Passed.length / r2Conducted.length) * 100 : 0;
  const r2RescheduleRate = r2Scheduled.length > 0 ? (r2Rescheduled.length / r2Scheduled.length) * 100 : 0;
  const r2NonResponseRate = r2Scheduled.length > 0 ? (r2NonResponse.length / r2Scheduled.length) * 100 : 0;

  // ============ GENERAL: WITHDRAWAL RATE ============
  const totalWithdrawn = candidates.filter(c => c.current_stage === 'Withdrawn').length;
  const totalCandidates = candidates.length;
  const withdrawalRate = totalCandidates > 0 ? (totalWithdrawn / totalCandidates) * 100 : 0;

  // ============ SOURCE ANALYTICS ============
  const sourceData = {};
  candidates.forEach(c => {
    const source = c.source || 'Unknown';
    if (!sourceData[source]) {
      sourceData[source] = { total: 0, selected: 0, rejected: 0 };
    }
    sourceData[source].total++;
    if (c.current_stage === 'Selected' || c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done') {
      sourceData[source].selected++;
    }
    if (c.current_stage === 'Rejected') {
      sourceData[source].rejected++;
    }
  });

  const topSources = Object.entries(sourceData)
    .map(([source, data]) => ({
      source,
      total: data.total,
      selected: data.selected,
      rejected: data.rejected,
      conversionRate: data.total > 0 ? (data.selected / data.total) * 100 : 0
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  // ============ HR WORKLOAD ============
  const pendingReviews = assignments.filter(a => a.assignment_status === 'Submitted').length;
  const pendingInterviews = interviews.filter(i => 
    i.status === 'Scheduled' && 
    (!i.result || i.result === 'Pending' || i.result === 'pending')
  ).length;
  const pendingScheduling = candidates.filter(c => 
    c.current_stage === 'Assignment' || 
    c.current_stage === 'Interview' ||
    c.current_stage === 'R1 Scheduling' ||
    c.current_stage === 'R2 Scheduling'
  ).length;

  // ============ RETURN ============
  return {
    assignment: {
      sent: assignmentsSent.length,
      submitted: assignmentsSubmitted.length,
      evaluated: assignmentsEvaluated.length,
      passed: assignmentsPassed.length,
      submissionRate,
      evaluationTAT,
      passRate,
      lateSubmissions,
      status: {
        submissionRate: getStatus(submissionRate, 60, 50),
        evaluationTAT: getStatus(evaluationTAT, 1, 2, true),
        passRate: getStatus(passRate, 50, 35, false, 85),
      }
    },
    r1Scheduling: {
      total: r1Interviews.length,
      r1TAT,
      status: { r1TAT: getStatus(r1TAT, 2, 3, true) }
    },
    r1Interview: {
      scheduled: r1Scheduled.length,
      conducted: r1Conducted.length,
      passed: r1Passed.length,
      rescheduled: r1Rescheduled.length,
      nonResponse: r1NonResponse.length,
      conductedRate: r1ConductedRate,
      movingForwardRate: r1MovingForwardRate,
      rescheduleRate: r1RescheduleRate,
      nonResponseRate: r1NonResponseRate,
      status: {
        conductedRate: getStatus(r1ConductedRate, 50, 45),
        movingForwardRate: getStatus(r1MovingForwardRate, 50, 30),
        rescheduleRate: getStatus(r1RescheduleRate, 15, 25, true),
        nonResponseRate: getStatus(r1NonResponseRate, 25, 30, true),
      }
    },
    r2Scheduling: {
      total: r2Interviews.length,
      r2TAT,
      status: { r2TAT: getStatus(r2TAT, 2, 3, true) }
    },
    r2Interview: {
      scheduled: r2Scheduled.length,
      conducted: r2Conducted.length,
      passed: r2Passed.length,
      rescheduled: r2Rescheduled.length,
      nonResponse: r2NonResponse.length,
      conductedRate: r2ConductedRate,
      movingForwardRate: r2MovingForwardRate,
      rescheduleRate: r2RescheduleRate,
      nonResponseRate: r2NonResponseRate,
      status: {
        conductedRate: getStatus(r2ConductedRate, 70, 60),
        movingForwardRate: getStatus(r2MovingForwardRate, 70, 50),
        rescheduleRate: getStatus(r2RescheduleRate, 15, 25, true),
        nonResponseRate: getStatus(r2NonResponseRate, 10, 15, true),
      }
    },
    general: {
      withdrawalRate,
      totalCandidates,
      totalWithdrawn,
      status: { withdrawalRate: getStatus(withdrawalRate, 10, 15, true) }
    },
    sources: {
      topSources,
      sourceData,
    },
    workload: {
      pendingReviews,
      pendingInterviews,
      pendingScheduling,
      totalPending: pendingReviews + pendingInterviews + pendingScheduling,
    }
  };
};

// Helper function to determine status (Good, Watch, Flag/Investigate)
const getStatus = (value, goodThreshold, investigateThreshold, isLowerBetter = false, upperGoodThreshold = null) => {
  // Handle invalid values
  if (isNaN(value) || value === 0 || value === null || value === undefined) return 'good';
  
  if (isLowerBetter) {
    // For metrics where LOWER is better (TAT, Reschedule Rate, Non-Response Rate)
    if (value <= goodThreshold) return 'good';
    if (value <= investigateThreshold) return 'watch';
    return 'flag';
  } else {
    // For metrics where HIGHER is better (Pass Rate, Conducted Rate)
    if (upperGoodThreshold && value >= upperGoodThreshold) return 'too_easy';
    if (value >= goodThreshold) return 'good';
    if (value >= investigateThreshold) return 'watch';
    return 'flag';
  }
};