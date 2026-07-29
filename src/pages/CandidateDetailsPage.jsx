import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const DOMAIN_ASSIGNMENT_LINKS = {
  "Automation & Operations": "https://docs.google.com/document/d/1Fx6qmrIjls92CKTHZPzLUemFZHVcsxOlnPeU48vUes0/edit?usp=drive_link",
  "Brand Management & Outreach": "https://docs.google.com/document/d/1nR3M-RTkETWXoR89_DqVaOlbU4cFPM38oNshL9DekII/edit?usp=drive_link",
  "Business Development": "https://docs.google.com/document/d/1gXY9DXjR5ddvs3FWzytbkPBqpovVMvYL-mREV8/edit?usp=drive_link",
  "Clinical Psychologist": "https://docs.google.com/document/d/1zUT32sAcXiWuzy-F49eUXmnOn_o_3nUF41mH1USI7Lc/edit?usp=drive_link",
  "Content Creation": "https://docs.google.com/document/d/1VLxlCu67y_QUFEnypeVhdJQjOsbAub-pezFEH1PxU0o/edit?usp=drive_link",
  "Creative Design": "https://docs.google.com/document/d/1Jx5y6G-gQ0TOcxRRzJ4DODuJl840nohAM3CK0wjA3NU/edit?usp=drive_link",
  "Graphic Design": "https://docs.google.com/document/d/1IDzwWvQHkIF2eFdWHCqtoMlRtTxTR7CRgnBVfyRtiG0/edit?usp=drive_link",
  "HR Psychologist": "https://docs.google.com/document/d/1-KzoBvfOGGvPOwVYWsc9g0D18um3Z4NVd2uiPXv3tWA/edit?usp=drive_link",
  "Human Resources (HR)": "https://docs.google.com/document/d/1c3ad6UexWzChlKCnRL0VVdHfwe3LUy3TYI4Dpv9dT6g/edit?usp=drive_link",
  "Lead Generation": "https://docs.google.com/document/d/1kSBmHXirw-0MhjdCsThcoAOxcHYG3dRUhWHNRpGXRs4/edit?usp=drive_link",
  "Marketing": "https://docs.google.com/document/d/1nm_8xBVtPdBCcnjiDEYlbXBUHTWC3bLAWzM_lCAL4hE/edit?usp=drive_link",
  "Media & Public Relations (PR)": "https://docs.google.com/document/d/1a80WOdBq23d9AYqg_OsySG8QKTUNNk85YSH7x1LvvUM/edit?usp=drive_link",
  "Motion Graphics": "https://docs.google.com/document/d/1QPn2gMvpzFJle6MnsZJd_o07uBZCpp4I5FlrbT0XMIU/edit?usp=drive_link",
  "Operations": "https://docs.google.com/document/d/1KVJ15x6PMZHfbk2W4XCMHPNgthr1au6Q2-70QoKTQm4ZI/edit?usp=drive_link",
  "Project Management": "https://docs.google.com/document/d/1ghbQs8PoPkAfEV5oJ8bRStmIXrO6334NsADa-X88vVY/edit?usp=drive_link",
  "Python Automation": "https://docs.google.com/document/d/1DVcbbnkZPqiPXDc-6ipx_0oTj8Q_THnnK22uOEV2U6w/edit?usp=drive_link",
  "Sales and Marketing": "https://docs.google.com/document/d/1HbS-_TnnqycKi0bQ4A-7mRKGBXZkOhIHbX2PpypQKPg/edit?usp=drive_link",
  "Social Media Management": "https://docs.google.com/document/d/133F3YzYtOWAuqb_-AQQ6MmRYryLX51Q0nmSHqBHEdgw/edit?usp=drive_link",
  "Talent Acquisition": "https://docs.google.com/document/d/1sFXAja3ka1-gqyCKfot112CFCzBPiROtEjEpnswG0Jc/edit?usp=sharing",
  "Video Editing/Making": "https://docs.google.com/document/d/14BUj5SO1ZNyqXtd2MM1lxMkXeMwvtY8rb39m2c_Wh74/edit?usp=drive_link",
  "UI/UX Design": "https://docs.google.com/document/d/1Zs3Jo35y8USq4plJi4FLdk0Ufjxli0hKOvBteE62DnA/edit?usp=drive_link",
  "Full stack Developer": "https://docs.google.com/document/d/1ksB6T-I1nUd49ENcaECLPh6aKlYFx4wyBTk1Tp5tDmg/edit?usp=sharing"
};

// ===== HELPER: Format IST Date =====
function formatIST(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
}

// ===== HELPER: Get IST Date =====
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

