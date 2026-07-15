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

// ===== ACTIVITY LOGGING HELPER =====
async function logTeamActivity(action, entityType, entityId, details = {}) {
  const hrUser = localStorage.getItem('hrEmail') || 'system';
  const hrName = localStorage.getItem('userName') || 'System';
  const hrRole = localStorage.getItem('userRole') || 'system';
  const hrTeam = localStorage.getItem('userTeam') || 'leadership';

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

  // Fetch uploaded files for this candidate
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

  // Handle file download
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
    console.log("🚀 Fetching profile for ID:", id);

    const { data: c } = await supabase.from('candidates').select('*').eq('id', id).single();
    if (!c) {
      console.error("❌ Candidate not found");
      return;
    }
    setCandidate(c);
    setHrNotes(c.hr_notes || '');

    const { data: a } = await supabase.from('assignments').select('*').eq('candidate_id', id).maybeSingle();
    setAssignment(a);
    if (a) {
      setScores({
        content: a.content_score ?? '',
        formatting: a.formatting_score ?? '',
        ai: a.ai_score ?? ''
      });
    }

    const { data: i } = await supabase.from('interviews').select('*').eq('candidate_id', id).order('id', { ascending: true });
    setInterviews(i || []);

    let { data: o, error: fetchError } = await supabase
      .from('onboarding')
      .select('*')
      .eq('candidate_id', id)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching onboarding:", fetchError);
    }

    if (!o) {
      console.log("ℹ️ Onboarding row missing. Creating one now with upsert...");
      const { data: newOnboarding, error: createError } = await supabase
        .from('onboarding')
        .upsert({ candidate_id: id, onboarding_status: 'Pending', probation_status: 'Pending' }, { onConflict: 'candidate_id' })
        .select()
        .single();
      
      if (createError) {
        console.error("❌ Error creating/upserting onboarding row:", createError);
      } else {
        o = newOnboarding;
      }
    }
    setOnboarding(o);

    setRescheduleRequest(null);

    const activeRequestedInterview = (i || []).find(iv => iv.status === 'Reschedule_Requested');

    if (activeRequestedInterview) {
      const { data: req, error: reqError } = await supabase
        .from('interview_reschedule_requests')
        .select('*')
        .eq('interview_id', activeRequestedInterview.id)
        .eq('status', 'Pending')
        .maybeSingle();

      if (reqError) {
        console.error("❌ Error fetching reschedule request:", reqError);
      } else {
        console.log("✅ Reschedule Request Data Found:", req);
        setRescheduleRequest(req);
      }
    } else {
      console.log("ℹ️ No active reschedule request found for this candidate.");
    }
  }

  async function fetchCandidateQuestions() {
    if (!candidate) return;
    
    const { data, error } = await supabase
      .from('candidate_questions')
      .select('*, question_replies(*)')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
    } else {
      setCandidateQuestions(data || []);
    }
  }

  async function handleReplyToQuestion(questionId) {
    if (!replyText.trim()) {
      alert('Please enter your reply.');
      return;
    }
    
    const { error: replyError } = await supabase
      .from('question_replies')
      .insert({
        question_id: questionId,
        reply: replyText.trim(),
        replied_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
        is_hr_reply: true
      });
    
    if (replyError) {
      alert(`Failed to send reply: ${replyError.message}`);
      return;
    }
    
    await supabase
      .from('candidate_questions')
      .update({ status: 'Replied', updated_at: new Date().toISOString() })
      .eq('id', questionId);
    
    // ===== LOG ACTIVITY =====
    const question = candidateQuestions.find(q => q.id === questionId);
    await logTeamActivity(
      'hr_replied_to_question',
      'candidate_question',
      questionId,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        question: question?.question || 'Question',
        reply: replyText.trim()
      }
    );
    // ===== END LOG ACTIVITY =====
    
    alert('✅ Reply sent to candidate!');
    setReplyText('');
    setReplyingTo(null);
    fetchCandidateQuestions();
  }

  async function handleMarkAsFAQ(questionId) {
    const question = candidateQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    // ===== LOG ACTIVITY =====
    await logTeamActivity(
      'faq_marked_from_question',
      'candidate_question',
      questionId,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        question: question.question
      }
    );
    // ===== END LOG ACTIVITY =====
    
    setFaqForm({
      question: question.question,
      answer: '',
      category: 'General',
      questionId: questionId
    });
    setIsAddingFAQ(true);
    setSimilarFAQ(null);
  }

  async function checkFAQExists(question) {
    if (!question) return { exists: false, match: null };
    
    const normalizedQuestion = question.trim().toLowerCase();
    
    const { data, error } = await supabase
      .from('faqs')
      .select('question, id')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error checking FAQs:', error);
      return { exists: false, match: null };
    }
    
    if (data.length === 0) {
      return { exists: false, match: null };
    }
    
    const stopWords = ['what', 'is', 'the', 'are', 'for', 'to', 'of', 'a', 'an', 'on', 'at', 'by', 'in', 'with', 'without', 'and', 'or', 'but', 'for', 'nor', 'from', 'so', 'yet', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'will', 'would', 'could', 'should', 'may', 'might', 'must'];
    const keywords = normalizedQuestion
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (keywords.length === 0) {
      return { exists: false, match: null };
    }
    
    for (const faq of data) {
      const existingNormalized = faq.question.trim().toLowerCase();
      
      if (existingNormalized === normalizedQuestion) {
        return { exists: true, match: faq };
      }
      
      const existingWords = existingNormalized
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .filter(word => word.length > 2 && !stopWords.includes(word));
      
      const matchedKeywords = keywords.filter(keyword => 
        existingWords.some(word => word === keyword)
      );
      
      const matchRatio = matchedKeywords.length / keywords.length;
      
      if (matchRatio >= 0.65) {
        return { exists: true, match: faq };
      }
      
      if (keywords.length >= 3) {
        const longKeywords = keywords.filter(k => k.length > 4);
        if (longKeywords.length > 0) {
          const matchedLong = longKeywords.filter(k => 
            existingNormalized.includes(k)
          );
          if (matchedLong.length / longKeywords.length >= 0.8) {
            return { exists: true, match: faq };
          }
        }
      }
    }
    
    return { exists: false, match: null };
  }

  async function handleAddFAQ(e) {
    e.preventDefault();
    
    if (!faqForm.answer.trim()) {
      alert('Please enter the FAQ answer.');
      return;
    }
    
    const result = await checkFAQExists(faqForm.question);
    
    if (result.exists) {
      const confirmed = window.confirm(
        `⚠️ A similar question already exists in the FAQ list:\n\n"${result.match.question}"\n\nDo you still want to add this as a new FAQ?`
      );
      if (!confirmed) {
        return;
      }
    }
    
    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question: faqForm.question,
        answer: faqForm.answer.trim(),
        category: faqForm.category || 'General',
        is_active: true,
        created_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR'
      })
      .select()
      .single();
    
    if (error) {
      alert(`Failed to add FAQ: ${error.message}`);
    } else {
      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'faq_added',
        'faq',
        data?.id || null,
        {
          question: faqForm.question,
          category: faqForm.category || 'General',
          added_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
          source_question_id: faqForm.questionId || null
        }
      );
      // ===== END LOG ACTIVITY =====
      
      alert('✅ FAQ added successfully!');
      await supabase
        .from('candidate_questions')
        .update({ is_public: true })
        .eq('id', faqForm.questionId || candidateQuestions.find(q => q.question === faqForm.question)?.id);
      
      setIsAddingFAQ(false);
      setFaqForm({ question: '', answer: '', category: '', questionId: null });
      setSimilarFAQ(null);
      fetchCandidateQuestions();
    }
  }

  async function handleWithdrawCandidate() {
    if (!withdrawReason.trim()) {
      alert('Please enter a reason for withdrawal.');
      return;
    }

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          current_stage: 'Withdrawn',
          hr_notes: candidate.hr_notes 
            ? `${candidate.hr_notes}\n\n[WITHDRAWN] ${new Date().toLocaleString()}: ${withdrawReason.trim()}`
            : `[WITHDRAWN] ${new Date().toLocaleString()}: ${withdrawReason.trim()}`
        })
        .eq('id', id);

      if (error) {
        alert(`Failed to withdraw candidate: ${error.message}`);
        return;
      }

      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'candidate_withdrawn',
        'candidate',
        id,
        {
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          reason: withdrawReason.trim()
        }
      );
      // ===== END LOG ACTIVITY =====

      alert('✅ Candidate has been marked as Withdrawn.');
      setShowWithdrawModal(false);
      setWithdrawReason('');
      fetchCompleteProfile();
    } catch (err) {
      console.error('Error withdrawing candidate:', err);
      alert('An error occurred while withdrawing the candidate.');
    }
  }

  async function handleWaitlistCandidate() {
    if (!waitlistReason.trim()) {
      alert('Please enter a reason for adding to waitlist.');
      return;
    }

    const restoreStage = candidate.current_stage;

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          current_stage: 'Waitlist',
          waitlist_restore_stage: restoreStage,
          waitlist_reason: waitlistReason.trim(),
          waitlist_notes: waitlistNotes.trim() || null,
          waitlisted_at: new Date().toISOString(),
          waitlist_status: 'Active',
          hr_notes: candidate.hr_notes 
            ? `${candidate.hr_notes}\n\n[WAITLISTED] ${new Date().toLocaleString()}: ${waitlistReason.trim()}`
            : `[WAITLISTED] ${new Date().toLocaleString()}: ${waitlistReason.trim()}`
        })
        .eq('id', id);

      if (error) {
        alert(`Failed to add candidate to waitlist: ${error.message}`);
        return;
      }

      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'candidate_waitlisted',
        'candidate',
        id,
        {
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          reason: waitlistReason.trim(),
          restore_stage: restoreStage
        }
      );
      // ===== END LOG ACTIVITY =====

      const waitlistMessage = `Dear ${candidate.name || 'Candidate'},

Thank you for your interest in joining Jarurat Care Foundation. We have reviewed your application and appreciate the time and effort you've invested in our recruitment process.

While we are impressed with your profile, we currently do not have an opening that perfectly matches your skills and experience. However, we believe you would be a valuable addition to our team in the future.

We have placed your application on our waitlist. Should a suitable position become available in the coming months, we will reach out to you directly with an opportunity to reopen your application.

We appreciate your understanding and wish you the very best in your career journey.

Warm regards,
HR Team
Jarurat Care Foundation`;

      const { error: questionError } = await supabase
        .from('candidate_questions')
        .insert({
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          candidate_email: candidate.email,
          question: `📋 Application Status Update`,
          status: 'Replied',
          is_public: false,
          is_system_message: true,
          created_at: new Date().toISOString()
        });

      if (questionError) {
        console.error('Error sending waitlist message:', questionError);
      } else {
        const { data: questionData } = await supabase
          .from('candidate_questions')
          .select('id')
          .eq('candidate_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (questionData) {
          await supabase
            .from('question_replies')
            .insert({
              question_id: questionData.id,
              reply: waitlistMessage,
              replied_by: 'Jarurat Care Foundation',
              is_hr_reply: false,
              is_system_reply: true,
              created_at: new Date().toISOString()
            });
        }
      }

      alert('✅ Candidate has been added to the waitlist. A formal notification has been sent to the candidate.');
      setShowWaitlistModal(false);
      setWaitlistReason('');
      setWaitlistNotes('');
      fetchCompleteProfile();
    } catch (err) {
      console.error('Error adding to waitlist:', err);
      alert('An error occurred while adding the candidate to waitlist.');
    }
  }

  async function handleRestoreFromWaitlist() {
    if (!candidate.waitlist_restore_stage) {
      alert('No restore stage found for this candidate.');
      return;
    }

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          current_stage: candidate.waitlist_restore_stage,
          waitlist_status: 'Restored',
          waitlist_restored_at: new Date().toISOString(),
          hr_notes: candidate.hr_notes 
            ? `${candidate.hr_notes}\n\n[RESTORED FROM WAITLIST] ${new Date().toLocaleString()}`
            : `[RESTORED FROM WAITLIST] ${new Date().toLocaleString()}`
        })
        .eq('id', id);

      if (error) {
        alert(`Failed to restore candidate: ${error.message}`);
        return;
      }

      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'candidate_restored_from_waitlist',
        'candidate',
        id,
        {
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          restored_stage: candidate.waitlist_restore_stage
        }
      );
      // ===== END LOG ACTIVITY =====

      const restoreMessage = `Dear ${candidate.name || 'Candidate'},

We hope this message finds you well!

We are pleased to inform you that a position matching your profile has become available at Jarurat Care Foundation. Your application is being reopened from our waitlist.

You can now log in to your candidate portal to continue the recruitment process from where you left off. Please check your portal for the next steps.

We look forward to reconnecting with you!

Warm regards,
HR Team
Jarurat Care Foundation`;

      const { error: questionError } = await supabase
        .from('candidate_questions')
        .insert({
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          candidate_email: candidate.email,
          question: `🔔 Application Reopened`,
          status: 'Replied',
          is_public: false,
          is_system_message: true,
          created_at: new Date().toISOString()
        });

      if (!questionError) {
        const { data: questionData } = await supabase
          .from('candidate_questions')
          .select('id')
          .eq('candidate_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (questionData) {
          await supabase
            .from('question_replies')
            .insert({
              question_id: questionData.id,
              reply: restoreMessage,
              replied_by: 'Jarurat Care Foundation',
              is_hr_reply: false,
              is_system_reply: true,
              created_at: new Date().toISOString()
            });
        }
      }

      alert('✅ Candidate has been restored from the waitlist. A notification has been sent to the candidate.');
      fetchCompleteProfile();
    } catch (err) {
      console.error('Error restoring candidate:', err);
      alert('An error occurred while restoring the candidate.');
    }
  }

  async function handleHRRescheduleInterview() {
    const { interviewId, panel, link, date, startTime, endTime, reason } = hrRescheduleData;
    
    if (!date || !startTime || !endTime || !link) {
      alert("Please specify the date, start time, end time, and meeting link.");
      return;
    }

    if (startTime >= endTime) {
      alert("End time must be after start time.");
      return;
    }

    try {
      const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
      const endDateTime = new Date(`${date}T${endTime}:00+05:30`);
      const timeSlotDisplay = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;

      const updateData = {
        scheduled_date_time: startDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString(),
        time_slot: timeSlotDisplay,
        meeting_link: link,
        status: 'Scheduled',
        result: 'Pending'
      };

      if (panel && panel.trim() !== '') {
        updateData.panelists = [panel.trim()];
      }

      console.log("📤 Updating interview with data:", updateData);

      const { data: interviewResult, error: updateError } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewId)
        .select();

      if (updateError) {
        console.error("❌ Error updating interview:", updateError);
        alert(`Failed to update interview: ${updateError.message}`);
        return;
      }

      console.log("✅ Interview updated successfully:", interviewResult);

      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'interview_rescheduled_by_hr',
        'interview',
        interviewId,
        {
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          new_date: date,
          new_startTime: startTime,
          new_endTime: endTime,
          panel: panel,
          reason: reason || 'Rescheduled by HR'
        }
      );
      // ===== END LOG ACTIVITY =====

      const rescheduleMessage = `Dear ${candidate.name || 'Candidate'},

Your interview has been rescheduled by the HR team.

New Interview Details:
📅 Date: ${formatDateDisplay(date)}
⏰ Time: ${timeSlotDisplay} (IST)
🔗 Meeting Link: ${link}

Please make yourself available at the new time. If you have any concerns, please reach out to the HR team.

Best regards,
HR Team
Jarurat Care Foundation`;

      const { error: questionError } = await supabase
        .from('candidate_questions')
        .insert({
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          candidate_email: candidate.email,
          question: `📅 Interview Rescheduled`,
          status: 'Replied',
          is_public: false,
          is_system_message: true,
          created_at: new Date().toISOString()
        });

      if (!questionError) {
        const { data: questionData } = await supabase
          .from('candidate_questions')
          .select('id')
          .eq('candidate_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (questionData) {
          await supabase
            .from('question_replies')
            .insert({
              question_id: questionData.id,
              reply: rescheduleMessage,
              replied_by: 'Jarurat Care Foundation',
              is_hr_reply: false,
              is_system_reply: true,
              created_at: new Date().toISOString()
            });
        }
      }

      const { error: deleteError } = await supabase
        .from('interview_reschedule_requests')
        .delete()
        .eq('interview_id', interviewId)
        .eq('status', 'Pending');

      if (deleteError) {
        console.error("❌ Error deleting reschedule request:", deleteError);
      } else {
        console.log("✅ Reschedule request deleted successfully");
      }

      alert(`✅ The interview has been successfully rescheduled for ${timeSlotDisplay}. The candidate has been notified via their portal.`);
      
      setShowHRRescheduleModal(false);
      setHrRescheduleData({
        interviewId: null,
        panel: '',
        link: '',
        date: '',
        startTime: '',
        endTime: '',
        reason: ''
      });
      
      await fetchCompleteProfile();
      
    } catch (err) {
      console.error("❌ Unexpected error during reschedule:", err);
      alert(`An unexpected error occurred: ${err.message}`);
    }
  }

  async function handleSendAssignment() {
    const mappedTemplateLink = DOMAIN_ASSIGNMENT_LINKS[candidate.domain];
    if (!mappedTemplateLink) {
      alert(`No task URL template payload mapped for domain: ${candidate.domain}`);
      return;
    }

    const deadlineTime = new Date();
    deadlineTime.setDate(deadlineTime.getDate() + 2);

    const { data, error } = await supabase.from('assignments').upsert({
      candidate_id: id,
      assignment_title: `${candidate.domain} Core Assignment Challenge`,
      task_link_template: mappedTemplateLink,
      deadline: deadlineTime.toISOString(),
      assignment_status: 'Assigned',
      sent_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System Admin',
      sent_date: new Date().toISOString()
    }, { onConflict: 'candidate_id' });

    if (error) {
      alert(`Failed to send assignment: ${error.message}`);
      return;
    }

    await supabase.from('candidates').update({ current_stage: 'Assignment' }).eq('id', id);
    
    // ===== LOG ACTIVITY =====
    await logTeamActivity(
      'assignment_sent',
      'assignment',
      data?.[0]?.id || id,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        domain: candidate.domain,
        deadline: deadlineTime.toISOString()
      }
    );
    // ===== END LOG ACTIVITY =====
    
    alert('Assignment link dispatched.');
    fetchCompleteProfile();
  }

  async function handleSaveEvaluation() {
    if (assignment?.assignment_status === 'Evaluated') {
      alert('Assignment has already been evaluated.');
      return;
    }
    
    const cScore = parseFloat(scores.content) || 0;
    const fScore = parseFloat(scores.formatting) || 0;
    const aiScore = parseFloat(scores.ai) || 0;
    
    const calculatedTotal = cScore + fScore - aiScore;

    const currentUser = localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'Unknown';

    const { error: assignError } = await supabase
      .from('assignments')
      .update({
        content_score: cScore,
        formatting_score: fScore,
        ai_score: aiScore,
        assignment_status: 'Evaluated',
        evaluated_by: currentUser,
        evaluation_date: new Date().toISOString()
      })
      .eq('candidate_id', id);

    if (assignError) {
      alert(`Failed to save matrix grades: ${assignError.message}`);
      return;
    }

    // ===== LOG ACTIVITY =====
    await logTeamActivity(
      'assignment_evaluated',
      'assignment',
      assignment?.id || id,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        total_score: calculatedTotal,
        content_score: cScore,
        formatting_score: fScore,
        ai_score: aiScore
      }
    );
    // ===== END LOG ACTIVITY =====

    if (calculatedTotal < 6) {
      await supabase.from('candidates').update({ assignment_score: Math.round(calculatedTotal) }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (< 6).\nCandidate kept in 'Assignment' stage for custom manual selection triage override.`);
    } else {
      await supabase.from('candidates').update({ 
        current_stage: 'Interview',
        r1_status: 'Pending',
        assignment_score: Math.round(calculatedTotal)
      }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (>= 6).\nPipeline advanced to 'Interview' state, and Round 1 has been provisioned.`);
    }
    fetchCompleteProfile();
  }

  async function handleScheduleInterview(roundName) {
    if (!scheduleInput.date || !scheduleInput.startTime || !scheduleInput.endTime || !scheduleInput.link) {
      alert("Please specify the date, start time, end time, and meeting link.");
      return;
    }

    if (scheduleInput.startTime >= scheduleInput.endTime) {
      alert("End time must be after start time.");
      return;
    }

    const startDateTime = new Date(`${scheduleInput.date}T${scheduleInput.startTime}:00+05:30`);
    const endDateTime = new Date(`${scheduleInput.date}T${scheduleInput.endTime}:00+05:30`);
    const timeSlotDisplay = `${formatTimeForDisplay(scheduleInput.startTime)} - ${formatTimeForDisplay(scheduleInput.endTime)}`;

    const interviewData = {
      candidate_id: parseInt(id), 
      round: roundName,
      scheduled_date_time: startDateTime.toISOString(),
      scheduled_end_time: endDateTime.toISOString(),
      time_slot: timeSlotDisplay,
      panelists: scheduleInput.panel ? [scheduleInput.panel] : [], 
      meeting_link: scheduleInput.link,
      result: 'Pending',
      status: 'Scheduled',
      scheduled_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System',
      scheduled_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('interviews')
      .insert(interviewData)
      .select(); 

    if (error) {
      alert(`❌ Database Error: ${error.message}\n\nDetails: ${JSON.stringify(error.details)}`);
      console.error("Full Supabase Error:", error);
      return;
    }

    const statusField = roundName === 'R1' ? { r1_status: 'Scheduled' } : { r2_status: 'Scheduled' };
    await supabase.from('candidates').update(statusField).eq('id', id);
    
    // ===== LOG ACTIVITY =====
    await logTeamActivity(
      'interview_scheduled',
      'interview',
      data?.[0]?.id || id,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        round: roundName,
        date: scheduleInput.date,
        startTime: scheduleInput.startTime,
        endTime: scheduleInput.endTime,
        panel: scheduleInput.panel
      }
    );
    // ===== END LOG ACTIVITY =====
    
    alert(`Interview ${roundName} scheduled successfully for ${timeSlotDisplay}!`);
    setScheduleInput({ panel: '', link: '', date: '', startTime: '', endTime: '' });
    fetchCompleteProfile();
  }

  async function handleScheduleProbationMeeting() {
  if (!probationInput.date || !probationInput.startTime || !probationInput.endTime || !probationInput.link) {
    alert("Please specify the date, start time, end time, and meeting link for the probation meeting.");
    return;
  }

  if (probationInput.startTime >= probationInput.endTime) {
    alert("End time must be after start time.");
    return;
  }

  const dateStr = probationInput.date;
  const startTimeStr = probationInput.startTime;
  const endTimeStr = probationInput.endTime;
  
  const startDateTime = new Date(`${dateStr}T${startTimeStr}:00+05:30`);
  const endDateTime = new Date(`${dateStr}T${endTimeStr}:00+05:30`);
  
  const startISO = startDateTime.toISOString();
  const endISO = endDateTime.toISOString();

  const { error } = await supabase
    .from('onboarding')
    .update({
      probation_meeting_date: startISO,
      probation_meeting_end: endISO,
      probation_meeting_link: probationInput.link,
      probation_meeting_scheduled: true
    })
    .eq('candidate_id', id);

  if (error) {
    alert(`❌ Failed to schedule probation meeting: ${error.message}`);
    console.error("Supabase Error:", error);
    return;
  }

  const timeSlotDisplay = `${formatTimeForDisplay(startTimeStr)} - ${formatTimeForDisplay(endTimeStr)}`;
  const probationMessage = `Dear ${candidate.name || 'Candidate'},

Your probation meeting has been scheduled.

Meeting Details:
📅 Date: ${formatDateDisplay(dateStr)}
⏰ Time: ${timeSlotDisplay} (IST)
🔗 Meeting Link: ${probationInput.link}

Please join the meeting at the scheduled time.

Best regards,
HR Team
Jarurat Care Foundation`;

  const { error: questionError } = await supabase
    .from('candidate_questions')
    .insert({
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      candidate_email: candidate.email,
      question: `📅 Probation Meeting Scheduled`,
      status: 'Replied',
      is_public: false,
      is_system_message: true,
      created_at: new Date().toISOString()
    });

  if (!questionError) {
    const { data: questionData } = await supabase
      .from('candidate_questions')
      .select('id')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (questionData) {
      await supabase
        .from('question_replies')
        .insert({
          question_id: questionData.id,
          reply: probationMessage,
          replied_by: 'Jarurat Care Foundation',
          is_hr_reply: false,
          is_system_reply: true,
          created_at: new Date().toISOString()
        });
    }
  }

  // ===== LOG ACTIVITY - PROBATION MEETING SCHEDULED =====
  await logTeamActivity(
    'probation_meeting_scheduled',
    'onboarding',
    id,
    {
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr
    }
  );
  // ===== END LOG ACTIVITY =====

  alert(`✅ Probation meeting scheduled successfully for ${timeSlotDisplay} on ${formatDateDisplay(dateStr)}!`);
  setProbationInput({ date: '', startTime: '', endTime: '', link: '' });
  fetchCompleteProfile();
}

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[month-1]} ${year}`;
    }
    return dateStr;
  }

  function formatTimeForDisplay(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }

  function extractTimeFromISO(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      let hours = istTime.getHours();
      const minutes = istTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
      console.error('Error extracting time:', e);
      return '';
    }
  }

  const getTimeSlotDisplay = (interview) => {
    if (interview.time_slot) return interview.time_slot;
    if (interview.scheduled_date_time && interview.scheduled_end_time) {
      const start = new Date(interview.scheduled_date_time);
      const end = new Date(interview.scheduled_end_time);
      const startStr = start.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      });
      const endStr = end.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      });
      return `${startStr} - ${endStr}`;
    }
    return null;
  };

  const getFormattedDateIST = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  // ✅ Helper to check if a link is a real URL (not a placeholder)
  function isValidUrl(string) {
    if (!string) return false;
    // Check if it's a placeholder like "File submission (X files uploaded)"
    if (string.startsWith('File submission')) return false;
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function handleGradeInterview(interviewId, round, decision) {
    const metrics = roundGrades[interviewId] || {};
    
    const s1 = Number(parseFloat(metrics.score1)) || 0; 
    const s2 = Number(parseFloat(metrics.score2)) || 0; 
    const s3 = Number(parseFloat(metrics.score3)) || 0; 
    const totalScore = Number(s1 + s2 + s3);

    const currentUser = localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'Unknown';
    const panelistName = localStorage.getItem('panelistName') || 
                     localStorage.getItem('userName') || 
                     currentUser || 
                     'Panelist';
    let sqlUpdateParams = {
      p_interview_id: interviewId,
      p_result: decision,
      p_status: 'Evaluated',
      p_total_score: totalScore,
      p_round: round,
      p_s1: s1,
      p_s2: s2,
      p_s3: s3
    };

    console.log("📤 SAVING GRADES TO DB VIA DIRECT SQL:", sqlUpdateParams);

    const { data, error } = await supabase.rpc('execute_interview_grade_update', sqlUpdateParams);

    if (error) {
      console.error("❌ DB ERROR SAVING SCORES:", error);
      alert(`Failed to save scores: ${error.message}`);
      return;
    }

    // ===== LOG ACTIVITY =====
    const actionType = decision === 'Selected' ? 'candidate_selected' : 
                      decision === 'Rejected' ? 'candidate_rejected' : 
                      'candidate_hold';
    
    await logTeamActivity(
      actionType,
      'interview',
      interviewId,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        round: round,
        total_score: totalScore,
        panelist: panelistName,
        s1: s1,
        s2: s2,
        s3: s3
      }
    );
    // ===== END LOG ACTIVITY =====

    const r1Interview = interviews.find(iv => iv.round === 'R1');
    const r2Interview = interviews.find(iv => iv.round === 'R2');

    const r1Total = Number(r1Interview?.total_score) || (round === 'R1' ? totalScore : 0);
    const r2Total = Number(r2Interview?.total_score) || (round === 'R2' ? totalScore : 0);

    const finalR1 = Number(r1Total);
    const finalR2 = Number(r2Total);
    const combinedTotal = finalR1 + finalR2;

    await supabase.from('candidates').update({
      r1_score: finalR1,
      r2_score: finalR2,
      final_interview_score: combinedTotal
    }).eq('id', id);

    if (decision === 'Rejected') {
      await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
      alert(`Candidate rejected at ${round}.`);
    } 
    else if (decision === 'On Hold') {
      // Update interview status
      await supabase.from('interviews').update({ 
        status: 'On Hold', 
        result: 'On Hold' 
      }).eq('id', interviewId);
      
      // ===== FIX: Update candidate stage to 'On Hold' =====
      await supabase.from('candidates').update({ 
        current_stage: 'On Hold' 
      }).eq('id', id);
      // ===== END FIX =====
      
      alert(`Interview ${round} placed on hold. The candidate will NOT be notified. You can resume this later.`);
    } 
    else if (decision === 'Selected') {
      if (round === 'R1') {
        await supabase.from('candidates').update({ r1_status: 'Passed' }).eq('id', id);
        
        if (candidate.source?.toLowerCase() === 'referral') {
          await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
          await supabase.from('onboarding').upsert({ 
            candidate_id: id, 
            onboarding_status: 'Pending', 
            probation_status: 'Pending',
            probation_meeting_scheduled: false
          }, { onConflict: 'candidate_id' });
          alert("Round 1 Cleared! (Referral) Proceeding directly to Selected.");
        } else {
          alert("Round 1 Cleared! You may now schedule Round 2.");
        }
      } else if (round === 'R2') {
        await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
        await supabase.from('onboarding').upsert({ 
          candidate_id: id, 
          onboarding_status: 'Pending', 
          probation_status: 'Pending',
          probation_meeting_scheduled: false
        }, { onConflict: 'candidate_id' });
        alert("Final Round Cleared! Candidate moved to Selected. You can now schedule the probation meeting.");
      }
    }
    fetchCompleteProfile();
  }

  async function handleResumeProcess(interviewId, round) {
    // Update interview status
    await supabase.from('interviews').update({ 
      status: 'Pending', 
      result: 'Pending' 
    }).eq('id', interviewId);
    
    // ===== FIX: Restore candidate stage to 'Interview' =====
    await supabase.from('candidates').update({ 
      current_stage: 'Interview' 
    }).eq('id', id);
    // ===== END FIX =====
    
    alert("Process resumed. The candidate can now see the interview, and you can evaluate them.");
    fetchCompleteProfile();
  }

  async function handleHRRescheduleInterviewOld(interviewId) {
    console.log("🔄 Rescheduling interview with ID:", interviewId);
    console.log("📝 Schedule Input:", scheduleInput);
    
    if (!scheduleInput.date || !scheduleInput.startTime || !scheduleInput.endTime || !scheduleInput.link) {
      alert("Please specify the date, start time, end time, and meeting link.");
      return;
    }

    if (scheduleInput.startTime >= scheduleInput.endTime) {
      alert("End time must be after start time.");
      return;
    }

    try {
      const startDateTime = new Date(`${scheduleInput.date}T${scheduleInput.startTime}:00+05:30`);
      const endDateTime = new Date(`${scheduleInput.date}T${scheduleInput.endTime}:00+05:30`);
      const timeSlotDisplay = `${formatTimeForDisplay(scheduleInput.startTime)} - ${formatTimeForDisplay(scheduleInput.endTime)}`;

      const updateData = {
        scheduled_date_time: startDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString(),
        time_slot: timeSlotDisplay,
        meeting_link: scheduleInput.link,
        status: 'Scheduled', 
        result: 'Pending'
      };

      if (scheduleInput.panel && scheduleInput.panel.trim() !== '') {
        updateData.panelists = [scheduleInput.panel.trim()];
      }

      console.log("📤 Updating interview with data:", updateData);

      const { data: interviewResult, error: updateError } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewId)
        .select();

      if (updateError) {
        console.error("❌ Error updating interview:", updateError);
        alert(`Failed to update interview: ${updateError.message}`);
        return;
      }

      console.log("✅ Interview updated successfully:", interviewResult);

      // ===== LOG ACTIVITY =====
      await logTeamActivity(
        'interview_rescheduled_by_hr',
        'interview',
        interviewId,
        {
          candidate_id: id,
          candidate_name: candidate.name || candidate.full_name,
          new_date: scheduleInput.date,
          new_startTime: scheduleInput.startTime,
          new_endTime: scheduleInput.endTime,
          panel: scheduleInput.panel,
          reason: 'Rescheduled by HR via old flow'
        }
      );
      // ===== END LOG ACTIVITY =====

      const { error: deleteError } = await supabase
        .from('interview_reschedule_requests')
        .delete()
        .eq('interview_id', interviewId)
        .eq('status', 'Pending');

      if (deleteError) {
        console.error("❌ Error deleting reschedule request:", deleteError);
      } else {
        console.log("✅ Reschedule request deleted successfully");
      }

      alert(`The interview has been successfully rescheduled for ${timeSlotDisplay}. The candidate has been notified via their portal.`);
      setScheduleInput({ panel: '', link: '', date: '', startTime: '', endTime: '' });
      
      await fetchCompleteProfile();
      
    } catch (err) {
      console.error("❌ Unexpected error during reschedule:", err);
      alert(`An unexpected error occurred: ${err.message}`);
    }
  }

  if (!candidate) return <h3 style={{ padding: '30px', color: '#334155', fontFamily: 'sans-serif' }}>Loading Applicant Portfolio...</h3>;
  
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
    if (assignment.submitted_at && assignment.deadline) {
      const deadline = new Date(assignment.deadline).getTime();
      const submittedAt = new Date(assignment.submitted_at).getTime();
      return submittedAt > deadline;
    }
    return false;
  };

  const getLateDuration = () => {
    if (!assignment) return null;
    if (assignment.late_duration) return assignment.late_duration;
    if (assignment.submitted_at && assignment.deadline) {
      const deadline = new Date(assignment.deadline).getTime();
      const submittedAt = new Date(assignment.submitted_at).getTime();
      if (submittedAt <= deadline) return null;
      const lateMs = submittedAt - deadline;
      const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
      const lateMinutes = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${lateHours}h ${lateMinutes}m`;
    }
    return null;
  };

  const showProbationMeeting = candidate.current_stage === 'Selected' && 
    onboarding && 
    onboarding.probation_meeting_scheduled !== true;

  const showProbationManagement = (candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation') && 
    onboarding && 
    onboarding.probation_meeting_scheduled === true;

  const isOnWaitlist = candidate.current_stage === 'Waitlist';

  const getProbationMeetingDetails = () => {
    if (!onboarding) return null;
    return {
      date: onboarding.probation_meeting_date,
      end: onboarding.probation_meeting_end,
      link: onboarding.probation_meeting_link
    };
  };

  const probationMeetingDetails = getProbationMeetingDetails();

  // ✅ Check if there's a valid link submitted (not a placeholder)
  const hasValidLink = assignment?.submitted_link && isValidUrl(assignment.submitted_link);
  const hasFiles = uploadedFiles.length > 0;

  return (
    <div style={{ padding: '30px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>← Back to Dashboard</button>
        <button onClick={fetchCompleteProfile} style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}>🔄 Refresh Data</button>
      </div>
      
      {isOnWaitlist && (
        <div style={{ 
          background: '#f5f3ff', 
          border: '2px solid #8b5cf6', 
          padding: '15px 24px', 
          borderRadius: '12px', 
          marginBottom: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontWeight: '700', color: '#6d28d9', fontSize: '14px' }}>⏳ CANDIDATE ON WAITLIST</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5b21b6' }}>
              {candidate.waitlisted_at && `Waitlisted: ${new Date(candidate.waitlisted_at).toLocaleDateString()}`}
            </p>
            {candidate.waitlist_notes && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7c3aed', fontStyle: 'italic' }}>
                Notes: {candidate.waitlist_notes}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleRestoreFromWaitlist}
              style={{ 
                backgroundColor: '#8b5cf6', 
                color: '#fff', 
                border: 'none', 
                padding: '8px 20px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 Restore Candidate
            </button>
            <span style={{ fontSize: '12px', color: '#7c3aed', alignSelf: 'center' }}>
              Will resume from: <strong>{candidate.waitlist_restore_stage || 'Applied'}</strong>
            </span>
          </div>
        </div>
      )}

      {candidate.current_stage === 'Assignment' && assignment?.assignment_status === 'Evaluated' && calculatedAssignmentScore < 6 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px 24px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: '700', color: '#b45309', fontSize: '14px' }}>⚠️ HR MANUAL INTERVENTION REQUIRED</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#78350f' }}>Candidate score fell below target threshold. Manually select or reject for pipeline continuation.</p>
          </div>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Enter reason for manual override"
            style={{ width: '100%', minHeight: '80px', marginTop: '10px', marginBottom: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={async () => {
              if (!overrideReason.trim()) { alert('Please enter override reason'); return; }
              
              // ===== LOG ACTIVITY =====
              await logTeamActivity(
                'candidate_force_scheduled',
                'candidate',
                id,
                {
                  candidate_id: id,
                  candidate_name: candidate.name || candidate.full_name,
                  reason: overrideReason.trim(),
                  assignment_score: calculatedAssignmentScore,
                  action: 'Force Schedule R1'
                }
              );
              // ===== END LOG ACTIVITY =====
              
              await supabase.from('assignments').update({ hr_scorecard_approved: true, hr_scorecard_remarks: overrideReason }).eq('candidate_id', id);
              await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id); 
              alert('Candidate manually selected. HR can now schedule R1.');             
              fetchCompleteProfile();
            }} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Force Schedule R1</button>
            
            <button onClick={async () => {
              // ===== LOG ACTIVITY =====
              await logTeamActivity(
                'candidate_rejected_low_score',
                'candidate',
                id,
                {
                  candidate_id: id,
                  candidate_name: candidate.name || candidate.full_name,
                  assignment_score: calculatedAssignmentScore,
                  reason: overrideReason.trim() || 'Score below threshold'
                }
              );
              // ===== END LOG ACTIVITY =====
              
              await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
              alert('Candidate rejected.');
              fetchCompleteProfile();
            }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Reject Candidate</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        {/* LEFT COLUMN */}
        <div>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#111827', fontSize: '22px' }}><strong>Candidate Profile</strong></h2>
            
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
              <p style={{ margin: '4px 0', color:'#1a202c'}}><strong>Name:</strong> {candidate.name || candidate.full_name}</p>
              <p style={{ margin: '4px 0', color:'#1a202c'}}><strong>Email:</strong> {candidate.email}</p>
              <p style={{ margin: '4px 0', color:'#1a202c'}}><strong>Phone:</strong> {candidate.phone}</p>
              <p style={{ margin: '4px 0', color:'#1a202c'}}><strong>Domain:</strong> {candidate.domain}</p>
              <p style={{ margin: '4px 0', color:'#1a202c'}}><strong>Source:</strong> {candidate.source}</p>
              <p style={{ margin: '4px 0', color:'#1a202c'}}>
                <strong>Stage: </strong> 
                <span style={{ 
                  color: isOnWaitlist ? '#8b5cf6' : '#057b6e', 
                  fontWeight: '700',
                  backgroundColor: isOnWaitlist ? '#f5f3ff' : 'transparent',
                  padding: isOnWaitlist ? '2px 10px' : '0',
                  borderRadius: '4px'
                }}>
                  {candidate.current_stage}
                </span>
              </p>
            </div>

            {/* ===== EDUCATION SECTION ===== */}
            {(candidate.college_name || candidate.degree_course || candidate.graduation_year) && (
              <>
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>🎓 Education</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                  {candidate.college_name && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>College:</strong> {candidate.college_name}
                    </p>
                  )}
                  {candidate.degree_course && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>Degree:</strong> {candidate.degree_course}
                    </p>
                  )}
                  {candidate.graduation_year && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>Graduation Year:</strong> {candidate.graduation_year}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ===== ADDRESS & LINKS SECTION ===== */}
            {(candidate.address || candidate.linkedin_profile || candidate.portfolio_link) && (
              <>
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>📍 Address & Links</h4>
                <div>
                  {candidate.address && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>Address:</strong> {candidate.address}
                    </p>
                  )}
                  {candidate.linkedin_profile && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>LinkedIn:</strong>{' '}
                      <a 
                        href={candidate.linkedin_profile} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {candidate.linkedin_profile}
                      </a>
                    </p>
                  )}
                  {candidate.portfolio_link && (
                    <p style={{ margin: '4px 0', color:'#1a202c'}}>
                      <strong>Portfolio:</strong>{' '}
                      <a 
                        href={candidate.portfolio_link} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {candidate.portfolio_link}
                      </a>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Resume Download */}
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <p style={{ margin: '8px 0', color:'#1a202c'}}>
              <strong>Resume:</strong> 
              {candidate.resume_link ? (
                <button
                  id="downloadResumeBtn"
                  onClick={handleDownloadResume}
                  disabled={downloadLoading}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 14px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: downloadLoading ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: downloadLoading ? 0.7 : 1
                  }}
                >
                  {downloadLoading ? '⏳ Downloading...' : '📥 Download Resume'}
                </button>
              ) : (
                <span style={{ marginLeft: '8px', color: '#94a3b8', fontStyle: 'italic' }}>Not Uploaded</span>
              )}
            </p>

            {isOnWaitlist && candidate.waitlisted_at && (
              <p style={{ margin: '8px 0', fontSize: '13px', color: '#7c3aed' }}>
                <strong>Waitlisted:</strong> {new Date(candidate.waitlisted_at).toLocaleString()}
              </p>
            )}
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '18px' }}>Internal Notes Context</h3>
            <textarea value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Type private review notes here..." style={{ width: '100%', height: '110px', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }} />
            <button onClick={async () => { await supabase.from('candidates').update({ hr_notes: hrNotes }).eq('id', id); alert('Notes captured!'); }} style={{ marginTop: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Save Internal Notes</button>
          </div>

          <div style={{ 
            background: '#fff', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
            border: '1px solid #e2e8f0',
            marginTop: '0px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💬 Questions from Candidate</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>
                {candidateQuestions.filter(q => q.status === 'Pending').length} pending
              </span>
            </h3>
            
            {candidateQuestions.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No questions from this candidate yet.
              </p>
            ) : (
              <div>
                {candidateQuestions.map(q => {
                  const isSystemMessage = q.is_system_message === true;
                  return (
                    <div key={q.id} style={{
                      padding: '12px',
                      background: isSystemMessage ? '#f5f3ff' : (q.status === 'Replied' ? '#f8fafc' : '#fef3c7'),
                      borderRadius: '6px',
                      marginBottom: '10px',
                      border: isSystemMessage ? '2px solid #8b5cf6' : (q.status === 'Replied' ? '1px solid #e2e8f0' : '1px solid #fef3c7')
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          {isSystemMessage ? (
                            <>
                              <p style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '14px', 
                                fontWeight: '600',
                                color: '#6d28d9'
                              }}>
                                {q.question}
                              </p>
                              {q.question_replies && q.question_replies.length > 0 && (
                                <div style={{
                                  padding: '12px 16px',
                                  background: '#fff',
                                  borderRadius: '6px',
                                  border: '1px solid #e9d5ff'
                                }}>
                                  {q.question_replies.map(r => (
                                    <div key={r.id} style={{ 
                                      fontSize: '14px', 
                                      color: '#1e293b', 
                                      lineHeight: '1.8',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {r.reply}
                                      <div style={{ 
                                        fontSize: '11px', 
                                        color: '#94a3b8', 
                                        marginTop: '8px',
                                        borderTop: '1px solid #f1f5f9',
                                        paddingTop: '8px'
                                      }}>
                                        {new Date(r.created_at).toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <p style={{ margin: '0', fontSize: '14px', color: '#1e293b' }}>
                                <strong>Q:</strong> {q.question}
                              </p>
                              {q.question_replies && q.question_replies.length > 0 && (
                                <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #2563eb' }}>
                                  {q.question_replies.map(r => (
                                    <div key={r.id} style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                                      <strong>👤 HR Reply:</strong> {r.reply}
                                      <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>
                                        {new Date(r.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                                Asked {new Date(q.created_at).toLocaleString()}
                              </p>
                            </>
                          )}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          background: isSystemMessage ? '#ede9fe' : (q.status === 'Replied' ? '#dcfce7' : '#fef3c7'),
                          color: isSystemMessage ? '#6d28d9' : (q.status === 'Replied' ? '#166534' : '#92400e'),
                          whiteSpace: 'nowrap',
                          marginLeft: '8px'
                        }}>
                          {isSystemMessage ? '📬 Notification' : (q.status === 'Replied' ? '✅ Replied' : '⏳ Pending')}
                        </span>
                      </div>
                      
                      {!isSystemMessage && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                          {q.status !== 'Replied' ? (
                            <button
                              onClick={() => { setReplyingTo(q.id); setReplyText(''); }}
                              style={{
                                padding: '4px 14px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              ✏️ Reply
                            </button>
                          ) : (
                            !q.is_public && (
                              <button
                                onClick={() => {
                                  setFaqForm({ 
                                    question: q.question, 
                                    answer: '', 
                                    category: 'General',
                                    questionId: q.id 
                                  });
                                  setIsAddingFAQ(true);
                                  setSimilarFAQ(null);
                                }}
                                style={{
                                  padding: '4px 14px',
                                  background: '#059669',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                📖 Add to FAQ
                              </button>
                            )
                          )}
                        </div>
                      )}
                      
                      {!isSystemMessage && replyingTo === q.id && (
                        <div style={{ marginTop: '10px' }}>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply to the candidate..."
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              boxSizing: 'border-box'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => handleReplyToQuestion(q.id)}
                              style={{
                                padding: '6px 16px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              Send Reply
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              style={{
                                padding: '6px 16px',
                                background: '#e2e8f0',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Workflow Workspace (unchanged) */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '22px' }}>Workflow Workspace</h2>
          
          {candidate.current_stage !== 'Withdrawn' && 
           candidate.current_stage !== 'Rejected' && 
           candidate.current_stage !== 'Onboarding Done' && 
           candidate.current_stage !== 'Internship Discontinued' && 
           candidate.current_stage !== 'Terminated' && 
           candidate.current_stage !== 'Waitlist' && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowWithdrawModal(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  minWidth: '140px'
                }}
              >
                🚫 Withdraw
              </button>
              <button
                onClick={() => setShowWaitlistModal(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  minWidth: '140px'
                }}
              >
                ⏳ Waitlist
              </button>
            </div>
          )}
          
          {candidate.current_stage === 'On Hold' && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={async () => {
                  const onHoldInterview = interviews.find(iv => iv.status === 'On Hold' && iv.result === 'On Hold');
                  
                  if (onHoldInterview) {
                    await supabase.from('interviews').update({ 
                      status: 'Pending', 
                      result: 'Pending' 
                    }).eq('id', onHoldInterview.id);
                    
                    await supabase.from('candidates').update({ 
                      current_stage: 'Interview' 
                    }).eq('id', id);

                    await logTeamActivity(
                      'candidate_restored_from_on_hold',
                      'candidate',
                      id,
                      {
                        candidate_id: id,
                        candidate_name: candidate.name || candidate.full_name,
                        interview_id: onHoldInterview.id,
                        round: onHoldInterview.round
                      }
                    );
                    
                    alert('✅ Candidate restored from On Hold to Interview stage.');
                    fetchCompleteProfile();
                  } else {
                    alert('No on-hold interview found for this candidate.');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                🔄 Restore from On Hold to Interview
              </button>
              <p style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', textAlign: 'center' }}>
                Click to move this candidate back to Interview stage
              </p>
            </div>
          )}
          
          {isOnWaitlist && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#8b5cf6', textAlign: 'center', marginTop: '4px' }}>
                ⏳ Candidate is currently on the waitlist. Use "Restore" button above to reopen.
              </p>
            </div>
          )}
          
          {rescheduleRequest && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ color: '#92400e', margin: '0 0 5px 0', fontSize: '14px' }}>📅 Reschedule Requested</h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#92400e' }}>
                <strong>Candidate Availability & Reason:</strong> <br />
                {rescheduleRequest.reason}
              </p>
              
              <div style={{ borderTop: '1px solid #fde68a', paddingTop: '12px', marginTop: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#78350f', marginBottom: '8px' }}>Reschedule this interview:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Interviewer Panel Name" 
                    value={scheduleInput.panel} 
                    onChange={(e) => setScheduleInput({...scheduleInput, panel: e.target.value})} 
                    style={{ 
                      padding: '8px', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '4px', 
                      width: '100%', 
                      backgroundColor: '#fae69e',
                      color: '#070906',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="date" 
                      value={scheduleInput.date} 
                      onChange={(e) => setScheduleInput({...scheduleInput, date: e.target.value})} 
                      style={{ 
                        padding: '6px', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        flex: 1, 
                        backgroundColor: '#fae69e',
                        color: '#070906',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                    <input 
                      type="time" 
                      value={scheduleInput.startTime} 
                      onChange={(e) => setScheduleInput({...scheduleInput, startTime: e.target.value})} 
                      style={{ 
                        padding: '6px', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        flex: 0.7, 
                        backgroundColor: '#fae69e',
                        color: '#070906',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                    <span style={{ alignSelf: 'center', color: '#64748b', fontWeight: 'bold' }}>to</span>
                    <input 
                      type="time" 
                      value={scheduleInput.endTime} 
                      onChange={(e) => setScheduleInput({...scheduleInput, endTime: e.target.value})} 
                      style={{ 
                        padding: '6px', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '4px', 
                        flex: 0.7, 
                        backgroundColor: '#fae69e',
                        color: '#070906',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="New Meeting Link" 
                    value={scheduleInput.link} 
                    onChange={(e) => setScheduleInput({...scheduleInput, link: e.target.value})} 
                    style={{ 
                      padding: '6px', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '4px', 
                      width: '100%', 
                      backgroundColor: '#fae69e',
                      color: '#070906',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <button 
                    onClick={() => handleHRRescheduleInterviewOld(rescheduleRequest.interview_id)}
                    style={{ backgroundColor: '#b45309', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {candidate.current_stage === 'Applied' && (
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#d97706', fontSize: '15px' }}>Stage Status: Pending Task Assignment Pipeline</h4>
              <button onClick={handleSendAssignment} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Dispatch System Assignment</button>
            </div>
          )}

          {(candidate.current_stage === 'Assignment' || (assignment && (candidate.current_stage === 'Interview' || candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation' || isOnboardingLocked))) && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>Assignment Evaluation Board</h4>
              {assignment && (
                <div style={{ 
                  background: isAssignmentLate() ? '#fef2f2' : '#f8fafc', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '15px', 
                  border: isAssignmentLate() ? '2px solid #ef4444' : '1px solid #e2e8f0', 
                  fontSize: '14px' 
                }}>
                  
                  <p style={{ margin: '4px 0' }}><strong>Deadline Boundary:</strong> {new Date(assignment.deadline).toLocaleString()}</p>
                  
                  {assignment.submitted_at && (
                    <p style={{ 
                      margin: '4px 0', 
                      color: isAssignmentLate() ? '#dc2626' : '#059669', 
                      fontWeight: isAssignmentLate() ? '700' : '500' 
                    }}>
                      <strong>Submitted:</strong> {new Date(assignment.submitted_at).toLocaleString()}
                      {isAssignmentLate() && ` (LATE by ${getLateDuration()})`}
                    </p>
                  )}
                  
                  {candidate.assignment_score !== undefined && candidate.assignment_score !== null && (
                    <p style={{ margin: '4px 0', color: '#059669', fontWeight: '600' }}>
                      <strong>Calculated Grade Score:</strong> {candidate.assignment_score} Marks
                    </p>
                  )}

                  {(hasValidLink || hasFiles) && (
                    <button
                      onClick={() => setShowFilesModal(true)}
                      style={{
                        marginTop: '10px',
                        padding: '6px 16px',
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📁 View Submission Details
                      {hasFiles && ` (${uploadedFiles.length} files)`}
                    </button>
                  )}
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Content /10</label><input type="number" min="0" max="10" value={scores.content} disabled={assignmentLocked} onChange={(e) => setScores({...scores, content: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Formatting /10</label><input type="number" min="0" max="10" value={scores.formatting} disabled={assignmentLocked} onChange={(e) => setScores({...scores, formatting: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>AI Match /10</label><input type="number" min="0" max="10" value={scores.ai} disabled={assignmentLocked} onChange={(e) => setScores({...scores, ai: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              </div>
              <button onClick={handleSaveEvaluation} disabled={assignmentLocked} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{assignmentLocked ? 'Evaluation Locked' : 'Commit Matrix Grades'}</button>
            </div>
          )}

          {/* Interview Section - unchanged */}
          {candidate.current_stage === 'Interview' && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
              
              {(() => {
                const hasR1 = interviews.some(iv => iv.round === 'R1');
                const hasR2 = interviews.some(iv => iv.round === 'R2');

                return (
                  <div style={{ padding: '15px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Schedule New Interview</h5>
                    <input 
                      type="text" 
                      placeholder="Interviewer Panel Name" 
                      value={scheduleInput.panel} 
                      onChange={(e) => setScheduleInput({...scheduleInput, panel: e.target.value})} 
                      style={{ width: '100%', marginBottom: '8px', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Meeting URL Link" 
                      value={scheduleInput.link} 
                      onChange={(e) => setScheduleInput({...scheduleInput, link: e.target.value})} 
                      style={{ width: '100%', marginBottom: '8px', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                    />
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <input 
                        type="date" 
                        value={scheduleInput.date} 
                        onChange={(e) => setScheduleInput({...scheduleInput, date: e.target.value})} 
                        style={{ flex: 1, padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', minWidth: '120px' }} 
                      />
                      <input 
                        type="time" 
                        value={scheduleInput.startTime} 
                        onChange={(e) => setScheduleInput({...scheduleInput, startTime: e.target.value})} 
                        style={{ flex: 0.7, padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', minWidth: '90px' }} 
                      />
                      <span style={{ alignSelf: 'center', color: '#64748b', fontWeight: 'bold' }}>to</span>
                      <input 
                        type="time" 
                        value={scheduleInput.endTime} 
                        onChange={(e) => setScheduleInput({...scheduleInput, endTime: e.target.value})} 
                        style={{ flex: 0.7, padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', minWidth: '90px' }} 
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleScheduleInterview('R1')} 
                        disabled={hasR1}
                        style={{ 
                          backgroundColor: hasR1 ? '#9ca3af' : '#7c3aed', 
                          color: '#fff', 
                          border: 'none', 
                          padding: '8px 14px', 
                          borderRadius: '4px', 
                          cursor: hasR1 ? 'not-allowed' : 'pointer', 
                          fontWeight: '500' 
                        }}
                      >
                        {hasR1 ? 'R1 Already Scheduled' : 'Schedule R1'}
                      </button>
                      
                      {!isReferral && (
                        <button 
                          onClick={() => handleScheduleInterview('R2')} 
                          disabled={hasR2}
                          style={{ 
                            backgroundColor: hasR2 ? '#9ca3af' : '#4f46e5', 
                            color: '#fff', 
                            border: 'none', 
                            padding: '8px 14px', 
                            borderRadius: '4px', 
                            cursor: hasR2 ? 'not-allowed' : 'pointer', 
                            fontWeight: '500' 
                          }}
                        >
                          {hasR2 ? 'R2 Already Scheduled' : 'Schedule R2'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {interviews.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 15px 0', color: '#7c3aed', fontSize: '16px' }}>Active Interview Loops</h4>
                  {interviews.map((iv) => {
                    const g = roundGrades[iv.id] || { score1: '', score2: '', score3: '' };
                    const total = (parseFloat(g.score1) || 0) + (parseFloat(g.score2) || 0) + (parseFloat(g.score3) || 0);

                    let badgeBg = '#e2e8f0';
                    let badgeColor = '#475569';
                    let badgeText = iv.status || 'Pending';
                    
                    if (iv.result === 'Rejected') { badgeBg = '#fef2f2'; badgeColor = '#dc2626'; badgeText = 'Rejected'; }
                    else if (iv.status === 'On Hold' || iv.result === 'On Hold') { badgeBg = '#fffbeb'; badgeColor = '#d97706'; badgeText = 'On Hold'; }
                    else if (iv.result === 'Selected') { badgeBg = '#dcfce7'; badgeColor = '#16a34a'; badgeText = 'Selected'; }
                    else if (iv.status === 'Reschedule_Requested') { badgeBg = '#fef3c7'; badgeColor = '#d97706'; badgeText = 'Reschedule Requested'; }
                    else if (iv.status === 'Scheduled') { badgeBg = '#dbeafe'; badgeColor = '#1d4ed8'; badgeText = 'Scheduled'; }

                    const timeSlot = getTimeSlotDisplay(iv);
                    const dateDisplay = getFormattedDateIST(iv.scheduled_date_time);

                    return (
                      <div key={iv.id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '12px', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <p style={{ margin: '0', fontWeight: 'bold' }}>{iv.round.replace('R', 'Round ')}</p>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: badgeBg, color: badgeColor }}>{badgeText}</span>
                        </div>
                        
                        {iv.panelists && iv.panelists.length > 0 && (
                          <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#4b5563' }}>
                            <strong>Panel:</strong> {iv.panelists.join(', ')}
                          </p>
                        )}
                        
                        <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#4b5563' }}>
                          <strong>Date:</strong> {dateDisplay}
                        </p>
                        {timeSlot && (
                          <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#4b5563' }}>
                            <strong>Time Slot:</strong> {timeSlot}
                          </p>
                        )}
                        
                        {iv.result === 'Pending' && iv.status !== 'On Hold' && !isInterviewLocked && (
                          <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Link: <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Join Meeting</a></p>
                        )}
                        
                        {iv.candidate_accepted && (
                          <div style={{ marginBottom: '12px', color: '#059669', fontSize: '15px', fontWeight: 'bold' }}>
                            ✅ Candidate has accepted this interview invitation.
                          </div>
                        )}
                        
                        {(iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested') && iv.result === 'Pending' && !isInterviewLocked && (
                          <button
                            onClick={() => {
                              let dateStr = '';
                              if (iv.scheduled_date_time) {
                                const d = new Date(iv.scheduled_date_time);
                                dateStr = d.toISOString().split('T')[0];
                              }
                              setHrRescheduleData({
                                interviewId: iv.id,
                                panel: iv.panelists ? iv.panelists[0] : '',
                                link: iv.meeting_link || '',
                                date: dateStr,
                                startTime: iv.scheduled_date_time ? new Date(iv.scheduled_date_time).toTimeString().slice(0, 5) : '',
                                endTime: iv.scheduled_end_time ? new Date(iv.scheduled_end_time).toTimeString().slice(0, 5) : '',
                                reason: ''
                              });
                              setShowHRRescheduleModal(true);
                            }}
                            style={{
                              marginTop: '10px',
                              padding: '6px 14px',
                              background: '#d97706',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '15px',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🔄 Reschedule
                          </button>
                        )}
                        
                        {iv.result === 'Pending' && iv.status !== 'On Hold' && !isInterviewLocked && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                              <div>
                                 <label style={{fontSize: '13px', display: 'block', color: '#1a202c'}}>{iv.round === 'R1' ? 'Domain Knowledge' : 'Technical'}</label>
                                 <input type="number" placeholder="0-10" value={g.score1} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score1: e.target.value}})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                              </div>
                              <div>
                                 <label style={{fontSize: '13px', display: 'block', color: '#1a202c'}}>{iv.round === 'R1' ? 'Communication' : 'Problem Solving'}</label>
                                 <input type="number" placeholder="0-10" value={g.score2} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score2: e.target.value}})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                              </div>
                              <div>
                                 <label style={{fontSize: '13px', display: 'block', color: '#1a202c'}}>{iv.round === 'R1' ? 'Availability' : 'Cultural fit'}</label>
                                 <input type="number" placeholder="0-10" value={g.score3} onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score3: e.target.value}})} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                              </div>
                            </div>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Total Score: {total}</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => handleGradeInterview(iv.id, iv.round, 'Selected')} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                              <button onClick={() => handleGradeInterview(iv.id, iv.round, 'Rejected')} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                              <button onClick={() => handleGradeInterview(iv.id, iv.round, 'On Hold')} style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>On Hold</button>
                            </div>
                          </div>
                        )}

                        {iv.status === 'On Hold' && iv.result === 'On Hold' && (
                          <div style={{ marginTop: '15px', borderTop: '1px dashed #f59e0b', paddingTop: '10px' }}>
                            <p style={{ color: '#92400e', fontWeight: 'bold', fontSize: '14px' }}>⏸️ Process On Hold</p>
                            <button onClick={() => handleResumeProcess(iv.id, iv.round)} style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                              Resume Process (Select or Reject)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              
              {(candidate.current_stage !== 'Assignment' && (r1TotalScore > 0 || r2TotalScore > 0)) && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#059669', fontWeight: '600', fontSize: '15px' }}>
                    <strong>Round 1 Score:</strong> {r1TotalScore} Marks &nbsp;|&nbsp; <strong>Round 2 Score:</strong> {r2TotalScore} Marks
                  </p>
                  <p style={{ margin: 0, color: '#059669', fontWeight: '800', fontSize: '16px' }}>
                    <strong>Total Interview Score:</strong> {grandTotal} Marks
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PROBATION MEETING SCHEDULING */}
          {showProbationMeeting && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fcddf9',
              borderRadius: '8px', 
              border: '2px solid #bf00ff',
              marginTop: '20px'
            }}>
              <h4 style={{ 
                color: '#c60fa1', 
                margin: '0 0 15px 0', 
                fontSize: '16px', 
                textAlign: 'center' 
              }}>
                📅 Schedule Probation Meeting
              </h4>
              
              <div>
                <p style={{ color: '#92400e', fontSize: '14px', marginBottom: '15px' }}>
                  Schedule a probation meeting for this selected candidate.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Meeting Link" 
                    value={probationInput.link} 
                    onChange={(e) => setProbationInput({...probationInput, link: e.target.value})} 
                    style={{ padding: '8px', border: '1px solid #f4f6f9', borderRadius: '4px', backgroundColor: '#49184b', color: '#f8f9fb', fontSize: '14px' }} 
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="date" 
                      value={probationInput.date} 
                      onChange={(e) => setProbationInput({...probationInput, date: e.target.value})} 
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#49184b', color: '#f8f9fb', fontSize: '14px', minWidth: '120px' }} 
                    />
                    <input 
                      type="time" 
                      value={probationInput.startTime} 
                      onChange={(e) => setProbationInput({...probationInput, startTime: e.target.value})} 
                      style={{ flex: 0.7, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#49184b', color: '#f8f9fb', fontSize: '14px', minWidth: '90px' }} 
                    />
                    <span style={{ alignSelf: 'center', color: '#64748b', fontWeight: 'bold' }}>to</span>
                    <input 
                      type="time" 
                      value={probationInput.endTime} 
                      onChange={(e) => setProbationInput({...probationInput, endTime: e.target.value})} 
                      style={{ flex: 0.7, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#49184b', color: '#f8f9fb', fontSize: '14px', minWidth: '90px' }} 
                    />
                  </div>
                  <button 
                    onClick={handleScheduleProbationMeeting}
                    style={{ backgroundColor: '#bf00ff', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', width: '100%' }}
                  >
                    Schedule Probation Meeting
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROBATION MANAGEMENT DROPDOWN */}
          {showProbationManagement && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: candidate.current_stage === 'Selected' ? '#f5f3ff' : '#fefce8',
              borderRadius: '8px', 
              border: candidate.current_stage === 'Selected' ? '2px solid #8b5cf6' : '1px solid #fde68a',
              marginTop: '20px'
            }}>
              <h4 style={{ 
                color: candidate.current_stage === 'Selected' ? '#6d28d9' : '#92400e',
                margin: '0 0 15px 0', 
                fontSize: '16px', 
                textAlign: 'center' 
              }}>
                {candidate.current_stage === 'Selected' ? '📋 Probation Meeting Scheduled - Awaiting Activation' : '⏳ Active Probation Management'}
              </h4>
              
              <div style={{ background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                
                {probationMeetingDetails && (
                  <div style={{ 
                    marginBottom: '16px', 
                    padding: '12px', 
                    background: '#f0fdf4', 
                    borderRadius: '6px',
                    border: '1px solid #a7f3d0'
                  }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '13px', color: '#065f46' }}>
                      📅 Probation Meeting Scheduled
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#475569' }}>
                      <strong>Date:</strong> {getFormattedDateIST(probationMeetingDetails.date)}
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#475569' }}>
                      <strong>Time (IST):</strong> {extractTimeFromISO(probationMeetingDetails.date)} - {extractTimeFromISO(probationMeetingDetails.end)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      <a 
                        href={probationMeetingDetails.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: '#2563eb', fontWeight: '500', textDecoration: 'none' }}
                      >
                        Join Meeting →
                      </a>
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>
                    Onboarding Status
                  </label>
                  <p style={{ margin: 0, color: '#059669', fontWeight: '500' }}>
                    {onboarding?.onboarding_status === 'Active' ? 'Active' : 
                     onboarding?.onboarding_status === 'Completed' ? 'Completed' : 
                     onboarding?.onboarding_status === 'Discontinued' ? 'Discontinued' : 
                     onboarding?.onboarding_status === 'Terminated' ? 'Terminated' : 'Pending'}
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>
                    Update Probation Status
                  </label>
                  <select 
                    value={onboarding?.probation_status || 'Pending'} 
                    onChange={async (e) => {
                      const newProbationStatus = e.target.value;
                      if (newProbationStatus === 'Select') return;

                      let newOnboardingStatus = 'Pending';
                      let newStage = candidate.current_stage;
                      let actionType = '';
                      
                      if (newProbationStatus === 'In Progress') {
                        newOnboardingStatus = 'Active';
                        newStage = 'Probation';
                        actionType = 'probation_started';
                      } else if (newProbationStatus === 'Completed') {
                        newOnboardingStatus = 'Completed';
                        newStage = 'Onboarding Done';
                        actionType = 'onboarding_completed';
                      } else if (newProbationStatus === 'Discontinued') {
                        newOnboardingStatus = 'Discontinued';
                        newStage = 'Internship Discontinued';
                        actionType = 'internship_discontinued';
                      } else if (newProbationStatus === 'Terminated') {
                        newOnboardingStatus = 'Terminated';
                        newStage = 'Terminated';
                        actionType = 'candidate_terminated';
                      } else if (newProbationStatus === 'Pending') {
                        newOnboardingStatus = 'Pending';
                        newStage = 'Selected';
                        actionType = 'probation_pending';
                      }

                      await supabase.from('onboarding').update({ 
                        probation_status: newProbationStatus,
                        onboarding_status: newOnboardingStatus
                      }).eq('candidate_id', id);

                      await supabase.from('candidates').update({ 
                        current_stage: newStage 
                      }).eq('id', id);

                      if (actionType) {
                        await logTeamActivity(
                          actionType,
                          'onboarding',
                          id,
                          {
                            candidate_id: id,
                            candidate_name: candidate.name || candidate.full_name,
                            new_status: newProbationStatus,
                            new_stage: newStage
                          }
                        );
                      }

                      alert(`Probation updated to: ${newProbationStatus}. Dashboard KPIs synced.`);
                      fetchCompleteProfile();
                    }}
                    style={{ 
                      padding: '8px', 
                      width: '100%', 
                      borderRadius: '4px', 
                      border: '1px solid #cbd5e1', 
                      outline: 'none', 
                      cursor: 'pointer',
                      backgroundColor: '#fff',
                      color: '#000'
                    }}
                  >
                    <option value="Pending">Pending (Awaiting Activation)</option>
                    <option value="In Progress">Active Probation</option>
                    <option value="Completed">Onboarding Completed</option>
                    <option value="Discontinued">Internship Discontinued</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                  {candidate.current_stage === 'Selected' && (
                    <p style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '4px' }}>
                      ⚠️ Select "Active Probation" to move the candidate to Probation stage.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {candidate.current_stage === 'Selected' && !showProbationMeeting && !showProbationManagement && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#ecfdf5', 
              borderRadius: '8px', 
              border: '1px solid #a7f3d0',
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#065f46', margin: '0 0 8px 0', fontSize: '18px' }}>🎉 Candidate Selected</h4>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                Schedule a probation meeting using the form above to proceed.
              </p>
            </div>
          )}

          {candidate.current_stage === 'Probation' && !showProbationManagement && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fefce8', 
              borderRadius: '8px', 
              border: '1px solid #fde68a',
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#92400e', margin: '0 0 8px 0', fontSize: '18px' }}>⏳ Probation Active</h4>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                Candidate is in probation period. Manage probation status above.
              </p>
            </div>
          )}

          {candidate.current_stage === 'Rejected' && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', border: '1px solid #fee2e2' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Candidate File Closed</h4>
              <p style={{ fontSize: '14px', margin: 0 }}>Applicant has been marked as rejected.</p>
            </div>
          )}

          {candidate.current_stage === 'Withdrawn' && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', border: '1px solid #fee2e2' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Candidate Withdrawn</h4>
              <p style={{ fontSize: '14px', margin: 0 }}>This candidate has been withdrawn from the process.</p>
            </div>
          )}

          {candidate.current_stage === 'Terminated' && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', border: '1px solid #fee2e2' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Candidate Terminated</h4>
              <p style={{ fontSize: '14px', margin: 0 }}>This candidate has been terminated after probation.</p>
            </div>
          )}

          {candidate.current_stage === 'Onboarding Done' && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#065f46', border: '1px solid #a7f3d0' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>✅ Onboarding Completed</h4>
              <p style={{ fontSize: '14px', margin: 0 }}>Candidate has successfully completed onboarding.</p>
            </div>
          )}

          {candidate.current_stage === 'Internship Discontinued' && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', border: '1px solid #fee2e2' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Internship Discontinued</h4>
              <p style={{ fontSize: '14px', margin: 0 }}>This candidate's internship has been discontinued.</p>
            </div>
          )}

          {isOnWaitlist && (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              backgroundColor: '#f5f3ff', 
              borderRadius: '8px', 
              color: '#6d28d9', 
              border: '2px solid #8b5cf6' 
            }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>⏳ Candidate on Waitlist</h4>
              <p style={{ fontSize: '14px', margin: '0 0 8px 0', color: '#7c3aed' }}>
                This candidate has been placed on the waitlist.
              </p>
              {candidate.waitlisted_at && (
                <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#8b5cf6' }}>
                  Waitlisted: {new Date(candidate.waitlisted_at).toLocaleString()}
                </p>
              )}
              <button
                onClick={handleRestoreFromWaitlist}
                style={{ 
                  marginTop: '12px',
                  backgroundColor: '#8b5cf6', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '8px 20px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '13px'
                }}
              >
                🔄 Restore Candidate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files Modal */}
      {showFilesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>
                📁 Assignment Submission
              </h3>
              <button
                onClick={() => setShowFilesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                ×
              </button>
            </div>

            {hasValidLink && (
              <div style={{
                padding: '14px',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                marginBottom: '16px'
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#065f46' }}>
                  🔗 Assignment Link
                </p>
                <a 
                  href={assignment.submitted_link} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontSize: '14px',
                    wordBreak: 'break-all'
                  }}
                >
                  {assignment.submitted_link}
                </a>
              </div>
            )}

            {hasFiles ? (
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                  📄 Uploaded Files ({uploadedFiles.length})
                </p>
                {uploadedFiles.map((file, index) => (
                  <div key={file.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                    borderRadius: '6px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: '0', fontSize: '14px', color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.file_name}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFileDownload(file.file_url, file.file_name)}
                      style={{
                        padding: '4px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ⬇ Download
                    </button>
                  </div>
                ))}
              </div>
            ) : !hasValidLink ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
                No submission found.
              </p>
            ) : null}
            
            <button
              onClick={() => setShowFilesModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '16px',
                background: '#ed1212',
                color: '#eef1f5',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '750'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {isAddingFAQ && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>📖 Add to FAQ</h3>
            
            {checkingSimilar ? (
              <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Checking for duplicates...</p>
              </div>
            ) : similarFAQ ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <p style={{ color: '#991b1b', fontSize: '13px', margin: 0 }}>
                  ⚠️ Similar question found: <strong>"{similarFAQ.question}"</strong>
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0 0' }}>
                  This question may already be in the FAQ list with similar wording.
                </p>
              </div>
            ) : null}
            
            <form onSubmit={handleAddFAQ}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Question</label>
                <input
                  value={faqForm.question}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontSize: '14px',
                    color: '#1a202c',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Answer</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                  placeholder="Enter the FAQ answer..."
                  rows="3"
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    color: '#1a202c',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Category</label>
                <select
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({...faqForm, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#1a202c',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="General">General</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Interview">Interview</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Add to FAQ
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingFAQ(false); setFaqForm({ question: '', answer: '', category: '', questionId: null }); setSimilarFAQ(null); }}
                  style={{
                    padding: '8px 20px',
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#dc2626' }}>🚫 Withdraw Candidate</h3>
            <p style={{ color: '#e27878', fontSize: '14px', marginBottom: '16px' }}>
              Are you sure you want to withdraw <strong>{candidate.name || candidate.full_name}</strong> from the process?
              <br />
              <span style={{ fontSize: '13px', color: '#e27878' }}>
                This action will move the candidate to "Withdrawn" stage and they will be notified.
              </span>
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Reason for Withdrawal <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Please provide a reason for withdrawal"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  color: '#1a202c',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleWithdrawCandidate}
                style={{
                  padding: '8px 20px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Confirm Withdraw
              </button>
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }}
                style={{
                  padding: '8px 20px',
                  background: '#084c28',
                  color: '#f9fbff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#8b5cf6' }}>⏳ Add Candidate to Waitlist</h3>
            <p style={{ color: '#173c6f', fontSize: '14px', marginBottom: '16px' }}>
              
                <strong>Current stage being paused:</strong> {candidate.current_stage}
      
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Reason for Waitlist (Internal - Not shown to candidate) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={waitlistReason}
                onChange={(e) => setWaitlistReason(e.target.value)}
                placeholder="Please provide a reason for adding to waitlist (e.g., No current openings, Skill mismatch, etc.)"
                rows="2"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  color: '#1a202c',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Internal Notes (Optional)
              </label>
              <textarea
                value={waitlistNotes}
                onChange={(e) => setWaitlistNotes(e.target.value)}
                placeholder="Add any internal notes about this waitlist decision..."
                rows="2"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  color: '#1a202c',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              background: '#f5f3ff', 
              padding: '12px', 
              borderRadius: '6px', 
              marginBottom: '16px',
              border: '1px solid #e9d5ff'
            }}>
              <p style={{ fontSize: '12px', color: '#6d28d9', margin: 0 }}>
                <strong>📧 Candidate will receive:</strong> A formal notification that they have been placed on the waitlist and will be contacted when suitable positions become available.
              </p>
              <p style={{ fontSize: '11px', color: '#8b5cf6', margin: '4px 0 0 0' }}>
                ⚠️ The reason you enter above will NOT be shown to the candidate.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleWaitlistCandidate}
                style={{
                  padding: '8px 20px',
                  background: '#422f6b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Confirm Waitlist
              </button>
              <button
                onClick={() => { setShowWaitlistModal(false); setWaitlistReason(''); setWaitlistNotes(''); }}
                style={{
                  padding: '8px 20px',
                  background: '#f72020',
                  color: '#fffbfc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Reschedule Modal */}
      {showHRRescheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#d97706' }}>🔄 Reschedule Interview</h3>
            <p style={{ color: '#1b1d1f', fontSize: '14px', marginBottom: '16px' }}>
              Reschedule the interview for <strong>{candidate.name || candidate.full_name}</strong>.
              <br />
              <span style={{ fontSize: '13px', color: '#1b1d1f' }}>
                The candidate will be notified of the new schedule.
              </span>
            </p>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                Panel Name
              </label>
              <input
                type="text"
                placeholder="Enter panel name"
                value={hrRescheduleData.panel}
                onChange={(e) => setHrRescheduleData({...hrRescheduleData, panel: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#060707',
                  background: '#fdd133',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                Meeting Link <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter meeting link"
                value={hrRescheduleData.link}
                onChange={(e) => setHrRescheduleData({...hrRescheduleData, link: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#060707',
                  background: '#fdd133',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={hrRescheduleData.date}
                onChange={(e) => setHrRescheduleData({...hrRescheduleData, date: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#060707',
                  background: '#fdd133',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                  Start Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  value={hrRescheduleData.startTime}
                  onChange={(e) => setHrRescheduleData({...hrRescheduleData, startTime: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#060707',
                    background: '#fdd133',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                  End Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  value={hrRescheduleData.endTime}
                  onChange={(e) => setHrRescheduleData({...hrRescheduleData, endTime: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#060707',
                    background: '#fdd133',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#041005', marginBottom: '4px' }}>
                Reason for Reschedule (Optional)
              </label>
              <textarea
                value={hrRescheduleData.reason}
                onChange={(e) => setHrRescheduleData({...hrRescheduleData, reason: e.target.value})}
                placeholder="Enter reason for rescheduling..."
                rows="2"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  color: '#060707',
                  background: '#fdd133',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleHRRescheduleInterview}
                style={{
                  padding: '8px 20px',
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Confirm Reschedule
              </button>
              <button
                onClick={() => {
                  setShowHRRescheduleModal(false);
                  setHrRescheduleData({
                    interviewId: null,
                    panel: '',
                    link: '',
                    date: '',
                    startTime: '',
                    endTime: '',
                    reason: ''
                  });
                }}
                style={{
                  padding: '8px 20px',
                  background: '#f8511a',
                  color: '#f7f9fc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidateDetailsPage;