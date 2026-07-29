// src/pages/CandidatePortalPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

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

export default function CandidatePortalPage() {
  const navigate = useNavigate();

  // Authentication & session states
  const [candidate, setCandidate] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Domain cache for registration
  const [domains, setDomains] = useState([]);

  // Form states for new internship registration
  const [regForm, setRegForm] = useState({ 
    name: '', phone: '', domain: '', source: '', referrer_contact: '',
    referrer_name: '', other_source: '', portfolio_link: '', address: '',
    linkedin_profile: '', college_name: '', degree_course: '', graduation_year: ''
  });

  // File upload states
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Stage dependency sub-states
  const [assignment, setAssignment] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);
  const [isLate, setIsLate] = useState(false);
  const [lateDuration, setLateDuration] = useState(null);

  // Questions & FAQ States
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [showFAQModal, setShowFAQModal] = useState(false);

  // Assignment File Upload States
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [assignmentLink, setAssignmentLink] = useState('');

  useEffect(() => {
    async function loadDomains() {
      try {
        const { data, error } = await supabase.from('assignment_templates').select('domain');
        if (error) {
          setDomains([
            "Automation & Operations", "Brand Management & Outreach", "Business Development",
            "Clinical Psychologist", "Content Creation", "Creative Design", "Graphic Design",
            "HR Psychologist", "Human Resources (HR)", "Lead Generation", "Marketing",
            "Media & Public Relations (PR)", "Motion Graphics", "Operations", "Project Management",
            "Python Automation", "Sales and Marketing", "Social Media Management", "Talent Acquisition",
            "Video Editing/Making", "UI/UX Design", "Full stack Developer"
          ]);
          return;
        }
        if (data && data.length > 0) {
          setDomains([...new Set(data.map(d => d.domain))]);
        }
      } catch (err) { console.error("Error in loadDomains:", err); }
    }
    loadDomains();
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem('candidateEmail');
    if (savedEmail) {
      supabase.from('candidates').select('*').eq('email', savedEmail).single()
        .then(({ data }) => { if (data) setCandidate(data); });
    }
  }, []);

  useEffect(() => {
    if (candidate) {
      fetchWorkflowContext();
      fetchQuestions();
      fetchFAQs();
      fetchUploadedFiles();
    }
  }, [candidate]);

  async function fetchUploadedFiles() {
    if (!candidate || !assignment) return;
    const { data, error } = await supabase.from('assignment_files').select('*').eq('candidate_id', candidate.id).eq('assignment_id', assignment.id).order('created_at', { ascending: false });
    if (!error) setUploadedFiles(data || []);
  }

  async function fetchQuestions() {
    if (!candidate) return;
    const { data, error } = await supabase.from('candidate_questions').select('*, question_replies(*)').eq('candidate_id', candidate.id).order('created_at', { ascending: false });
    if (!error) setQuestions(data || []);
  }

  async function fetchFAQs() {
    const { data, error } = await supabase.from('faqs').select('*').eq('is_active', true).order('category', { ascending: true }).order('created_at', { ascending: false });
    if (!error) setFaqs(data || []);
  }

  async function fetchWorkflowContext() {
    if (!candidate) return;
    const { data: updatedCand } = await supabase.from('candidates').select('*').eq('id', candidate.id).single();
    if (updatedCand) setCandidate(updatedCand);

    const currentStage = updatedCand ? updatedCand.current_stage : candidate.current_stage;
    const currentDomain = updatedCand ? updatedCand.domain : candidate.domain;

    let { data: assign, error: assignError } = await supabase.from('assignments').select('*').eq('candidate_id', candidate.id).maybeSingle();

    if (currentStage === 'Assignment' && !assign && !assignError) {
      const { data: template } = await supabase.from('assignment_templates').select('*').eq('domain', currentDomain).maybeSingle();
      if (template) {
        const { data: newAssign, error: insertError } = await supabase.from('assignments').insert({
          candidate_id: candidate.id, assignment_template_id: template.id, assignment_title: template.assignment_name, assignment_type: 'Domain Task', assignment_status: 'Assigned', assigned_by: 'System Admin', task_link_template: template.assignment_link
        }).select().single();
        if (!insertError && newAssign) assign = newAssign;
      }
    }
    setAssignment(assign);

    if (assign?.submitted_link) {
      setSubmissionUrl(assign.submitted_link);
      if (assign.submitted_at) {
        const deadline = new Date(assign.deadline).getTime();
        const submittedAt = new Date(assign.submitted_at).getTime();
        if (submittedAt > deadline) {
          setIsLate(true);
          const lateMs = submittedAt - deadline;
          setLateDuration(`${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`);
        }
      }
    }

    const { data: ivs } = await supabase.from('interviews').select('*').eq('candidate_id', candidate.id).in('status', ['Scheduled', 'Reschedule_Requested', 'Completed', 'On Hold']).not('scheduled_date_time', 'is', null).order('id', { ascending: false });
    setInterviews(ivs || []);
    
    const { data: ob } = await supabase.from('onboarding').select('*').eq('candidate_id', candidate.id).maybeSingle();
    setOnboardingData(ob);
  }

  useEffect(() => {
    if (!assignment || !assignment.deadline) return;
    if (assignment.assignment_status === 'Submitted' || assignment.assignment_status === 'Evaluated') { setTimeLeft(null); return; }
    const updateTimer = () => {
      const now = new Date().getTime();
      const deadline = new Date(assignment.deadline).getTime();
      const distance = deadline - now;
      if (distance < 0) {
        setTimeLeft(0);
        const lateMs = Math.abs(distance);
        setLateDuration(`${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`);
        setIsLate(true); return;
      }
      setTimeLeft(distance); setIsLate(false);
    };
    updateTimer(); 
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [assignment]);

  function isSubmissionDisabled() {
    return assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated' || isSubmitting;
  }

  async function uploadResume(file, candidateId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;
    const { data, error } = await supabase.storage.from('resumes').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  function validateFile(file) {
    if (file.type !== 'application/pdf') { alert('Only PDF files are allowed. Please upload a PDF file.'); return false; }
    if (file.size > 100 * 1024 * 1024) { alert('File size exceeds 100MB limit. Please upload a smaller file.'); return false; }
    return true;
  }

  async function uploadAssignmentFile(file) {
    if (!candidate || !assignment) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidate.id}/${assignment.id}/${Date.now()}_${file.name}`;
    const filePath = `assignment_files/${fileName}`;
    try {
      let { data, error } = await supabase.storage.from('assignment_files').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) {
        if (error.message?.includes('bucket') || error.statusCode === 404) {
          const { error: createError } = await supabase.storage.createBucket('assignment_files', { public: true, allowedMimeTypes: ['*/*'], fileSizeLimit: 104857600 });
          if (createError) return await uploadAssignmentFileToResumesBucket(file);
          const retryResult = await supabase.storage.from('assignment_files').upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (retryResult.error) throw retryResult.error;
        } else throw error;
      }
      const { data: urlData } = supabase.storage.from('assignment_files').getPublicUrl(filePath);
      return { file_name: file.name, file_path: filePath, file_url: urlData.publicUrl, file_size: file.size, file_type: file.type };
    } catch (error) {
      return await uploadAssignmentFileToResumesBucket(file);
    }
  }

  async function uploadAssignmentFileToResumesBucket(file) {
    if (!candidate || !assignment) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `assignments/${candidate.id}/${assignment.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('resumes').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(fileName);
    return { file_name: file.name, file_path: fileName, file_url: urlData.publicUrl, file_size: file.size, file_type: file.type };
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    if (uploadedFiles.length + files.length > 5) { alert(`You can only upload up to 5 files.`); e.target.value = ''; return; }
    setIsUploadingFiles(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 100 * 1024 * 1024) { alert(`File "${files[i].name}" exceeds 100MB limit.`); continue; }
        const uploadedFile = await uploadAssignmentFile(files[i]);
        if (uploadedFile) {
          const { data: fileRecord, error: dbError } = await supabase.from('assignment_files').insert({
            candidate_id: candidate.id, assignment_id: assignment.id, file_name: uploadedFile.file_name, file_path: uploadedFile.file_path, file_url: uploadedFile.file_url, file_size: uploadedFile.file_size, file_type: uploadedFile.file_type
          }).select().single();
          if (dbError) alert(`Failed to save file "${files[i].name}" record.`); else setUploadedFiles(prev => [fileRecord, ...prev]);
        }
      }
    } catch (error) { alert('Failed to upload files. Please try again.'); } 
    finally { setIsUploadingFiles(false); e.target.value = ''; }
  }

  async function handleRemoveFile(fileId) {
    if (!confirm('Are you sure you want to remove this file?')) return;
    try {
      const { error: dbError } = await supabase.from('assignment_files').delete().eq('id', fileId);
      if (dbError) { alert('Failed to remove file.'); return; }
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) { alert('Failed to remove file.'); }
  }

  function isSubmissionValid() {
    if (assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated') return false;
    return assignmentLink.trim() !== '' || uploadedFiles.length > 0;
  }

  async function handleSubmitAssignment() {
    if (!isSubmissionValid()) { alert('Please upload at least one file or provide a valid link to submit.'); return; }
    if (assignment?.assignment_status === 'Evaluated') { alert('Assignment is currently being evaluated by HR.'); return; }
    
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const deadline = new Date(assignment.deadline).getTime();
    const submittedAt = new Date(now).getTime();
    const isLateSubmission = submittedAt > deadline;
    
    let lateDurationText = null;
    if (isLateSubmission) {
      const lateMs = submittedAt - deadline;
      lateDurationText = `${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
    }
    
    const updateData = { submitted_at: now, assignment_status: 'Submitted' };
    if (assignmentLink.trim() !== '') updateData.submitted_link = assignmentLink.trim();
    else updateData.submitted_link = `File submission (${uploadedFiles.length} files uploaded)`;
    
    if (isLateSubmission) { updateData.is_late_submission = true; updateData.late_duration = lateDurationText; }
    
    const { error } = await supabase.from('assignments').update(updateData).eq('candidate_id', candidate.id);
    
    if (error) { alert(`Submission failure: ${error.message}`); setIsSubmitting(false); } 
    else {
      if (isLateSubmission) alert(`Assignment submitted successfully!\n\nLATE SUBMISSION: Your submission is ${lateDurationText} past the deadline. HR will be notified.`);
      else alert('Assignment submitted successfully!');
      await fetchWorkflowContext(); await fetchUploadedFiles(); setIsSubmitting(false);
    }
  }

  function validateForm() {
    const errors = {};
    if (!regForm.name.trim()) errors.name = 'Full name is required';
    if (!emailInput.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) errors.email = 'Please enter a valid email';
    if (!regForm.phone.trim()) errors.phone = 'Contact number is required';
    if (!regForm.domain) errors.domain = 'Please select a domain';
    if (!regForm.source) errors.source = 'Please select a source';
    if (!resumeFile) errors.resume = 'Please upload your resume';
    if (!regForm.college_name.trim()) errors.college_name = 'College name is required';
    if (!regForm.degree_course.trim()) errors.degree_course = 'Degree/Course is required';
    if (!regForm.graduation_year) errors.graduation_year = 'Graduation year is required';
    else if (parseInt(regForm.graduation_year) < 2000) errors.graduation_year = 'Must be 2000 or later';
    if (!regForm.address.trim()) errors.address = 'Address is required';
    if (regForm.source === 'Other' && !regForm.other_source.trim()) errors.other_source = 'Please specify your source';
    if (regForm.source === 'Referral') {
      if (!regForm.referrer_name.trim()) errors.referrer_name = 'Referrer name is required';
      if (!regForm.referrer_contact.trim()) errors.referrer_contact = 'Referrer contact is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ==========================================
  // FIX: HARD RELOAD AUTHENTICATION
  // ==========================================
  async function handleLogin(e) {
    e.preventDefault(); setErrorMsg('');
    if (!emailInput.trim()) return;
    
    const { data, error } = await supabase.from('candidates').select('*').eq('email', emailInput.trim().toLowerCase()).maybeSingle();
    if (error) { setErrorMsg('A database retrieval anomaly occurred.'); } 
    else if (data) {
      // 🔥 HARD RESET: Dump browser RAM to kill Ghost State
      localStorage.removeItem('candidateEmail');
      localStorage.setItem('candidateEmail', data.email);
      window.location.href = '/portal'; 
    } else {
      setErrorMsg('Email address not registered. Proceed to fill out the internship form.'); setIsRegistering(true);
    }
  }

  async function handleRegister(e) {
    e.preventDefault(); setFormErrors({});
    if (!validateForm()) { const firstError = document.querySelector('.field-error'); if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    
    let finalSource = regForm.source; if (regForm.source === 'Other') finalSource = regForm.other_source.trim();
    const cleanEmail = emailInput.trim().toLowerCase();
    
    const { data: checkExist } = await supabase.from('candidates').select('*').eq('email', cleanEmail).maybeSingle();
    if (checkExist) {
      alert('This email profile matches a pre-existing profile. Logging into workspace.');
      // 🔥 HARD RESET
      localStorage.removeItem('candidateEmail');
      localStorage.setItem('candidateEmail', checkExist.email);
      window.location.href = '/portal';
      return;
    }
    
    setUploading(true);
    try {
      const insertData = { name: regForm.name.trim(), email: cleanEmail, phone: regForm.phone.trim(), domain: regForm.domain, source: finalSource, current_stage: 'Applied', status: 'In_Progress', resume_review: 'Pending', portfolio_link: regForm.portfolio_link || null, address: regForm.address.trim() || null, linkedin_profile: regForm.linkedin_profile || null, college_name: regForm.college_name.trim() || null, degree_course: regForm.degree_course.trim() || null, graduation_year: regForm.graduation_year ? parseInt(regForm.graduation_year) : null };
      const { data: newCand, error: insertError } = await supabase.from('candidates').insert(insertData).select().single();
        
      if (insertError) { setErrorMsg(`Registration operation aborted: ${insertError.message}`); setUploading(false); return; }
      
      let resumeUrl = null;
      try { resumeUrl = await uploadResume(resumeFile, newCand.id); } 
      catch (uploadError) { alert('Resume upload failed. Please try again.'); setUploading(false); return; }
      
      if (resumeUrl) {
        const { error: updateError } = await supabase.from('candidates').update({ resume_link: resumeUrl }).eq('id', newCand.id);
        if (updateError) { alert('Failed to save resume link. Please contact support.'); setUploading(false); return; }
      }
      
      if (regForm.source === 'Referral') {
        await supabase.from('referrals').insert({ candidate_id: newCand.id, candidate_name: regForm.name.trim(), candidate_email: cleanEmail, referrer_name: regForm.referrer_name.trim(), referrer_contact: regForm.referrer_contact.trim(), status: 'Pending' });
      }
      
      alert('Registered successfully! Taking you to your workspace...');
      // 🔥 HARD RESET
      localStorage.removeItem('candidateEmail');
      localStorage.setItem('candidateEmail', newCand.email);
      window.location.href = '/portal';
    } catch (err) { alert('An error occurred during registration. Please try again.'); setUploading(false); }
  }

  const handleLogout = async () => {
    // 🔥 HARD RESET
    localStorage.removeItem('candidateEmail'); 
    window.location.href = '/login'; 
  };
  // ==========================================

  async function handleSubmitQuestion(e) {
    e.preventDefault();
    if (!newQuestion.trim()) { alert('Please enter your question.'); return; }
    
    setIsSubmittingQuestion(true);
    const { data, error } = await supabase.from('candidate_questions').insert({
        candidate_id: candidate.id, candidate_name: candidate.name || candidate.full_name, candidate_email: candidate.email, question: newQuestion.trim(), status: 'Pending', is_public: false
      }).select().single();
      
    if (error) { alert(`Failed to submit question: ${error.message}`); } 
    else { alert('Your question has been submitted. HR will respond shortly.'); setNewQuestion(''); await fetchQuestions(); }
    setIsSubmittingQuestion(false);
  }

  async function handleAcceptInterview(interviewId) {
    const { error } = await supabase.from('interviews').update({ candidate_accepted: true }).eq('id', interviewId);
    if (error) { alert("Failed to update status. Please try again."); } 
    else { alert("Interview accepted! HR has been notified."); fetchWorkflowContext(); }
  }

  async function handleRequestReschedule(e) {
    e.preventDefault();
    const selectedInterview = interviews.find(x => x.id === selectedInterviewId);
    if ((selectedInterview?.reschedule_count || 0) >= 2) { alert('Maximum 2 reschedule requests allowed.'); return; }
    if (!selectedInterviewId || !rescheduleReason.trim()) { alert('Please provide your availability preferences and reason for rescheduling.'); return; }
    
    const { error } = await supabase.from('interview_reschedule_requests').insert({ interview_id: selectedInterviewId, requested_by: 'Candidate', reason: rescheduleReason.trim(), proposed_time_1: new Date().toISOString(), status: 'Pending' });
    
    if (error) { alert(`Error documenting request parameters: ${error.message}`); } 
    else {
      await supabase.from('interviews').update({ status: 'Reschedule_Requested', reschedule_count: (selectedInterview?.reschedule_count || 0) + 1 }).eq('id', selectedInterviewId);
      alert('Your reschedule request has been sent to HR.'); setRescheduleReason(''); setSelectedInterviewId(null); fetchWorkflowContext();
    }
  }

  const openFAQModal = () => setShowFAQModal(true);
  const closeFAQModal = () => setShowFAQModal(false);

  const groupedFAQs = faqs.reduce((groups, faq) => {
    const category = faq.category || 'General';
    if (!groups[category]) groups[category] = [];
    groups[category].push(faq); return groups;
  }, {});

  const isLoginPath = window.location.pathname === '/login';

  function extractTimeFromISO(isoString) {
    if (!isoString) return '';
    try {
      const istTime = new Date(new Date(isoString).getTime() + (5.5 * 60 * 60 * 1000));
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hours % 12 || 12}:${minutes} ${ampm}`;
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
    try { return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }); } catch (e) { return ''; }
  };

  const formatTimeIST = (dateString) => { return extractTimeFromISO(dateString); };

  const hasProbationMeeting = () => { return onboardingData && onboardingData.probation_meeting_scheduled === true && onboardingData.probation_meeting_date; };

  const getProbationMeetingDetails = () => {
    if (!onboardingData) return null;
    return { date: onboardingData.probation_meeting_date, end: onboardingData.probation_meeting_end, link: onboardingData.probation_meeting_link };
  };

  const isOnWaitlist = candidate?.current_stage === 'Waitlist';

  // ==========================================
  // PREMIUM LOGIN & REGISTRATION UI
  // ==========================================
  if (!candidate || isLoginPath) {
    const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', backdropFilter: 'blur(10px)', fontFamily: 'inherit' };
    const labelStyle = { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#e2e8f0', marginBottom: '6px' };

    return (
      <>
        <div className="aurora-bg"></div>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 1 }}>
          <div className="glass-panel animate-fade-up" style={{ width: '100%', maxWidth: isRegistering ? '700px' : '440px', padding: '40px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img src="/jarurat-logo.png" alt="Jarurat Care Foundation" style={{ height: '60px', objectFit: 'contain', marginBottom: '16px' }} />
              <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Candidate Portal</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>{isRegistering ? "Join our mission to transform cancer care." : "Welcome back. Log in to track your application."}</p>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#fca5a5', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
                {errorMsg}
              </div>
            )}

            {!isRegistering ? (
              <form onSubmit={handleLogin} className="animate-fade-up delay-100">
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Registered Email</label>
                  <input type="email" placeholder="name@example.com" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }} />
                </div>
                <button type="submit" className="btn-premium" style={{ width: '100%' }}>Continue to Portal</button>
                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>New Applicant? <span onClick={() => setIsRegistering(true)} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s' }}>Register here</span></p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="animate-fade-up delay-100">
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', margin: '0 0 16px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Full Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="John Doe" value={regForm.name} onChange={(e) => setRegForm({...regForm, name: e.target.value})} style={{...inputStyle, border: formErrors.name ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.name && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}</div>
                    <div><label style={labelStyle}>Email Address <span style={{ color: '#ef4444' }}>*</span></label><input type="email" placeholder="john@example.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{...inputStyle, border: formErrors.email ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.email && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}</div>
                    <div><label style={labelStyle}>Contact Number <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="+91 XXXXX XXXXX" value={regForm.phone} onChange={(e) => setRegForm({...regForm, phone: e.target.value})} style={{...inputStyle, border: formErrors.phone ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.phone && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}</div>
                    <div>
                      <label style={labelStyle}>Domain <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={regForm.domain} onChange={(e) => setRegForm({...regForm, domain: e.target.value})} style={{...inputStyle, border: formErrors.domain ? '1px solid #ef4444' : inputStyle.border, color: '#000'}}>
                        <option value="">Select domain...</option>
                        {domains.length > 0 ? domains.map(d => <option key={d} value={d}>{d}</option>) : <><option value="Human Resources (HR)">Human Resources (HR)</option><option value="Marketing">Marketing</option><option value="UI/UX Design">UI/UX Design</option></>}
                      </select>
                      {formErrors.domain && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.domain}</span>}
                    </div>
                    <div>
                      <label style={labelStyle}>Source <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={regForm.source} onChange={(e) => { setRegForm({...regForm, source: e.target.value}); if (e.target.value !== 'Referral' && e.target.value !== 'Other') { setRegForm(prev => ({...prev, source: e.target.value, referrer_contact: '', referrer_name: '', other_source: ''})); } }} style={{...inputStyle, border: formErrors.source ? '1px solid #ef4444' : inputStyle.border, color: '#000'}}>
                        <option value="">Select source...</option><option value="Internshala">Internshala</option><option value="Referral">Referral</option><option value="LinkedIn">LinkedIn</option><option value="Other">Other</option>
                      </select>
                      {formErrors.source && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.source}</span>}
                    </div>
                    {regForm.source === 'Other' && (
                      <div><label style={labelStyle}>Specify Source <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="Where did you hear about us?" value={regForm.other_source} onChange={(e) => setRegForm({...regForm, other_source: e.target.value})} style={{...inputStyle, border: formErrors.other_source ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.other_source && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.other_source}</span>}</div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', margin: '0 0 16px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Education</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>College/University <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="e.g., IIT Bombay" value={regForm.college_name} onChange={(e) => setRegForm({...regForm, college_name: e.target.value})} style={{...inputStyle, border: formErrors.college_name ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.college_name && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.college_name}</span>}</div>
                    <div><label style={labelStyle}>Degree/Course <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="e.g., B.Tech, MBA" value={regForm.degree_course} onChange={(e) => setRegForm({...regForm, degree_course: e.target.value})} style={{...inputStyle, border: formErrors.degree_course ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.degree_course && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.degree_course}</span>}</div>
                    <div><label style={labelStyle}>Graduation Year <span style={{ color: '#ef4444' }}>*</span></label><input type="number" placeholder="e.g., 2024" min="2000" value={regForm.graduation_year} onChange={(e) => setRegForm({...regForm, graduation_year: e.target.value})} style={{...inputStyle, border: formErrors.graduation_year ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.graduation_year && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.graduation_year}</span>}</div>
                    <div><label style={labelStyle}>City/Address <span style={{ color: '#ef4444' }}>*</span></label><input type="text" placeholder="Current city & pincode" value={regForm.address} onChange={(e) => setRegForm({...regForm, address: e.target.value})} style={{...inputStyle, border: formErrors.address ? '1px solid #ef4444' : inputStyle.border}} />{formErrors.address && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.address}</span>}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', margin: '0 0 16px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Profile Links</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Upload Resume (PDF, Max 100MB) <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label className="btn-glass" style={{ padding: '8px 16px', fontSize: '14px', display: 'inline-block' }}>Choose File<input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0 && validateFile(e.target.files[0])) { setResumeFile(e.target.files[0]); setFormErrors({...formErrors, resume: ''}); } e.target.value = ''; }} /></label>
                      {resumeFile ? (<div style={{ color: '#4ade80', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}><span>📄 {resumeFile.name}</span><span onClick={() => setResumeFile(null)} style={{ color: '#fca5a5', cursor: 'pointer', fontSize: '12px' }}>Remove</span></div>) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No file selected</span>)}
                    </div>
                    {formErrors.resume && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.resume}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>LinkedIn URL</label><input type="url" placeholder="https://linkedin.com/in/..." value={regForm.linkedin_profile} onChange={(e) => setRegForm({...regForm, linkedin_profile: e.target.value})} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Portfolio / GitHub URL</label><input type="url" placeholder="https://..." value={regForm.portfolio_link} onChange={(e) => setRegForm({...regForm, portfolio_link: e.target.value})} style={inputStyle} /></div>
                  </div>
                </div>

                {regForm.source === 'Referral' && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <h4 style={{ color: '#60a5fa', margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase' }}>Referrer Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div><label style={labelStyle}>Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={regForm.referrer_name} onChange={(e) => setRegForm({...regForm, referrer_name: e.target.value})} style={inputStyle} />{formErrors.referrer_name && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.referrer_name}</span>}</div>
                      <div><label style={labelStyle}>Contact <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={regForm.referrer_contact} onChange={(e) => setRegForm({...regForm, referrer_contact: e.target.value})} style={inputStyle} />{formErrors.referrer_contact && <span className="field-error" style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', display: 'block' }}>{formErrors.referrer_contact}</span>}</div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={uploading} className="btn-premium" style={{ width: '100%', opacity: uploading ? 0.7 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>{uploading ? 'Processing Application...' : 'Submit Application'}</button>
                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>Already registered? <span onClick={() => setIsRegistering(false)} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: '600' }}>Return to Login</span></p>
              </form>
            )}
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // DASHBOARD UI (Restored Logic)
  // ==========================================
  const stageMapping = [
    { id: 'Applied', label: 'APPLICATION\nSUBMITTED' },
    { id: 'Assignment', label: 'ASSIGNMENT\nPIPELINE' },
    { id: 'Interview', label: 'INTERVIEW\nSYSTEM' },
    { id: 'Probation', label: 'PROBATION\nACTIVE' },
    { id: 'Onboarding Done', label: 'ONBOARDING\nCOMPLETE' }
  ];
  
  let currentStepIndex = 0;
  if (candidate.current_stage === 'Waitlist') {
    const restoreStage = candidate.waitlist_restore_stage || 'Applied';
    const foundIndex = stageMapping.findIndex(s => s.id === restoreStage);
    currentStepIndex = foundIndex !== -1 ? foundIndex : 0;
  } else if (['Selected', 'Rejected', 'Internship Discontinued', 'Withdrawn', 'Terminated'].includes(candidate.current_stage)) {
    currentStepIndex = 3; 
  } else {
    const foundIndex = stageMapping.findIndex(s => s.id === candidate.current_stage);
    if (foundIndex !== -1) currentStepIndex = foundIndex;
  }

  const isSubmissionCompleted = assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated';
  const getAssignmentTitle = () => { if (!candidate) return 'Assignment'; return `${candidate.domain} Assignment`; };
  const formatTime = (milliseconds) => {
    if (milliseconds === null) return 'Calculating...'; if (milliseconds <= 0) return 'EXPIRED';
    const totalSeconds = Math.floor(milliseconds / 1000); const days = Math.floor(totalSeconds / 86400); const hours = Math.floor((totalSeconds % 86400) / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`; return `${hours}h ${minutes}m ${seconds}s`;
  };

  const hasClearedR1 = candidate.r1_status === 'Passed' || candidate.r1_status === 'Selected';
  const hasClearedR2 = candidate.r2_status === 'Passed' || candidate.r2_status === 'Selected';
  const hasR2Scheduled = interviews.some(iv => iv.round === 'R2' && iv.status === 'Scheduled');

  const isAssignmentLate = () => {
    if (!assignment || !assignment.deadline) return false;
    if (assignment.assignment_status === 'Submitted' && assignment.submitted_at) { return new Date(assignment.submitted_at).getTime() > new Date(assignment.deadline).getTime(); }
    return false;
  };

  const getLateDuration = () => {
    if (!assignment || !assignment.deadline || !assignment.submitted_at) return null;
    const deadline = new Date(assignment.deadline).getTime(); const submittedAt = new Date(assignment.submitted_at).getTime();
    if (submittedAt <= deadline) return null;
    const lateMs = submittedAt - deadline; return `${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
  };

  const probationMeeting = hasProbationMeeting() ? getProbationMeetingDetails() : null;

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.3 }}></div>
      <div style={{ minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: 'relative', zIndex: 1 }}>
        <header className="glass-panel" style={{ borderRadius: 0, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/jarurat-logo.png" alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Jarurat Care <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>| Candidate Workspace</span></span>
          </div>
          <button type="button" onClick={handleLogout} className="btn-glass" style={{ padding: '8px 16px', fontSize: '13px' }}>Sign Out</button>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Waitlist Banner */}
          {isOnWaitlist && (
            <div className="glass-panel animate-fade-up" style={{ padding: '30px', marginBottom: '30px', textAlign: 'center', border: '1px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}>
              <h3 style={{ color: '#c4b5fd', margin: '0 0 8px 0', fontSize: '22px' }}>You're on our Waitlist</h3>
              <p style={{ color: '#e2e8f0', fontSize: '15px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                Thank you for your interest. While we don't have an exact match right now, your profile is impressive and we've placed you on our priority waitlist.
              </p>
            </div>
          )}

          {/* Progress Bar (Glassmorphic) */}
          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '30px', marginBottom: '30px', textAlign: 'center' }}>
            <h3 style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '2px', color: 'var(--text-muted)', margin: '0 0 30px 0', fontWeight: '700' }}>Application Pipeline</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
              {stageMapping.map((stage, index) => {
                let isCompleted = index <= currentStepIndex;
                if (stage.id === 'Assignment') {
                  isCompleted = assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated';
                } else if (stage.id === 'Interview') {
                  const isInterviewCleared = ['Selected', 'Probation', 'Onboarding Done', 'Internship Discontinued', 'Withdrawn', 'Terminated'].includes(candidate.current_stage);
                  isCompleted = candidate.current_stage === 'Waitlist' ? index <= stageMapping.findIndex(s => s.id === (candidate.waitlist_restore_stage || 'Applied')) : isInterviewCleared;
                } else if (stage.id === 'Probation') {
                  const isProbationActive = ['Probation', 'Onboarding Done', 'Internship Discontinued', 'Withdrawn', 'Terminated'].includes(candidate.current_stage);
                  isCompleted = candidate.current_stage === 'Waitlist' ? index <= stageMapping.findIndex(s => s.id === (candidate.waitlist_restore_stage || 'Applied')) : isProbationActive;
                } else if (stage.id === 'Onboarding Done') {
                  isCompleted = candidate.current_stage === 'Onboarding Done';
                } else {
                  isCompleted = candidate.current_stage === 'Waitlist' && stage.id === 'Applied' ? true : index <= currentStepIndex;
                }

                const isActive = index === currentStepIndex && !['Rejected', 'Internship Discontinued', 'Withdrawn', 'Terminated', 'Waitlist'].includes(candidate.current_stage);
                
                let bgColor = 'rgba(255, 255, 255, 0.1)'; let textColor = '#64748b'; let glow = 'none';

                if (isCompleted) { bgColor = '#10b981'; textColor = '#fff'; glow = '0 0 15px rgba(16, 185, 129, 0.4)'; }
                if (isActive && !isCompleted && !['Rejected', 'Internship Discontinued', 'Withdrawn', 'Terminated', 'Waitlist'].includes(candidate.current_stage)) { bgColor = 'var(--primary)'; textColor = '#fff'; glow = '0 0 20px var(--primary-glow)'; }

                return (
                  <React.Fragment key={stage.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: bgColor, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', boxShadow: glow, transition: 'all 0.3s' }}>
                        {isCompleted && !['Rejected', 'Internship Discontinued', 'Withdrawn', 'Terminated', 'Waitlist'].includes(candidate.current_stage) ? '✓' : index + 1}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '12px', color: isCompleted || isActive ? '#fff' : 'var(--text-muted)', whiteSpace: 'pre-line', textAlign: 'center', letterSpacing: '0.5px' }}>{stage.label}</span>
                    </div>
                    {index < stageMapping.length - 1 && <div style={{ height: '2px', background: index < currentStepIndex ? '#10b981' : 'rgba(255, 255, 255, 0.1)', flex: 1, position: 'relative', top: '-15px' }} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '30px' }} className="animate-fade-up delay-200">
            {/* Main Action Area */}
            <div className="glass-panel" style={{ padding: '40px' }}>
              <h2 style={{ fontSize: '28px', color: '#fff', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Welcome to the workspace, {candidate.name?.split(' ')[0]}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '0 0 30px 0' }}>Your internship lifecycle portal is now active.</p>
              
              {/* STAGE: APPLIED */}
              {candidate.current_stage === 'Applied' && (
                <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#fff', fontWeight: '600' }}>Application Under Review</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6' }}>We are currently evaluating your profile. If your qualifications align with our mission requirements, our system will provision the next steps.</p>
                </div>
              )}

              {/* STAGE: ASSIGNMENT */}
              {candidate.current_stage === 'Assignment' && (
                <div>
                  {assignment && (assignment.assignment_status === 'Submitted' || assignment.assignment_status === 'Evaluated') ? (
                    <div style={{ background: isAssignmentLate() ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderLeft: isAssignmentLate() ? '4px solid #ef4444' : '4px solid #10b981', padding: '16px 20px', borderRadius: '8px', marginBottom: '25px' }}>
                      <p style={{ margin: 0, color: isAssignmentLate() ? '#fca5a5' : '#6ee7b7', fontSize: '15px', lineHeight: '1.5', fontWeight: '500' }}>
                        {isAssignmentLate() ? `LATE SUBMISSION: Your assignment was submitted ${getLateDuration()} past the deadline.` : 'Your assignment is securely logged and under evaluation.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', padding: '16px 20px', borderRadius: '8px', marginBottom: '25px' }}>
                      <p style={{ margin: 0, color: '#bfdbfe', fontSize: '15px', lineHeight: '1.5' }}>
                        Please complete the <strong>{candidate.domain}</strong> assessment. <br />
                        {isLate ? <span style={{ color: '#fca5a5', fontWeight: '600', display: 'block', marginTop: '8px' }}>DEADLINE OVER. (Late by: {lateDuration})</span> : <span style={{ color: '#93c5fd', fontWeight: '600', display: 'block', marginTop: '8px' }}>Time remaining: {formatTime(timeLeft)}</span>}
                      </p>
                    </div>
                  )}

                  {assignment ? (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '30px' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#fff', textAlign: 'center', fontWeight: '700' }}>Task: {getAssignmentTitle()}</h3>
                      <div style={{ textAlign: 'center', marginBottom: '30px' }}><a href={assignment.task_link_template} target="_blank" rel="noreferrer" className="btn-premium" style={{ display: 'inline-block', textDecoration: 'none' }}>Access Assignment Brief</a></div>
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
                        
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '10px' }}>Upload Deliverables (Max 5 files, 100MB each)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <label className="btn-glass" style={{ padding: '10px 20px', fontSize: '14px', display: 'inline-block', cursor: isSubmissionDisabled() ? 'not-allowed' : 'pointer', opacity: isSubmissionDisabled() ? 0.5 : 1 }}>
                              Select Files<input type="file" multiple onChange={handleFileUpload} disabled={isSubmissionDisabled() || uploadedFiles.length >= 5} style={{ display: 'none' }} />
                            </label>
                            {isUploadingFiles && <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Securely uploading...</span>}
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{uploadedFiles.length}/5 uploaded</span>
                          </div>
                          {uploadedFiles.length > 0 && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {uploadedFiles.map((file) => (
                                <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                    <a href={file.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '14px', color: '#60a5fa', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_name}</a>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                  {!isSubmissionDisabled() && <button onClick={() => handleRemoveFile(file.id)} style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>External Links (Drive, GitHub, Figma)</label>
                          <input type="url" placeholder="https://..." value={assignmentLink} onChange={(e) => setAssignmentLink(e.target.value)} disabled={isSubmissionDisabled()} style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontFamily: 'inherit' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button onClick={handleSubmitAssignment} disabled={isSubmissionDisabled() || !isSubmissionValid()} className={isSubmissionDisabled() || !isSubmissionValid() ? 'btn-glass' : 'btn-premium'} style={{ opacity: (isSubmissionDisabled() || !isSubmissionValid()) ? 0.5 : 1 }}>
                            {isSubmitting ? 'Committing...' : (isLate ? 'Submit Late Penalty' : 'Finalize Submission')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : <p style={{ color: 'var(--text-muted)' }}>Initializing workspace...</p>}
                </div>
              )}

              {/* STAGE: INTERVIEW */}
              {candidate.current_stage === 'Interview' && (
                <div>
                  <h3 style={{ fontSize: '20px', color: '#fff', margin: '0 0 20px 0', fontWeight: '700' }}>Interview Telemetry</h3>
                  {hasClearedR1 && !hasClearedR2 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
                      <p style={{ margin: 0, color: '#6ee7b7', fontSize: '15px' }}><strong>Round 1 Cleared</strong> — Stand by for next module instructions.</p>
                    </div>
                  )}
                  {interviews.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Waiting for HR node to allocate interview coordinates.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {interviews.filter(iv => iv.status !== 'On Hold' && iv.result !== 'On Hold').map(iv => {
                        const isAccepted = iv.candidate_accepted === true;
                        const isRescheduleRequested = iv.status === 'Reschedule_Requested';
                        const isRescheduleFormOpen = selectedInterviewId === iv.id;
                        
                        return (
                          <div key={iv.id} style={{ border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <span style={{ fontWeight: '800', color: '#60a5fa', fontSize: '16px', letterSpacing: '1px' }}>{iv.round}</span>
                              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>{iv.status || 'Pending'}</span>
                            </div>
                            <p style={{ margin: '6px 0', fontSize: '15px', color: '#cbd5e1' }}><strong>Date:</strong> {getFormattedDateIST(iv.scheduled_date_time)}</p>
                            <p style={{ margin: '6px 0', fontSize: '15px', color: '#cbd5e1' }}><strong>Time Slot:</strong> {getTimeSlotDisplay(iv) || formatTimeIST(iv.scheduled_date_time)}</p>
                            
                            <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="btn-premium" style={{ textDecoration: 'none' }}>Join Secure Room</a>
                              <button onClick={() => handleAcceptInterview(iv.id)} disabled={isAccepted || isRescheduleRequested || iv.result === 'Selected' || iv.result === 'Rejected'} className="btn-glass">
                                {isAccepted ? 'Confirmed' : 'Acknowledge'}
                              </button>
                              {iv.result === 'Pending' && (iv.reschedule_count || 0) < 2 && (
                                <button onClick={() => setSelectedInterviewId(iv.id)} disabled={isAccepted || isRescheduleRequested} className="btn-glass" style={{ color: (isAccepted || isRescheduleRequested) ? 'var(--text-muted)' : '#fff' }}>
                                  {isRescheduleRequested ? 'Reschedule Requested' : 'Request Time Reschedule'}
                                </button>
                              )}
                            </div>
                            
                            {isRescheduleFormOpen && (
                              <form onSubmit={handleRequestReschedule} style={{ marginTop: '20px', padding: '20px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#fbbf24', fontSize: '14px' }}>Request Reschedule</h4>
                                <textarea required placeholder="Mention your availability preferences..." value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} style={{ width: '100%', height: '80px', padding: '12px', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', marginBottom: '10px' }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button type="submit" className="btn-premium" style={{ background: '#f59e0b', color: '#000' }}>Submit Request</button>
                                  <button type="button" onClick={() => setSelectedInterviewId(null)} className="btn-glass">Cancel</button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* END STATES: RESTORED BLOCKS */}
              
              {candidate.current_stage === 'Selected' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                  <h3 style={{ color: '#34d399', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Congratulations, You Are Selected!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                    We are pleased to inform you that you have successfully cleared all stages of our evaluation process. The HR team will be in touch with you shortly to initiate the next steps of your journey.
                  </p>
                  {probationMeeting && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '24px', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
                      <h4 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '16px', textAlign: 'center' }}>📅 Probation Meeting Scheduled</h4>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>Date: <span style={{color: '#fff', fontWeight: '600'}}>{getFormattedDateIST(probationMeeting.date)}</span></p>
                        <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>Time: <span style={{color: '#fff', fontWeight: '600'}}>{extractTimeFromISO(probationMeeting.date)} - {extractTimeFromISO(probationMeeting.end)}</span></p>
                        <p style={{ margin: '16px 0 0 0', textAlign: 'center' }}>
                          <a href={probationMeeting.link} target="_blank" rel="noreferrer" className="btn-premium" style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}>Join Meeting Securely</a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {candidate.current_stage === 'Probation' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚀</div>
                  <h3 style={{ color: '#60a5fa', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Active Probation</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                    You are currently in your probationary period. We look forward to your growth with the team!
                  </p>
                  {probationMeeting && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '24px', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
                      <h4 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '16px', textAlign: 'center' }}>📅 Probation Meeting Scheduled</h4>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>Date: <span style={{color: '#fff', fontWeight: '600'}}>{getFormattedDateIST(probationMeeting.date)}</span></p>
                        <p style={{ margin: '4px 0', color: 'var(--text-muted)' }}>Time: <span style={{color: '#fff', fontWeight: '600'}}>{extractTimeFromISO(probationMeeting.date)} - {extractTimeFromISO(probationMeeting.end)}</span></p>
                        <p style={{ margin: '16px 0 0 0', textAlign: 'center' }}>
                          <a href={probationMeeting.link} target="_blank" rel="noreferrer" className="btn-premium" style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}>Join Meeting Securely</a>
                        </p>
                      </div>
                    </div>
                  )}
                  {!probationMeeting && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#fbbf24' }}>Your probation meeting will be scheduled soon. Please check back.</p>
                  )}
                </div>
              )}

              {candidate.current_stage === 'Onboarding Done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎓</div>
                  <h3 style={{ color: '#34d399', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Onboarding Complete!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>Congratulations on completing your onboarding journey. We are pleased to officially welcome you to the organization.</p>
                </div>
              )}

              {candidate.current_stage === 'Rejected' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📪</div>
                  <h3 style={{ color: '#fca5a5', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Application Update</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>Thank you for your interest in joining Jarurat Care Foundation. After a thorough review, we regret to inform you that we will not be proceeding with your candidacy at this time. We wish you the very best in your future career endeavors.</p>
                </div>
              )}

              {candidate.current_stage === 'Internship Discontinued' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ color: '#fbbf24', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Internship Discontinued</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>After careful consideration, we have decided to conclude your internship journey. We truly appreciate the efforts you have put in and wish you the very best.</p>
                </div>
              )}

              {candidate.current_stage === 'Terminated' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>⛔</div>
                  <h3 style={{ color: '#f87171', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Contract Terminated</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>After careful evaluation of your performance during the probationary period, we have decided to conclude your association with the foundation.</p>
                </div>
              )}

              {candidate.current_stage === 'Withdrawn' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>👋</div>
                  <h3 style={{ color: '#c4b5fd', fontSize: '26px', margin: '0 0 12px 0', fontWeight: '800' }}>Application Withdrawn</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>We acknowledge that you have decided to withdraw your application. We respect your decision and appreciate the time you invested in our selection process.</p>
                </div>
              )}

            </div>

            {/* Sidebar Widget Area */}
            <div>
              {/* Status Widget */}
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>System Status</h3>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>STAGE LOCK</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#60a5fa' }}>{candidate.current_stage?.toUpperCase() ?? 'N/A'}</span>
                </div>
                <button onClick={fetchWorkflowContext} className="btn-glass" style={{ width: '100%', marginTop: '24px', padding: '10px' }}>Sync State Node</button>
              </div>

              {/* Support Widget */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Direct Support Line</h3>
                <form onSubmit={handleSubmitQuestion}>
                  <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Initialize query..." rows="3" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }} />
                  <button type="submit" disabled={isSubmittingQuestion} className="btn-premium" style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '14px' }}>
                    {isSubmittingQuestion ? 'Transmitting...' : 'Send Query'}
                  </button>
                </form>

                {/* RESTORED: Questions Map Logic */}
                {questions.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Message History ({questions.length})
                    </h4>
                    {questions.map(q => {
                      const isSystemMessage = q.is_system_message === true;
                      return (
                        <div key={q.id} style={{ padding: '16px', background: isSystemMessage ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '12px', border: `1px solid ${isSystemMessage ? 'var(--accent)' : 'var(--glass-border)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', background: isSystemMessage ? 'rgba(139, 92, 246, 0.2)' : (q.status === 'Replied' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'), color: isSystemMessage ? '#c4b5fd' : (q.status === 'Replied' ? '#6ee7b7' : '#fcd34d'), textTransform: 'uppercase' }}>
                              {isSystemMessage ? 'System Notification' : (q.status === 'Replied' ? 'Replied' : 'Pending')}
                            </span>
                          </div>
                          {isSystemMessage ? (
                            <>
                              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#c4b5fd' }}>{q.question}</p>
                              {q.question_replies?.map(r => (
                                <div key={r.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '13px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{r.reply}</div>
                              ))}
                            </>
                          ) : (
                            <>
                              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}><strong>Q:</strong> {q.question}</p>
                              {q.question_replies?.map(r => (
                                <div key={r.id} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--primary)', marginTop: '8px' }}>
                                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#93c5fd' }}><strong>HR Reply:</strong> {r.reply}</p>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
                                </div>
                              ))}
                            </>
                          )}
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '12px 0 0 0' }}>{new Date(q.created_at).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* FAQ Link */}
                <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                  <span onClick={openFAQModal} style={{ color: '#60a5fa', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Browse Knowledge Base →</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FAQ Modal */}
      {showFAQModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', margin: '0 0 20px 0' }}>Knowledge Base</h2>
            <button onClick={closeFAQModal} className="btn-glass" style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px 16px' }}>Close</button>
            {Object.keys(groupedFAQs).map(category => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#60a5fa', fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>{category}</h3>
                {groupedFAQs[category].map(faq => (
                  <div key={faq.id} style={{ margin: '16px 0' }}>
                    <p style={{ color: '#fff', fontWeight: '600', margin: '0 0 8px 0' }}>Q: {faq.question}</p>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', lineHeight: '1.6' }}>A: {faq.answer}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}