// ===== ACTIVITY LOGGING HELPER =====
async function logTeamActivity(action, entityType, entityId, details = {}) {
  const hrUser = localStorage.getItem('hrEmail') || 'system';
  const hrName = localStorage.getItem('userName') || 'System';
  const hrRole = localStorage.getItem('userRole') || 'system';
  const hrTeam = localStorage.getItem('userTeam') || 'leadership';

  if (action === 'interview_scheduled' && details) {
    details.panel = details.panel || 'Panelist Not Assigned';
  }

  try {
    await supabase
      .from('team_activity_log')
      .insert({
        user_email: hrUser,
        user_name: hrName,
        user_role: hrRole,
        team: hrTeam,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        details: details
      });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
// ===== END ACTIVITY LOGGING HELPER =====

function CandidateDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [onboarding, setOnboarding] = useState(null);

  const [hrNotes, setHrNotes] = useState('');
  const [scores, setScores] = useState({ content: '', formatting: '', ai: '' });
  
  const [scheduleInput, setScheduleInput] = useState({ 
    panel: '', 
    link: '', 
    date: '', 
    startTime: '', 
    endTime: '' 
  });
  
  const [probationInput, setProbationInput] = useState({
    date: '',
    startTime: '',
    endTime: '',
    link: ''
  });
  
  const [roundGrades, setRoundGrades] = useState({});
  const [overrideReason, setOverrideReason] = useState('');
  const [rescheduleRequest, setRescheduleRequest] = useState(null);

  const [candidateQuestions, setCandidateQuestions] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isAddingFAQ, setIsAddingFAQ] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' });
  
  const [similarFAQ, setSimilarFAQ] = useState(null);
  const [checkingSimilar, setCheckingSimilar] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistReason, setWaitlistReason] = useState('');
  const [waitlistNotes, setWaitlistNotes] = useState('');

  const [showHRRescheduleModal, setShowHRRescheduleModal] = useState(false);
  const [hrRescheduleData, setHrRescheduleData] = useState({
    interviewId: null,
    panel: '',
    link: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  const [downloadLoading, setDownloadLoading] = useState(false);

  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFilesModal, setShowFilesModal] = useState(false);

  useEffect(() => {
    fetchCompleteProfile();
  }, [id]);

  useEffect(() => {
    if (candidate) {
      fetchCandidateQuestions();
      fetchUploadedFiles();
    }
  }, [candidate]);

  useEffect(() => {
    if (!faqForm.question) {
      setSimilarFAQ(null);
      return;
    }
    
    const checkDuplicate = async () => {
      setCheckingSimilar(true);
      const result = await checkFAQExists(faqForm.question);
      setSimilarFAQ(result.exists ? result.match : null);
      setCheckingSimilar(false);
    };
    
    const timer = setTimeout(checkDuplicate, 600);
    return () => clearTimeout(timer);
  }, [faqForm.question]);

  async function fetchUploadedFiles() {
    if (!candidate) return;
    
    const { data, error } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching uploaded files:', error);
    } else {
      setUploadedFiles(data || []);
    }
  }

  const handleDownloadResume = async () => {
    if (!candidate?.resume_link) {
      alert('No resume available to download.');
      return;
    }

    try {
      setDownloadLoading(true);
      const downloadBtn = document.getElementById('downloadResumeBtn');
      if (downloadBtn) {
        downloadBtn.textContent = 'Downloading...';
        downloadBtn.disabled = true;
      }

      const response = await fetch(candidate.resume_link);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidate.name || 'candidate'}_resume.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setDownloadLoading(false);
      const downloadBtn = document.getElementById('downloadResumeBtn');
      if (downloadBtn) {
        downloadBtn.textContent = '📥 Download Resume';
        downloadBtn.disabled = false;
      }
    }
  };

  const handleFileDownload = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  async function fetchCompleteProfile() {
    const { data: c } = await supabase.from('candidates').select('*').eq('id', id).single();
    if (!c) return;
    setCandidate(c);
    setHrNotes(c.hr_notes || '');

    const { data: a } = await supabase.from('assignments').select('*').eq('candidate_id', id).maybeSingle();
    setAssignment(a);
    if (a) {
      setScores({ content: a.content_score ?? '', formatting: a.formatting_score ?? '', ai: a.ai_score ?? '' });
    }

    const { data: i } = await supabase.from('interviews').select('*').eq('candidate_id', id).order('id', { ascending: true });
    setInterviews(i || []);

    let { data: o, error: fetchError } = await supabase.from('onboarding').select('*').eq('candidate_id', id).maybeSingle();
    
    if (!o) {
      const { data: newOnboarding, error: createError } = await supabase
        .from('onboarding')
        .upsert({ candidate_id: id, onboarding_status: 'Pending', probation_status: 'Pending' }, { onConflict: 'candidate_id' })
        .select()
        .single();
      if (!createError) o = newOnboarding;
    }
    setOnboarding(o);
    setRescheduleRequest(null);

    const activeRequestedInterview = (i || []).find(iv => iv.status === 'Reschedule_Requested');
    if (activeRequestedInterview) {
      const { data: req } = await supabase
        .from('interview_reschedule_requests')
        .select('*')
        .eq('interview_id', activeRequestedInterview.id)
        .eq('status', 'Pending')
        .maybeSingle();
      if (req) setRescheduleRequest(req);
    }
  }

  async function fetchCandidateQuestions() {
    if (!candidate) return;
    const { data, error } = await supabase
      .from('candidate_questions')
      .select('*, question_replies(*)')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    if (!error) setCandidateQuestions(data || []);
  }

  async function handleReplyToQuestion(questionId) {
    if (!replyText.trim()) { alert('Please enter your reply.'); return; }
    
    const { error: replyError } = await supabase
      .from('question_replies')
      .insert({
        question_id: questionId,
        reply: replyText.trim(),
        replied_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
        is_hr_reply: true
      });
    
    if (replyError) { alert(`Failed to send reply: ${replyError.message}`); return; }
    
    await supabase.from('candidate_questions').update({ status: 'Replied', updated_at: new Date().toISOString() }).eq('id', questionId);
    
    const question = candidateQuestions.find(q => q.id === questionId);
    await logTeamActivity('hr_replied_to_question', 'candidate_question', questionId, {
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      question: question?.question || 'Question',
      reply: replyText.trim()
    });
    
    alert('✅ Reply sent to candidate!');
    setReplyText('');
    setReplyingTo(null);
    fetchCandidateQuestions();
  }

  async function handleMarkAsFAQ(questionId) {
    const question = candidateQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    await logTeamActivity('faq_marked_from_question', 'candidate_question', questionId, {
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      question: question.question
    });
    
    setFaqForm({ question: question.question, answer: '', category: 'General', questionId: questionId });
    setIsAddingFAQ(true);
    setSimilarFAQ(null);
  }

  async function checkFAQExists(question) {
    if (!question) return { exists: false, match: null };
    const normalizedQuestion = question.trim().toLowerCase();
    const { data, error } = await supabase.from('faqs').select('question, id').eq('is_active', true);
    
    if (error || data.length === 0) return { exists: false, match: null };
    
    const stopWords = ['what', 'is', 'the', 'are', 'for', 'to', 'of', 'a', 'an', 'on', 'at', 'by', 'in', 'with', 'without', 'and', 'or', 'but', 'for', 'nor', 'from', 'so', 'yet', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'will', 'would', 'could', 'should', 'may', 'might', 'must'];
    const keywords = normalizedQuestion.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (keywords.length === 0) return { exists: false, match: null };
    
    for (const faq of data) {
      const existingNormalized = faq.question.trim().toLowerCase();
      if (existingNormalized === normalizedQuestion) return { exists: true, match: faq };
      
      const existingWords = existingNormalized.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').filter(word => word.length > 2 && !stopWords.includes(word));
      const matchedKeywords = keywords.filter(keyword => existingWords.some(word => word === keyword));
      const matchRatio = matchedKeywords.length / keywords.length;
      
      if (matchRatio >= 0.65) return { exists: true, match: faq };
      if (keywords.length >= 3) {
        const longKeywords = keywords.filter(k => k.length > 4);
        if (longKeywords.length > 0) {
          const matchedLong = longKeywords.filter(k => existingNormalized.includes(k));
          if (matchedLong.length / longKeywords.length >= 0.8) return { exists: true, match: faq };
        }
      }
    }
    return { exists: false, match: null };
  }

  async function handleAddFAQ(e) {
    e.preventDefault();
    if (!faqForm.answer.trim()) { alert('Please enter the FAQ answer.'); return; }
    
    const result = await checkFAQExists(faqForm.question);
    if (result.exists) {
      const confirmed = window.confirm(`⚠️ A similar question already exists in the FAQ list:\n\n"${result.match.question}"\n\nDo you still want to add this as a new FAQ?`);
      if (!confirmed) return;
    }
    
    const { data, error } = await supabase.from('faqs').insert({
      question: faqForm.question,
      answer: faqForm.answer.trim(),
      category: faqForm.category || 'General',
      is_active: true,
      created_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR'
    }).select().single();
    
    if (error) { alert(`Failed to add FAQ: ${error.message}`); } else {
      await logTeamActivity('faq_added', 'faq', data?.id || null, {
        question: faqForm.question, category: faqForm.category || 'General',
        added_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
        source_question_id: faqForm.questionId || null
      });
      alert('✅ FAQ added successfully!');
      await supabase.from('candidate_questions').update({ is_public: true }).eq('id', faqForm.questionId || candidateQuestions.find(q => q.question === faqForm.question)?.id);
      setIsAddingFAQ(false);
      setFaqForm({ question: '', answer: '', category: '', questionId: null });
      setSimilarFAQ(null);
      fetchCandidateQuestions();
    }
  }

  async function handleWithdrawCandidate() {
    if (!withdrawReason.trim()) { alert('Please enter a reason for withdrawal.'); return; }
    try {
      const { error } = await supabase.from('candidates').update({ 
        current_stage: 'Withdrawn',
        hr_notes: candidate.hr_notes ? `${candidate.hr_notes}\n\n[WITHDRAWN] ${new Date().toLocaleString()}: ${withdrawReason.trim()}` : `[WITHDRAWN] ${new Date().toLocaleString()}: ${withdrawReason.trim()}`
      }).eq('id', id);

      if (error) { alert(`Failed to withdraw candidate: ${error.message}`); return; }

      await logTeamActivity('candidate_withdrawn', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, reason: withdrawReason.trim() });
      alert('✅ Candidate has been marked as Withdrawn.');
      setShowWithdrawModal(false);
      setWithdrawReason('');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while withdrawing the candidate.'); }
  }

  async function handleWaitlistCandidate() {
    if (!waitlistReason.trim()) { alert('Please enter a reason for adding to waitlist.'); return; }
    const restoreStage = candidate.current_stage;
    try {
      const istDate = getISTDate();
      const istTimestamp = istDate.toISOString();
      const istFormatted = istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      const { error } = await supabase.from('candidates').update({ 
        current_stage: 'Waitlist', waitlist_restore_stage: restoreStage, waitlist_reason: waitlistReason.trim(), waitlist_notes: waitlistNotes.trim() || null, waitlisted_at: istTimestamp, waitlist_status: 'Active',
        hr_notes: candidate.hr_notes ? `${candidate.hr_notes}\n\n[WAITLISTED] ${istFormatted}: ${waitlistReason.trim()}` : `[WAITLISTED] ${istFormatted}: ${waitlistReason.trim()}`
      }).eq('id', id);

      if (error) { alert(`Failed to add candidate to waitlist: ${error.message}`); return; }

      await logTeamActivity('candidate_waitlisted', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, reason: waitlistReason.trim(), restore_stage: restoreStage, waitlisted_at: istFormatted });

      const waitlistMessage = `Dear ${candidate.name || 'Candidate'},\n\nThank you for your interest in joining Jarurat Care Foundation. We have reviewed your application and appreciate the time and effort you've invested in our recruitment process.\n\nWhile we are impressed with your profile, we currently do not have an opening that perfectly matches your skills and experience. However, we believe you would be a valuable addition to our team in the future.\n\nWe have placed your application on our waitlist. Should a suitable position become available in the coming months, we will reach out to you directly with an opportunity to reopen your application.\n\nWe appreciate your understanding and wish you the very best in your career journey.\n\nWarm regards,\nHR Team\nJarurat Care Foundation`;
      const { error: questionError } = await supabase.from('candidate_questions').insert({ candidate_id: id, candidate_name: candidate.name || candidate.full_name, candidate_email: candidate.email, question: `📋 Application Status Update`, status: 'Replied', is_public: false, is_system_message: true, created_at: new Date().toISOString() });

      if (!questionError) {
        const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
        if (questionData) {
          await supabase.from('question_replies').insert({ question_id: questionData.id, reply: waitlistMessage, replied_by: 'Jarurat Care Foundation', is_hr_reply: false, is_system_reply: true, created_at: new Date().toISOString() });
        }
      }

      alert('✅ Candidate has been added to the waitlist.');
      setShowWaitlistModal(false);
      setWaitlistReason('');
      setWaitlistNotes('');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while adding the candidate to waitlist.'); }
  }

  async function handleRestoreFromWaitlist() {
    if (!candidate.waitlist_restore_stage) { alert('No restore stage found for this candidate.'); return; }
    try {
      const istDate = getISTDate();
      const istFormatted = istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      const { error } = await supabase.from('candidates').update({ 
        current_stage: candidate.waitlist_restore_stage, waitlist_status: 'Restored', waitlist_restored_at: istDate.toISOString(),
        hr_notes: candidate.hr_notes ? `${candidate.hr_notes}\n\n[RESTORED FROM WAITLIST] ${istFormatted}` : `[RESTORED FROM WAITLIST] ${istFormatted}`
      }).eq('id', id);

      if (error) { alert(`Failed to restore candidate: ${error.message}`); return; }

      await logTeamActivity('candidate_restored_from_waitlist', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, restored_stage: candidate.waitlist_restore_stage, restored_at: istFormatted });

      const restoreMessage = `Dear ${candidate.name || 'Candidate'},\n\nWe hope this message finds you well!\n\nWe are pleased to inform you that a position matching your profile has become available at Jarurat Care Foundation. Your application is being reopened from our waitlist.\n\nYou can now log in to your candidate portal to continue the recruitment process from where you left off. Please check your portal for the next steps.\n\nWe look forward to reconnecting with you!\n\nWarm regards,\nHR Team\nJarurat Care Foundation`;
      const { error: questionError } = await supabase.from('candidate_questions').insert({ candidate_id: id, candidate_name: candidate.name || candidate.full_name, candidate_email: candidate.email, question: `🔔 Application Reopened`, status: 'Replied', is_public: false, is_system_message: true, created_at: new Date().toISOString() });

      if (!questionError) {
        const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
        if (questionData) {
          await supabase.from('question_replies').insert({ question_id: questionData.id, reply: restoreMessage, replied_by: 'Jarurat Care Foundation', is_hr_reply: false, is_system_reply: true, created_at: new Date().toISOString() });
        }
      }

      alert('✅ Candidate has been restored from the waitlist.');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while restoring the candidate.'); }
  }

  async function handleHRRescheduleInterview() {
    const { interviewId, panel, link, date, startTime, endTime, reason } = hrRescheduleData;
    if (!date || !startTime || !endTime || !link) { alert("Please specify the date, start time, end time, and meeting link."); return; }
    if (startTime >= endTime) { alert("End time must be after start time."); return; }

    try {
      const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
      const endDateTime = new Date(`${date}T${endTime}:00+05:30`);
      const timeSlotDisplay = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;

      const updateData = { scheduled_date_time: startDateTime.toISOString(), scheduled_end_time: endDateTime.toISOString(), time_slot: timeSlotDisplay, meeting_link: link, status: 'Scheduled', result: 'Pending' };
      if (panel && panel.trim() !== '') { updateData.panelists = [panel.trim()]; }

      const { error: updateError } = await supabase.from('interviews').update(updateData).eq('id', interviewId);
      if (updateError) { alert(`Failed to update interview: ${updateError.message}`); return; }

      await logTeamActivity('interview_rescheduled_by_hr', 'interview', interviewId, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, new_date: date, new_startTime: startTime, new_endTime: endTime, panel: panel, reason: reason || 'Rescheduled by HR' });

      const rescheduleMessage = `Dear ${candidate.name || 'Candidate'},\n\nYour interview has been rescheduled by the HR team.\n\nNew Interview Details:\n📅 Date: ${formatDateDisplay(date)}\n⏰ Time: ${timeSlotDisplay} (IST)\n🔗 Meeting Link: ${link}\n\nPlease make yourself available at the new time. If you have any concerns, please reach out to the HR team.\n\nBest regards,\nHR Team\nJarurat Care Foundation`;
      const { error: questionError } = await supabase.from('candidate_questions').insert({ candidate_id: id, candidate_name: candidate.name || candidate.full_name, candidate_email: candidate.email, question: `📅 Interview Rescheduled`, status: 'Replied', is_public: false, is_system_message: true, created_at: new Date().toISOString() });

      if (!questionError) {
        const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
        if (questionData) {
          await supabase.from('question_replies').insert({ question_id: questionData.id, reply: rescheduleMessage, replied_by: 'Jarurat Care Foundation', is_hr_reply: false, is_system_reply: true, created_at: new Date().toISOString() });
        }
      }

      await supabase.from('interview_reschedule_requests').delete().eq('interview_id', interviewId).eq('status', 'Pending');

      alert(`✅ The interview has been successfully rescheduled for ${timeSlotDisplay}.`);
      setShowHRRescheduleModal(false);
      setHrRescheduleData({ interviewId: null, panel: '', link: '', date: '', startTime: '', endTime: '', reason: '' });
      await fetchCompleteProfile();
    } catch (err) { alert(`An unexpected error occurred: ${err.message}`); }
  }

  async function handleSendAssignment() {
    const mappedTemplateLink = DOMAIN_ASSIGNMENT_LINKS[candidate.domain];
    if (!mappedTemplateLink) { alert(`No task URL template payload mapped for domain: ${candidate.domain}`); return; }

    const deadlineTime = new Date();
    deadlineTime.setDate(deadlineTime.getDate() + 2);

    const { data, error } = await supabase.from('assignments').upsert({
      candidate_id: id, assignment_title: `${candidate.domain} Core Assignment Challenge`, task_link_template: mappedTemplateLink, deadline: deadlineTime.toISOString(), assignment_status: 'Assigned', sent_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System Admin', sent_date: new Date().toISOString()
    }, { onConflict: 'candidate_id' }).select();

    if (error) { alert(`Failed to send assignment: ${error.message}`); return; }

    await supabase.from('candidates').update({ current_stage: 'Assignment' }).eq('id', id);
    await logTeamActivity('assignment_sent', 'assignment', data?.[0]?.id || id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, domain: candidate.domain, deadline: deadlineTime.toISOString() });
    
    alert('Assignment link dispatched.');
    fetchCompleteProfile();
  }

  async function handleSaveEvaluation() {
    if (assignment?.assignment_status === 'Evaluated') { alert('Assignment has already been evaluated.'); return; }
    
    const cScore = parseFloat(scores.content) || 0;
    const fScore = parseFloat(scores.formatting) || 0;
    const aiScore = parseFloat(scores.ai) || 0;
    const calculatedTotal = cScore + fScore - aiScore;
    const currentUser = localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'Unknown';

    const { error: assignError } = await supabase.from('assignments').update({ content_score: cScore, formatting_score: fScore, ai_score: aiScore, assignment_status: 'Evaluated', evaluated_by: currentUser, evaluation_date: new Date().toISOString() }).eq('candidate_id', id);

    if (assignError) { alert(`Failed to save matrix grades: ${assignError.message}`); return; }

    await logTeamActivity('assignment_evaluated', 'assignment', assignment?.id || id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, total_score: calculatedTotal, content_score: cScore, formatting_score: fScore, ai_score: aiScore });

    if (calculatedTotal < 6) {
      await supabase.from('candidates').update({ assignment_score: Math.round(calculatedTotal) }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (< 6).\nCandidate kept in 'Assignment' stage for custom manual selection triage override.`);
    } else {
      await supabase.from('candidates').update({ current_stage: 'Interview', r1_status: 'Pending', assignment_score: Math.round(calculatedTotal) }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (>= 6).\nPipeline advanced to 'Interview' state, and Round 1 has been provisioned.`);
    }
    fetchCompleteProfile();
  }

  async function handleScheduleInterview(roundName) {
    if (!scheduleInput.date || !scheduleInput.startTime || !scheduleInput.endTime || !scheduleInput.link) { alert("Please specify the date, start time, end time, and meeting link."); return; }
    if (scheduleInput.startTime >= scheduleInput.endTime) { alert("End time must be after start time."); return; }

    const startDateTime = new Date(`${scheduleInput.date}T${scheduleInput.startTime}:00+05:30`);
    const endDateTime = new Date(`${scheduleInput.date}T${scheduleInput.endTime}:00+05:30`);
    const timeSlotDisplay = `${formatTimeForDisplay(scheduleInput.startTime)} - ${formatTimeForDisplay(scheduleInput.endTime)}`;

    let panelistsArray = [];
    const panelValue = scheduleInput.panel?.trim() || '';
    if (panelValue !== '') { panelistsArray = panelValue.includes(',') ? panelValue.split(',').map(p => p.trim()).filter(p => p !== '') : [panelValue]; }
    if (panelistsArray.length === 0) { panelistsArray = ['Panelist Not Assigned']; }

    const interviewData = {
      candidate_id: parseInt(id), round: roundName, scheduled_date_time: startDateTime.toISOString(), scheduled_end_time: endDateTime.toISOString(), time_slot: timeSlotDisplay, panelists: panelistsArray, meeting_link: scheduleInput.link, result: 'Pending', status: 'Scheduled', scheduled_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System', scheduled_date: new Date().toISOString()
    };

    const { data, error } = await supabase.from('interviews').insert(interviewData).select(); 

    if (error) { alert(`❌ Database Error: ${error.message}`); return; }

    const statusField = roundName === 'R1' ? { r1_status: 'Scheduled' } : { r2_status: 'Scheduled' };
    await supabase.from('candidates').update(statusField).eq('id', id);
    
    await logTeamActivity('interview_scheduled', 'interview', data?.[0]?.id || id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, round: roundName, date: scheduleInput.date, startTime: scheduleInput.startTime, endTime: scheduleInput.endTime, panel: panelValue || 'Panelist Not Assigned' });
    
    alert(`Interview ${roundName} scheduled successfully for ${timeSlotDisplay}!`);
    setScheduleInput({ panel: '', link: '', date: '', startTime: '', endTime: '' });
    fetchCompleteProfile();
  }

  async function handleScheduleProbationMeeting() {
    if (!probationInput.date || !probationInput.startTime || !probationInput.endTime || !probationInput.link) { alert("Please specify the date, start time, end time, and meeting link for the probation meeting."); return; }
    if (probationInput.startTime >= probationInput.endTime) { alert("End time must be after start time."); return; }

    const startDateTime = new Date(`${probationInput.date}T${probationInput.startTime}:00+05:30`);
    const endDateTime = new Date(`${probationInput.date}T${probationInput.endTime}:00+05:30`);

    const { error } = await supabase.from('onboarding').update({ probation_meeting_date: startDateTime.toISOString(), probation_meeting_end: endDateTime.toISOString(), probation_meeting_link: probationInput.link, probation_meeting_scheduled: true }).eq('candidate_id', id);

    if (error) { alert(`❌ Failed to schedule probation meeting: ${error.message}`); return; }

    const timeSlotDisplay = `${formatTimeForDisplay(probationInput.startTime)} - ${formatTimeForDisplay(probationInput.endTime)}`;
    const probationMessage = `Dear ${candidate.name || 'Candidate'},\n\nYour probation meeting has been scheduled.\n\nMeeting Details:\n📅 Date: ${formatDateDisplay(probationInput.date)}\n⏰ Time: ${timeSlotDisplay} (IST)\n🔗 Meeting Link: ${probationInput.link}\n\nPlease join the meeting at the scheduled time.\n\nBest regards,\nHR Team\nJarurat Care Foundation`;

    const { error: questionError } = await supabase.from('candidate_questions').insert({ candidate_id: id, candidate_name: candidate.name || candidate.full_name, candidate_email: candidate.email, question: `📅 Probation Meeting Scheduled`, status: 'Replied', is_public: false, is_system_message: true, created_at: new Date().toISOString() });

    if (!questionError) {
      const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
      if (questionData) {
        await supabase.from('question_replies').insert({ question_id: questionData.id, reply: probationMessage, replied_by: 'Jarurat Care Foundation', is_hr_reply: false, is_system_reply: true, created_at: new Date().toISOString() });
      }
    }

    await logTeamActivity('probation_meeting_scheduled', 'onboarding', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, date: probationInput.date, startTime: probationInput.startTime, endTime: probationInput.endTime });

    alert(`✅ Probation meeting scheduled successfully for ${timeSlotDisplay} on ${formatDateDisplay(probationInput.date)}!`);
    setProbationInput({ date: '', startTime: '', endTime: '', link: '' });
    fetchCompleteProfile();
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${parseInt(parts[2])} ${monthNames[parseInt(parts[1])-1]} ${parts[0]}`;
    }
    return dateStr;
  }

  function formatTimeForDisplay(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${minutes} ${ampm}`;
  }

  function extractTimeFromISO(isoString) {
    if (!isoString) return '';
    try {
      const istTime = new Date(new Date(isoString).getTime() + (5.5 * 60 * 60 * 1000));
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes().toString().padStart(2, '0');
      return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
    } catch (e) { return ''; }
  }

  const getTimeSlotDisplay = (interview) => {
    if (interview.time_slot) return interview.time_slot;
    if (interview.scheduled_date_time && interview.scheduled_end_time) {
      const startStr = new Date(interview.scheduled_date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true });
      const endStr = new Date(interview.scheduled_end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true });
      return `${startStr} - ${endStr}`;
    }
    return null;
  };

  const getFormattedDateIST = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
    } catch (e) { return ''; }
  };

  function isValidUrl(string) {
    if (!string || string.startsWith('File submission')) return false;
    try { new URL(string); return true; } catch (_) { return false; }
  }

  async function handleGradeInterview(interviewId, round, decision) {
    const metrics = roundGrades[interviewId] || {};
    const totalScore = Number((parseFloat(metrics.score1) || 0) + (parseFloat(metrics.score2) || 0) + (parseFloat(metrics.score3) || 0));

    const panelistName = localStorage.getItem('panelistName') || localStorage.getItem('userName') || localStorage.getItem('hrEmail') || 'Panelist';
    let sqlUpdateParams = { p_interview_id: interviewId, p_result: decision, p_status: 'Evaluated', p_total_score: totalScore, p_round: round, p_s1: (parseFloat(metrics.score1) || 0), p_s2: (parseFloat(metrics.score2) || 0), p_s3: (parseFloat(metrics.score3) || 0) };

    const { error } = await supabase.rpc('execute_interview_grade_update', sqlUpdateParams);
    if (error) { alert(`Failed to save scores: ${error.message}`); return; }

    const actionType = decision === 'Selected' ? 'candidate_selected' : decision === 'Rejected' ? 'candidate_rejected' : 'candidate_hold';
    await logTeamActivity(actionType, 'interview', interviewId, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, round: round, total_score: totalScore, panelist: panelistName, s1: sqlUpdateParams.p_s1, s2: sqlUpdateParams.p_s2, s3: sqlUpdateParams.p_s3 });

    const r1Total = Number(interviews.find(iv => iv.round === 'R1')?.total_score) || (round === 'R1' ? totalScore : 0);
    const r2Total = Number(interviews.find(iv => iv.round === 'R2')?.total_score) || (round === 'R2' ? totalScore : 0);
    await supabase.from('candidates').update({ r1_score: r1Total, r2_score: r2Total, final_interview_score: r1Total + r2Total }).eq('id', id);

    if (decision === 'Rejected') {
      await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
      alert(`Candidate rejected at ${round}.`);
    } else if (decision === 'On Hold') {
      await supabase.from('interviews').update({ status: 'On Hold', result: 'On Hold' }).eq('id', interviewId);
      await supabase.from('candidates').update({ current_stage: 'On Hold' }).eq('id', id);
      alert(`Interview ${round} placed on hold.`);
    } else if (decision === 'Selected') {
      if (round === 'R1') {
        await supabase.from('candidates').update({ r1_status: 'Passed' }).eq('id', id);
        if (candidate.source?.toLowerCase() === 'referral') {
          await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
          await supabase.from('onboarding').upsert({ candidate_id: id, onboarding_status: 'Pending', probation_status: 'Pending', probation_meeting_scheduled: false }, { onConflict: 'candidate_id' });
          alert("Round 1 Cleared! (Referral) Proceeding directly to Selected.");
        } else {
          alert("Round 1 Cleared! You may now schedule Round 2.");
        }
      } else if (round === 'R2') {
        await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
        await supabase.from('onboarding').upsert({ candidate_id: id, onboarding_status: 'Pending', probation_status: 'Pending', probation_meeting_scheduled: false }, { onConflict: 'candidate_id' });
        alert("Final Round Cleared! Candidate moved to Selected.");
      }
    }
    fetchCompleteProfile();
  }

  async function handleResumeProcess(interviewId, round) {
    await supabase.from('interviews').update({ status: 'Pending', result: 'Pending' }).eq('id', interviewId);
    await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id);
    alert("Process resumed.");
    fetchCompleteProfile();
  }

  async function handleHRRescheduleInterviewOld(interviewId) {
    if (!scheduleInput.date || !scheduleInput.startTime || !scheduleInput.endTime || !scheduleInput.link) { alert("Please specify all details."); return; }
    if (scheduleInput.startTime >= scheduleInput.endTime) { alert("End time must be after start time."); return; }

    try {
      const startDateTime = new Date(`${scheduleInput.date}T${scheduleInput.startTime}:00+05:30`);
      const endDateTime = new Date(`${scheduleInput.date}T${scheduleInput.endTime}:00+05:30`);
      const timeSlotDisplay = `${formatTimeForDisplay(scheduleInput.startTime)} - ${formatTimeForDisplay(scheduleInput.endTime)}`;

      const updateData = { scheduled_date_time: startDateTime.toISOString(), scheduled_end_time: endDateTime.toISOString(), time_slot: timeSlotDisplay, meeting_link: scheduleInput.link, status: 'Scheduled', result: 'Pending' };
      if (scheduleInput.panel?.trim()) updateData.panelists = [scheduleInput.panel.trim()];

      const { error: updateError } = await supabase.from('interviews').update(updateData).eq('id', interviewId).select();
      if (updateError) { alert(`Failed to update interview: ${updateError.message}`); return; }

      await logTeamActivity('interview_rescheduled_by_hr', 'interview', interviewId, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, new_date: scheduleInput.date, new_startTime: scheduleInput.startTime, new_endTime: scheduleInput.endTime, panel: scheduleInput.panel, reason: 'Rescheduled by HR via old flow' });
      await supabase.from('interview_reschedule_requests').delete().eq('interview_id', interviewId).eq('status', 'Pending');

      alert(`The interview has been successfully rescheduled for ${timeSlotDisplay}.`);
      setScheduleInput({ panel: '', link: '', date: '', startTime: '', endTime: '' });
      await fetchCompleteProfile();
    } catch (err) { alert(`An unexpected error occurred: ${err.message}`); }
  }

  // Styles
  const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '6px' };

  if (!candidate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const calculatedAssignmentScore = (assignment?.content_score || 0) + (assignment?.formatting_score || 0) - (assignment?.ai_score || 0);
  const assignmentLocked = assignment?.assignment_status === 'Evaluated';

  const r1TotalScore = candidate.r1_score || 0;
  const r2TotalScore = candidate.r2_score || 0;
  const grandTotal = (r1TotalScore || 0) + (r2TotalScore || 0);

  const isOnboardingLocked = candidate.current_stage === 'Onboarding Done' || candidate.current_stage === 'Internship Discontinued' || candidate.current_stage === 'Withdrawn' || candidate.current_stage === 'Terminated' || candidate.current_stage === 'Waitlist';
  const isInterviewLocked = candidate.current_stage === 'Probation' || candidate.current_stage === 'Selected' || isOnboardingLocked || candidate.current_stage === 'Withdrawn' || candidate.current_stage === 'Waitlist';
  const isReferral = candidate.source?.toLowerCase() === 'referral';

  const isAssignmentLate = () => {
    if (!assignment) return false;
    if (assignment.is_late_submission === true) return true;
    if (assignment.submitted_at && assignment.deadline) return new Date(assignment.submitted_at).getTime() > new Date(assignment.deadline).getTime();
    return false;
  };

  const getLateDuration = () => {
    if (!assignment || assignment.late_duration) return assignment?.late_duration || null;
    if (assignment.submitted_at && assignment.deadline) {
      const lateMs = new Date(assignment.submitted_at).getTime() - new Date(assignment.deadline).getTime();
      if (lateMs <= 0) return null;
      return `${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
    }
    return null;
  };

  const showProbationMeeting = candidate.current_stage === 'Selected' && onboarding && onboarding.probation_meeting_scheduled !== true;
  const showProbationManagement = (candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation') && onboarding && onboarding.probation_meeting_scheduled === true;
  const isOnWaitlist = candidate.current_stage === 'Waitlist';
  const probationMeetingDetails = !onboarding ? null : { date: onboarding.probation_meeting_date, end: onboarding.probation_meeting_end, link: onboarding.probation_meeting_link };
  const hasValidLink = assignment?.submitted_link && isValidUrl(assignment.submitted_link);
  const hasFiles = uploadedFiles.length > 0;

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ padding: '30px 40px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        
        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => navigate('/hr-dashboard')} className="btn-glass" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← Back to Dashboard
          </button>
          <button onClick={fetchCompleteProfile} className="btn-glass" style={{ padding: '8px 16px', fontSize: '13px' }}>
            🔄 Refresh Data
          </button>
        </div>
        
        {/* Waitlist Banner */}
        {isOnWaitlist && (
          <div className="glass-panel animate-fade-up" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent)', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontWeight: '700', color: '#c4b5fd', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>⏳ Candidate on Waitlist</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#e2e8f0' }}>{candidate.waitlisted_at && `Waitlisted: ${formatIST(candidate.waitlisted_at)}`}</p>
              {candidate.waitlist_notes && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Notes: {candidate.waitlist_notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={handleRestoreFromWaitlist} className="btn-premium" style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)' }}>
                🔄 Restore Candidate
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Resumes from: <strong style={{color: '#fff'}}>{candidate.waitlist_restore_stage || 'Applied'}</strong></span>
            </div>
          </div>
        )}

        {/* HR Manual Intervention Banner */}
        {candidate.current_stage === 'Assignment' && assignment?.assignment_status === 'Evaluated' && calculatedAssignmentScore < 6 && (
          <div className="glass-panel animate-fade-up" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '24px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚠️ HR Manual Intervention Required</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#e2e8f0' }}>Candidate score fell below target threshold. Manually select or reject for pipeline continuation.</p>
            </div>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Enter reason for manual override" style={{ ...inputStyle, minHeight: '80px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={async () => {
                if (!overrideReason.trim()) { alert('Please enter override reason'); return; }
                await logTeamActivity('candidate_force_scheduled', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, reason: overrideReason.trim(), assignment_score: calculatedAssignmentScore, action: 'Force Schedule R1' });
                await supabase.from('assignments').update({ hr_scorecard_approved: true, hr_scorecard_remarks: overrideReason }).eq('candidate_id', id);
                await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id); 
                alert('Candidate manually selected. HR can now schedule R1.'); fetchCompleteProfile();
              }} className="btn-premium">Force Schedule R1</button>
              
              <button onClick={async () => {
                await logTeamActivity('candidate_rejected_low_score', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, assignment_score: calculatedAssignmentScore, reason: overrideReason.trim() || 'Score below threshold' });
                await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
                alert('Candidate rejected.'); fetchCompleteProfile();
              }} className="btn-glass" style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>Reject Candidate</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }} className="animate-fade-up delay-100">
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Candidate Profile */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '22px', fontWeight: '800' }}>Candidate Profile</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Name: <strong style={{color: '#fff'}}>{candidate.name || candidate.full_name}</strong></p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Email: <strong style={{color: '#fff'}}>{candidate.email}</strong></p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Phone: <strong style={{color: '#fff'}}>{candidate.phone}</strong></p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Domain: <strong style={{color: '#fff'}}>{candidate.domain}</strong></p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Source: <strong style={{color: '#fff'}}>{candidate.source}</strong></p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Stage: 
                  <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: '#60a5fa', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>
                    {candidate.current_stage}
                  </span>
                </p>
              </div>

              {(candidate.college_name || candidate.degree_course || candidate.graduation_year) && (
                <>
                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>🎓 Education</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {candidate.college_name && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>College: <strong style={{color: '#fff'}}>{candidate.college_name}</strong></p>}
                    {candidate.degree_course && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Degree: <strong style={{color: '#fff'}}>{candidate.degree_course}</strong></p>}
                    {candidate.graduation_year && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Grad. Year: <strong style={{color: '#fff'}}>{candidate.graduation_year}</strong></p>}
                  </div>
                </>
              )}

              {(candidate.address || candidate.linkedin_profile || candidate.portfolio_link) && (
                <>
                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>📍 Links & Location</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {candidate.address && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Address: <strong style={{color: '#fff'}}>{candidate.address}</strong></p>}
                    {candidate.linkedin_profile && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>LinkedIn: <a href={candidate.linkedin_profile} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{candidate.linkedin_profile}</a></p>}
                    {candidate.portfolio_link && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Portfolio: <a href={candidate.portfolio_link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{candidate.portfolio_link}</a></p>}
                  </div>
                </>
              )}

              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Resume:</span>
                {candidate.resume_link ? (
                  <button id="downloadResumeBtn" onClick={handleDownloadResume} disabled={downloadLoading} className="btn-glass" style={{ padding: '6px 16px', fontSize: '13px', opacity: downloadLoading ? 0.7 : 1 }}>
                    {downloadLoading ? '⏳ Downloading...' : '📥 Download PDF'}
                  </button>
                ) : <span style={{ fontSize: '13px', color: '#fca5a5' }}>Not Uploaded</span>}
              </div>
            </div>

            {/* Internal Notes */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px', fontWeight: '700' }}>Internal Context Notes</h3>
              
              {/* The Visual Read-Only Ledger */}
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px', 
                minHeight: '80px', 
                maxHeight: '200px',
                overflowY: 'auto',
                color: '#e2e8f0', 
                fontSize: '14px', 
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap' 
              }}>
                {hrNotes ? hrNotes : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No internal notes captured yet.</span>}
              </div>

              <textarea 
                value={hrNotes} 
                onChange={(e) => setHrNotes(e.target.value)} 
                placeholder="Append or edit private review notes here..." 
                style={{ ...inputStyle, minHeight: '80px', marginBottom: '16px', resize: 'vertical' }} 
              />
              <button 
                onClick={async () => { 
                  await supabase.from('candidates').update({ hr_notes: hrNotes }).eq('id', id); 
                  alert('✅ Secure Notes committed to ledger!'); 
                  fetchCompleteProfile(); 
                }} 
                className="btn-premium" 
                style={{ width: '100%' }}>
                Commit Secure Notes
              </button>
            </div>

            {/* Support Messages */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                <span>💬 Direct Support Line</span>
                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '600', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                  {candidateQuestions.filter(q => q.status === 'Pending').length} Actionable
                </span>
              </h3>
              
              {candidateQuestions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No inbound queries from candidate.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {candidateQuestions.map(q => {
                    const isSystem = q.is_system_message === true;
                    return (
                      <div key={q.id} style={{ padding: '16px', background: isSystem ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${isSystem ? 'var(--accent)' : 'var(--glass-border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: isSystem ? '#c4b5fd' : (q.status === 'Replied' ? '#6ee7b7' : '#fca5a5'), textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {isSystem ? 'System Notification' : (q.status === 'Replied' ? 'Resolved Query' : 'Pending Action')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(q.created_at).toLocaleString()}</span>
                        </div>
                        
                        {isSystem ? (
                          <>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#fff' }}>{q.question}</p>
                            {q.question_replies?.map(r => (
                              <div key={r.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '13px', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{r.reply}</div>
                            ))}
                          </>
                        ) : (
                          <>
                            <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#fff', fontWeight: '500' }}>Q: {q.question}</p>
                            {q.question_replies?.map(r => (
                              <div key={r.id} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--primary)', marginTop: '8px' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#bfdbfe' }}><strong>HR Reply:</strong> {r.reply}</p>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                            
                            {!isSystem && (
                              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                {q.status !== 'Replied' ? (
                                  <button onClick={() => { setReplyingTo(q.id); setReplyText(''); }} className="btn-premium" style={{ padding: '6px 16px', fontSize: '12px' }}>Transmit Reply</button>
                                ) : (
                                  !q.is_public && <button onClick={() => { setFaqForm({ question: q.question, answer: '', category: 'General', questionId: q.id }); setIsAddingFAQ(true); setSimilarFAQ(null); }} className="btn-glass" style={{ padding: '6px 16px', fontSize: '12px', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>Pin to Knowledge Base</button>
                                )}
                              </div>
                            )}
                            
                            {replyingTo === q.id && (
                              <div style={{ marginTop: '16px' }}>
                                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type resolution..." style={{ ...inputStyle, minHeight: '80px', marginBottom: '12px' }} />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <button onClick={() => handleReplyToQuestion(q.id)} className="btn-premium" style={{ padding: '8px 16px', fontSize: '12px' }}>Dispatch</button>
                                  <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="btn-glass" style={{ padding: '8px 16px', fontSize: '12px' }}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '22px', fontWeight: '800', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>Workflow Command</h2>
              
              {!['Withdrawn', 'Rejected', 'Onboarding Done', 'Internship Discontinued', 'Terminated', 'Waitlist'].includes(candidate.current_stage) && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <button onClick={() => setShowWithdrawModal(true)} className="btn-glass" style={{ flex: 1, padding: '12px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '14px' }}>🚫 Withdraw</button>
                  <button onClick={() => setShowWaitlistModal(true)} className="btn-glass" style={{ flex: 1, padding: '12px', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.3)', fontSize: '14px' }}>⏳ Waitlist</button>
                </div>
              )}

              {candidate.current_stage === 'On Hold' && (
                <div style={{ marginBottom: '32px', background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid #f59e0b', textAlign: 'center' }}>
                  <button onClick={async () => {
                    const onHoldInterview = interviews.find(iv => iv.status === 'On Hold' && iv.result === 'On Hold');
                    if (onHoldInterview) {
                      await supabase.from('interviews').update({ status: 'Pending', result: 'Pending' }).eq('id', onHoldInterview.id);
                      await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id);
                      await logTeamActivity('candidate_restored_from_on_hold', 'candidate', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, interview_id: onHoldInterview.id, round: onHoldInterview.round });
                      alert('✅ Restored to Interview stage.'); fetchCompleteProfile();
                    } else { alert('No on-hold interview found.'); }
                  }} className="btn-premium" style={{ width: '100%', marginBottom: '12px', background: '#f59e0b', color: '#000' }}>
                    🔄 Restore to Active Pipeline
                  </button>
                  <p style={{ fontSize: '13px', color: '#fcd34d', margin: 0 }}>Resume the candidate evaluation process.</p>
                </div>
              )}

              {rescheduleRequest && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 12px 0', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>📅 Reschedule Requested</h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}><strong>Reason:</strong> {rescheduleRequest.reason}</p>
                  
                  <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.3)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input type="text" placeholder="Interviewer Panel Name" value={scheduleInput.panel} onChange={(e) => setScheduleInput({...scheduleInput, panel: e.target.value})} style={inputStyle} />
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <input type="date" value={scheduleInput.date} onChange={(e) => setScheduleInput({...scheduleInput, date: e.target.value})} style={{ ...inputStyle, flex: 1, minWidth: '120px' }} />
                        <input type="time" value={scheduleInput.startTime} onChange={(e) => setScheduleInput({...scheduleInput, startTime: e.target.value})} style={{ ...inputStyle, flex: 0.7, minWidth: '90px' }} />
                        <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>to</span>
                        <input type="time" value={scheduleInput.endTime} onChange={(e) => setScheduleInput({...scheduleInput, endTime: e.target.value})} style={{ ...inputStyle, flex: 0.7, minWidth: '90px' }} />
                      </div>
                      <input type="text" placeholder="Meeting Link" value={scheduleInput.link} onChange={(e) => setScheduleInput({...scheduleInput, link: e.target.value})} style={inputStyle} />
                      <button onClick={() => handleHRRescheduleInterviewOld(rescheduleRequest.interview_id)} className="btn-premium" style={{ background: '#f59e0b', color: '#000', marginTop: '8px' }}>
                        Confirm Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Phase */}
              {candidate.current_stage === 'Applied' && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Task Assignment</h4>
                  <button onClick={handleSendAssignment} className="btn-premium" style={{ width: '100%' }}>Dispatch Assessment Module</button>
                </div>
              )}

              {(candidate.current_stage === 'Assignment' || (assignment && (candidate.current_stage === 'Interview' || candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation' || isOnboardingLocked))) && (
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff', fontWeight: '700' }}>Evaluation Board</h4>
                  
                  {assignment && (
                    <div style={{ background: isAssignmentLate() ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${isAssignmentLate() ? '#ef4444' : 'var(--glass-border)'}` }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Deadline: <span style={{color: '#fff'}}>{new Date(assignment.deadline).toLocaleString()}</span></p>
                      
                      {assignment.submitted_at && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: isAssignmentLate() ? '#fca5a5' : '#6ee7b7' }}>
                          Submitted: {new Date(assignment.submitted_at).toLocaleString()} {isAssignmentLate() && `(LATE by ${getLateDuration()})`}
                        </p>
                      )}
                      
                      {candidate.assignment_score != null && (
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6ee7b7', fontWeight: '600' }}>Calculated Grade: {candidate.assignment_score} Marks</p>
                      )}

                      {(hasValidLink || hasFiles) && (
                        <button onClick={() => setShowFilesModal(true)} className="btn-glass" style={{ width: '100%', fontSize: '13px' }}>
                          📁 Access Deliverables {hasFiles && `(${uploadedFiles.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Content</label>
                      <input type="number" min="0" max="10" value={scores.content} disabled={assignmentLocked} onChange={(e) => setScores({...scores, content: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Formatting</label>
                      <input type="number" min="0" max="10" value={scores.formatting} disabled={assignmentLocked} onChange={(e) => setScores({...scores, formatting: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>AI Match</label>
                      <input type="number" min="0" max="10" value={scores.ai} disabled={assignmentLocked} onChange={(e) => setScores({...scores, ai: e.target.value})} style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={handleSaveEvaluation} disabled={assignmentLocked} className={assignmentLocked ? 'btn-glass' : 'btn-premium'} style={{ width: '100%', opacity: assignmentLocked ? 0.5 : 1 }}>
                    {assignmentLocked ? 'Matrix Locked' : 'Commit Matrix Grades'}
                  </button>
                </div>
              )}

              {/* Interview Phase */}
              {candidate.current_stage === 'Interview' && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
                  {(() => {
                    const hasR1 = interviews.some(iv => iv.round === 'R1');
                    const hasR2 = interviews.some(iv => iv.round === 'R2');
                    return (
                      <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                        <h5 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#fff', fontWeight: '600' }}>Schedule Interview Node</h5>
                        <input type="text" placeholder="Interviewer Panel Name" value={scheduleInput.panel} onChange={(e) => setScheduleInput({...scheduleInput, panel: e.target.value})} style={{ ...inputStyle, marginBottom: '12px' }} />
                        <input type="text" placeholder="Meeting URL Link" value={scheduleInput.link} onChange={(e) => setScheduleInput({...scheduleInput, link: e.target.value})} style={{ ...inputStyle, marginBottom: '12px' }} />
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                          <input type="date" value={scheduleInput.date} onChange={(e) => setScheduleInput({...scheduleInput, date: e.target.value})} style={{ ...inputStyle, flex: 1, minWidth: '120px' }} />
                          <input type="time" value={scheduleInput.startTime} onChange={(e) => setScheduleInput({...scheduleInput, startTime: e.target.value})} style={{ ...inputStyle, flex: 0.7, minWidth: '90px' }} />
                          <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>to</span>
                          <input type="time" value={scheduleInput.endTime} onChange={(e) => setScheduleInput({...scheduleInput, endTime: e.target.value})} style={{ ...inputStyle, flex: 0.7, minWidth: '90px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleScheduleInterview('R1')} disabled={hasR1} className={hasR1 ? 'btn-glass' : 'btn-premium'} style={{ flex: 1, opacity: hasR1 ? 0.5 : 1 }}>
                            {hasR1 ? 'R1 Active' : 'Deploy R1'}
                          </button>
                          {!isReferral && (
                            <button onClick={() => handleScheduleInterview('R2')} disabled={hasR2} className={hasR2 ? 'btn-glass' : 'btn-premium'} style={{ flex: 1, background: hasR2 ? '' : '#4f46e5', opacity: hasR2 ? 0.5 : 1 }}>
                              {hasR2 ? 'R2 Active' : 'Deploy R2'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {interviews.length > 0 && (
                    <>
                      <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>Active Interview Loops</h4>
                      {interviews.map((iv) => {
                        const g = roundGrades[iv.id] || { score1: '', score2: '', score3: '' };
                        const total = (parseFloat(g.score1) || 0) + (parseFloat(g.score2) || 0) + (parseFloat(g.score3) || 0);
                        
                        let badgeBg = 'rgba(255,255,255,0.1)'; let badgeColor = '#e2e8f0'; let badgeText = iv.status || 'Pending';
                        if (iv.result === 'Rejected') { badgeBg = 'rgba(239, 68, 68, 0.1)'; badgeColor = '#fca5a5'; badgeText = 'Rejected'; }
                        else if (iv.status === 'On Hold' || iv.result === 'On Hold') { badgeBg = 'rgba(245, 158, 11, 0.1)'; badgeColor = '#fcd34d'; badgeText = 'On Hold'; }
                        else if (iv.result === 'Selected') { badgeBg = 'rgba(16, 185, 129, 0.1)'; badgeColor = '#6ee7b7'; badgeText = 'Selected'; }
                        else if (iv.status === 'Reschedule_Requested') { badgeBg = 'rgba(245, 158, 11, 0.1)'; badgeColor = '#fcd34d'; badgeText = 'Reschedule Req'; }
                        else if (iv.status === 'Scheduled') { badgeBg = 'rgba(59, 130, 246, 0.1)'; badgeColor = '#93c5fd'; badgeText = 'Scheduled'; }

                        return (
                          <div key={iv.id} style={{ border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <span style={{ fontWeight: '800', color: '#60a5fa', fontSize: '16px', letterSpacing: '1px' }}>{iv.round}</span>
                              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>{badgeText}</span>
                            </div>
                            
                            {iv.panelists?.length > 0 && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Panel: <span style={{color: '#fff'}}>{iv.panelists.join(', ')}</span></p>}
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Date: <span style={{color: '#fff'}}>{getFormattedDateIST(iv.scheduled_date_time)}</span></p>
                            {getTimeSlotDisplay(iv) && <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Time: <span style={{color: '#fff'}}>{getTimeSlotDisplay(iv)}</span></p>}
                            
                            {iv.result === 'Pending' && iv.status !== 'On Hold' && !isInterviewLocked && (
                              <div style={{ marginBottom: '16px' }}><a href={iv.meeting_link} target="_blank" rel="noreferrer" className="btn-glass" style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 16px' }}>🔗 Access Room</a></div>
                            )}

                            {iv.candidate_accepted && <div style={{ marginBottom: '16px', color: '#6ee7b7', fontSize: '13px', fontWeight: '600' }}>✅ Candidate Acknowledged</div>}

                            {(iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested') && iv.result === 'Pending' && !isInterviewLocked && (
                              <button onClick={() => {
                                let dateStr = ''; if (iv.scheduled_date_time) { dateStr = new Date(iv.scheduled_date_time).toISOString().split('T')[0]; }
                                setHrRescheduleData({ interviewId: iv.id, panel: iv.panelists ? iv.panelists[0] : '', link: iv.meeting_link || '', date: dateStr, startTime: iv.scheduled_date_time ? new Date(iv.scheduled_date_time).toTimeString().slice(0, 5) : '', endTime: iv.scheduled_end_time ? new Date(iv.scheduled_end_time).toTimeString().slice(0, 5) : '', reason: '' });
                                setShowHRRescheduleModal(true);
                              }} className="btn-glass" style={{ padding: '8px 16px', fontSize: '12px', marginBottom: '16px' }}>🔄 Reschedule</button>
                            )}

                            {iv.result === 'Pending' && iv.status !== 'On Hold' && !isInterviewLocked && (
                              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                  <div><label style={labelStyle}>{iv.round === 'R1' ? 'Domain' : 'Tech'}</label><input type="number" value={g.score1} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score1: e.target.value}})} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>{iv.round === 'R1' ? 'Comm' : 'Problem'}</label><input type="number" value={g.score2} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score2: e.target.value}})} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>{iv.round === 'R1' ? 'Avail.' : 'Culture'}</label><input type="number" value={g.score3} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score3: e.target.value}})} style={inputStyle} /></div>
                                </div>
                                <p style={{ color: '#fff', fontWeight: '700', marginBottom: '16px', fontSize: '14px' }}>Calculated Total: {total}</p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <button onClick={() => handleGradeInterview(iv.id, iv.round, 'Selected')} className="btn-premium" style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#10b981' }}>Pass</button>
                                  <button onClick={() => handleGradeInterview(iv.id, iv.round, 'Rejected')} className="btn-premium" style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#ef4444' }}>Reject</button>
                                  <button onClick={() => handleGradeInterview(iv.id, iv.round, 'On Hold')} className="btn-premium" style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#f59e0b', color: '#000' }}>Hold</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {(candidate.current_stage !== 'Assignment' && (r1TotalScore > 0 || r2TotalScore > 0)) && (
                    <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', color: '#6ee7b7', fontSize: '14px' }}>R1: {r1TotalScore} | R2: {r2TotalScore}</p>
                      <p style={{ margin: 0, color: '#34d399', fontWeight: '800', fontSize: '18px' }}>Global Interview Score: {grandTotal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* PROBATION SCHEDULING */}
              {showProbationMeeting && (
                <div style={{ padding: '24px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid var(--accent)', marginTop: '30px' }}>
                  <h4 style={{ color: '#c4b5fd', margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>📆 Schedule Probation Orientation</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Meeting Link" value={probationInput.link} onChange={(e) => setProbationInput({...probationInput, link: e.target.value})} style={inputStyle} />
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <input type="date" value={probationInput.date} onChange={(e) => setProbationInput({...probationInput, date: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                      <input type="time" value={probationInput.startTime} onChange={(e) => setProbationInput({...probationInput, startTime: e.target.value})} style={{ ...inputStyle, flex: 0.7 }} />
                      <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>to</span>
                      <input type="time" value={probationInput.endTime} onChange={(e) => setProbationInput({...probationInput, endTime: e.target.value})} style={{ ...inputStyle, flex: 0.7 }} />
                    </div>
                    <button onClick={handleScheduleProbationMeeting} className="btn-premium" style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', width: '100%', marginTop: '8px' }}>Commit Schedule</button>
                  </div>
                </div>
              )}

              {/* PROBATION MANAGEMENT */}
              {showProbationManagement && (
                <div style={{ padding: '24px', background: candidate.current_stage === 'Selected' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: `1px solid ${candidate.current_stage === 'Selected' ? 'var(--accent)' : 'var(--primary)'}`, marginTop: '30px' }}>
                  <h4 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700' }}>
                    {candidate.current_stage === 'Selected' ? '📋 Orientation Scheduled' : '🚀 Active Probation'}
                  </h4>
                  
                  {probationMeetingDetails && (
                    <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px', color: '#c4b5fd' }}>Scheduled Orientation</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Date: <span style={{color: '#fff'}}>{getFormattedDateIST(probationMeetingDetails.date)}</span></p>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Time: <span style={{color: '#fff'}}>{extractTimeFromISO(probationMeetingDetails.date)} - {extractTimeFromISO(probationMeetingDetails.end)}</span></p>
                      <a href={probationMeetingDetails.link} target="_blank" rel="noreferrer" className="btn-glass" style={{ textDecoration: 'none', padding: '6px 16px', fontSize: '12px' }}>🔗 Access Link</a>
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Onboarding Status Engine</label>
                    <p style={{ margin: 0, color: '#34d399', fontWeight: '700', fontSize: '15px' }}>
                      {onboarding?.onboarding_status === 'Active' ? 'Active' : onboarding?.onboarding_status === 'Completed' ? 'Completed' : onboarding?.onboarding_status === 'Discontinued' ? 'Discontinued' : onboarding?.onboarding_status === 'Terminated' ? 'Terminated' : 'Pending'}
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>Update Probation Lifecycle</label>
                    <select value={onboarding?.probation_status || 'Pending'} onChange={async (e) => {
                      const newStatus = e.target.value; if (newStatus === 'Select') return;
                      let obStatus = 'Pending'; let stage = candidate.current_stage; let action = '';
                      if (newStatus === 'In Progress') { obStatus = 'Active'; stage = 'Probation'; action = 'probation_started'; }
                      else if (newStatus === 'Completed') { obStatus = 'Completed'; stage = 'Onboarding Done'; action = 'onboarding_completed'; }
                      else if (newStatus === 'Discontinued') { obStatus = 'Discontinued'; stage = 'Internship Discontinued'; action = 'internship_discontinued'; }
                      else if (newStatus === 'Terminated') { obStatus = 'Terminated'; stage = 'Terminated'; action = 'candidate_terminated'; }
                      else if (newStatus === 'Pending') { obStatus = 'Pending'; stage = 'Selected'; action = 'probation_pending'; }
                      await supabase.from('onboarding').update({ probation_status: newStatus, onboarding_status: obStatus }).eq('candidate_id', id);
                      await supabase.from('candidates').update({ current_stage: stage }).eq('id', id);
                      if (action) await logTeamActivity(action, 'onboarding', id, { candidate_id: id, candidate_name: candidate.name || candidate.full_name, new_status: newStatus, new_stage: stage });
                      alert(`Lifecycle updated to: ${newStatus}`); fetchCompleteProfile();
                    }} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Pending" style={{color:'#000'}}>Pending (Awaiting Activation)</option>
                      <option value="In Progress" style={{color:'#000'}}>Active Probation</option>
                      <option value="Completed" style={{color:'#000'}}>Onboarding Completed</option>
                      <option value="Discontinued" style={{color:'#000'}}>Internship Discontinued</option>
                      <option value="Terminated" style={{color:'#000'}}>Terminated</option>
                    </select>
                  </div>
                </div>
              )}

              {/* End states banners */}
              {candidate.current_stage === 'Selected' && !showProbationMeeting && !showProbationManagement && (
                <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginTop: '30px', textAlign: 'center' }}>
                  <h4 style={{ color: '#34d399', margin: '0 0 8px 0', fontSize: '18px' }}>Candidate Selected</h4>
                  <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>Schedule a probation orientation to proceed.</p>
                </div>
              )}
              {candidate.current_stage === 'Probation' && !showProbationManagement && (
                <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid var(--primary)', marginTop: '30px', textAlign: 'center' }}>
                  <h4 style={{ color: '#60a5fa', margin: '0 0 8px 0', fontSize: '18px' }}>Probation Active</h4>
                </div>
              )}
              {candidate.current_stage === 'Rejected' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Rejected</h4>
                </div>
              )}
              {candidate.current_stage === 'Withdrawn' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Withdrawn</h4>
                </div>
              )}
              {candidate.current_stage === 'Terminated' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Terminated</h4>
                </div>
              )}
              {candidate.current_stage === 'Onboarding Done' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#34d399' }}>Onboarding Finalized</h4>
                </div>
              )}
              {candidate.current_stage === 'Internship Discontinued' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fbbf24' }}>Internship Discontinued</h4>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= MODALS ================= */}
        
        {/* Uploaded Files Modal */}
        {showFilesModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>📁 Assignment Artifacts</h3>
                <button onClick={() => setShowFilesModal(false)} className="btn-glass" style={{ padding: '4px 12px' }}>Close</button>
              </div>
              {hasValidLink && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>External Link</p>
                  <a href={assignment.submitted_link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '14px', wordBreak: 'break-all' }}>{assignment.submitted_link}</a>
                </div>
              )}
              {hasFiles ? (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Uploaded Files ({uploadedFiles.length})</p>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button onClick={() => handleFileDownload(file.file_url, file.file_name)} className="btn-glass" style={{ padding: '6px 16px', fontSize: '12px' }}>Download</button>
                    </div>
                  ))}
                </div>
              ) : !hasValidLink ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No artifacts located.</p>
              ) : null}
            </div>
          </div>
        )}

        {/* FAQ Modal */}
        {isAddingFAQ && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>📖 Add to Knowledge Base</h3>
              {checkingSimilar ? (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}><p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Scanning matrix for duplicates...</p></div>
              ) : similarFAQ ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ color: '#fcd34d', fontSize: '13px', margin: 0 }}>⚠️ Similar entry detected: <strong>"{similarFAQ.question}"</strong></p>
                </div>
              ) : null}
              <form onSubmit={handleAddFAQ}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Question</label>
                  <input value={faqForm.question} readOnly style={{...inputStyle, opacity: 0.7}} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Verified Answer</label>
                  <textarea value={faqForm.answer} onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})} rows="3" required style={{...inputStyle, resize: 'vertical'}} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Category</label>
                  <select value={faqForm.category} onChange={(e) => setFaqForm({...faqForm, category: e.target.value})} style={{...inputStyle, color: '#000'}}>
                    <option value="General">General</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Interview">Interview</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="btn-premium" style={{ flex: 1 }}>Commit to KB</button>
                  <button type="button" onClick={() => { setIsAddingFAQ(false); setFaqForm({ question: '', answer: '', category: '', questionId: null }); setSimilarFAQ(null); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fca5a5' }}>🚫 Terminate Candidacy</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                Are you sure you want to withdraw <strong>{candidate.name || candidate.full_name}</strong>? This action will alert the candidate and freeze the pipeline.
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Reasoning <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} rows="3" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleWithdrawCandidate} className="btn-premium" style={{ flex: 1, background: '#ef4444' }}>Confirm Withdrawal</button>
                <button onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Waitlist Modal */}
        {showWaitlistModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#c4b5fd' }}>⏳ Suspend to Waitlist</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '24px' }}><strong>Freezing at Stage:</strong> {candidate.current_stage}</p>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Internal Context <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={waitlistReason} onChange={(e) => setWaitlistReason(e.target.value)} rows="2" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea value={waitlistNotes} onChange={(e) => setWaitlistNotes(e.target.value)} rows="2" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleWaitlistCandidate} className="btn-premium" style={{ flex: 1, background: '#8b5cf6' }}>Confirm Waitlist</button>
                <button onClick={() => { setShowWaitlistModal(false); setWaitlistReason(''); setWaitlistNotes(''); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* HR Reschedule Modal */}
        {showHRRescheduleModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fbbf24' }}>🔄 Overwrite Schedule</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '24px' }}>Candidate will be notified of the parameter change.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div><label style={labelStyle}>Panel Name</label><input type="text" value={hrRescheduleData.panel} onChange={(e) => setHrRescheduleData({...hrRescheduleData, panel: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Meeting Link *</label><input type="text" value={hrRescheduleData.link} onChange={(e) => setHrRescheduleData({...hrRescheduleData, link: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Date *</label><input type="date" value={hrRescheduleData.date} onChange={(e) => setHrRescheduleData({...hrRescheduleData, date: e.target.value})} style={{...inputStyle, color: '#000'}} /></div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{flex: 1}}><label style={labelStyle}>Start Time *</label><input type="time" value={hrRescheduleData.startTime} onChange={(e) => setHrRescheduleData({...hrRescheduleData, startTime: e.target.value})} style={{...inputStyle, color: '#000'}} /></div>
                  <div style={{flex: 1}}><label style={labelStyle}>End Time *</label><input type="time" value={hrRescheduleData.endTime} onChange={(e) => setHrRescheduleData({...hrRescheduleData, endTime: e.target.value})} style={{...inputStyle, color: '#000'}} /></div>
                </div>
                <div><label style={labelStyle}>Reasoning</label><textarea value={hrRescheduleData.reason} onChange={(e) => setHrRescheduleData({...hrRescheduleData, reason: e.target.value})} rows="2" style={{...inputStyle, resize: 'vertical'}} /></div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleHRRescheduleInterview} className="btn-premium" style={{ flex: 1, background: '#f59e0b', color: '#000' }}>Confirm Update</button>
                <button onClick={() => { setShowHRRescheduleModal(false); setHrRescheduleData({ interviewId: null, panel: '', link: '', date: '', startTime: '', endTime: '', reason: '' }); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CandidateDetailsPage;