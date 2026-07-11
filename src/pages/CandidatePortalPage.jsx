import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

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
    name: '', 
    phone: '', 
    domain: '', 
    source: '', 
    referrer_contact: '',
    referrer_name: '',
    other_source: '',
    portfolio_link: ''
  });
  
  // File upload states
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Stage dependency sub-states
  const [assignment, setAssignment] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  
  // Anti double-click lock execution block state variable
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
          console.error("Error loading domains:", error);
          setDomains([
            "Automation & Operations",
            "Brand Management & Outreach",
            "Business Development",
            "Clinical Psychologist",
            "Content Creation",
            "Creative Design",
            "Graphic Design",
            "HR Psychologist",
            "Human Resources (HR)",
            "Lead Generation",
            "Marketing",
            "Media & Public Relations (PR)",
            "Motion Graphics",
            "Operations",
            "Project Management",
            "Python Automation",
            "Sales and Marketing",
            "Social Media Management",
            "Talent Acquisition",
            "Video Editing/Making",
            "UI/UX Design",
            "Full stack Developer"
          ]);
          return;
        }
        if (data && data.length > 0) {
          setDomains([...new Set(data.map(d => d.domain))]);
        }
      } catch (err) {
        console.error("Error in loadDomains:", err);
      }
    }
    loadDomains();
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem('candidateEmail');
    if (savedEmail) {
      supabase
        .from('candidates')
        .select('*')
        .eq('email', savedEmail)
        .single()
        .then(({ data }) => {
          if (data) setCandidate(data);
        });
    }
  }, []);

  // Sync relational state tables when candidate profile is loaded
  useEffect(() => {
    if (candidate) {
      fetchWorkflowContext();
      fetchQuestions();
      fetchFAQs();
      fetchUploadedFiles();
    }
  }, [candidate]);

  // ✅ Fetch uploaded files for this assignment
  async function fetchUploadedFiles() {
    if (!candidate || !assignment) return;
    
    const { data, error } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('candidate_id', candidate.id)
      .eq('assignment_id', assignment.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching uploaded files:', error);
    } else {
      setUploadedFiles(data || []);
    }
  }

  // Fetch questions
  async function fetchQuestions() {
    if (!candidate) return;
    
    const { data, error } = await supabase
      .from('candidate_questions')
      .select('*, question_replies(*)')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
    } else {
      setQuestions(data || []);
    }
  }

  // Fetch FAQs with category
  async function fetchFAQs() {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching FAQs:', error);
    } else {
      setFaqs(data || []);
    }
  }

  async function fetchWorkflowContext() {
    if (!candidate) return;

    const { data: updatedCand } = await supabase.from('candidates').select('*').eq('id', candidate.id).single();
    if (updatedCand) setCandidate(updatedCand);

    const currentStage = updatedCand ? updatedCand.current_stage : candidate.current_stage;
    const currentDomain = updatedCand ? updatedCand.domain : candidate.domain;

    let { data: assign, error: assignError } = await supabase
      .from('assignments')
      .select('*')
      .eq('candidate_id', candidate.id)
      .maybeSingle();

    if (currentStage === 'Assignment' && !assign && !assignError) {
      const { data: template } = await supabase
        .from('assignment_templates')
        .select('*')
        .eq('domain', currentDomain)
        .maybeSingle();

      if (template) {
        const { data: newAssign, error: insertError } = await supabase
          .from('assignments')
          .insert({
            candidate_id: candidate.id,
            assignment_template_id: template.id,
            assignment_title: template.assignment_name,
            assignment_type: 'Domain Task',
            assignment_status: 'Assigned',
            assigned_by: 'System Admin',
            task_link_template: template.assignment_link
          })
          .select()
          .single();

        if (!insertError && newAssign) {
          assign = newAssign;
        }
      }
    }

    setAssignment(assign);
    if (assign?.submitted_link) {
      setSubmissionUrl(assign.submitted_link);
      
      // Check if submission was late
      if (assign.submitted_at) {
        const deadline = new Date(assign.deadline).getTime();
        const submittedAt = new Date(assign.submitted_at).getTime();
        if (submittedAt > deadline) {
          setIsLate(true);
          const lateMs = submittedAt - deadline;
          const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
          const lateMinutes = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
          setLateDuration(`${lateHours}h ${lateMinutes}m`);
        }
      }
    }

    const { data: ivs } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidate.id)
      .in('status', ['Scheduled', 'Reschedule_Requested', 'Completed', 'On Hold'])
      .not('scheduled_date_time', 'is', null)
      .order('id', { ascending: false });

    setInterviews(ivs || []);
    
    // Fetch onboarding data with probation meeting details
    const { data: ob } = await supabase.from('onboarding').select('*').eq('candidate_id', candidate.id).maybeSingle();
    setOnboardingData(ob);
  }

  // TIMER LOGIC
  useEffect(() => {
    if (!assignment || !assignment.deadline) return;
    if (assignment.assignment_status === 'Submitted' || assignment.assignment_status === 'Evaluated') {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const deadline = new Date(assignment.deadline).getTime();
      const distance = deadline - now;

      if (distance < 0) {
        setTimeLeft(0);
        // Calculate how late it is
        const lateMs = Math.abs(distance);
        const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
        const lateMinutes = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
        setLateDuration(`${lateHours}h ${lateMinutes}m`);
        setIsLate(true);
        return;
      }

      setTimeLeft(distance);
      setIsLate(false);
    };

    updateTimer(); // Initial call
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [assignment]);

  function isAssignmentExpired() {
    if (!assignment || !assignment.created_at) return false;
    if (assignment.hr_override_approved === true || assignment.hr_override_approved === 'TRUE') return false;
    if (timeLeft === 0) return true;

    const assignedTime = new Date(assignment.created_at).getTime();
    const currentTime = new Date().getTime();
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    return (currentTime - assignedTime) > twoDaysInMs;
  }

  function isSubmissionDisabled() {
    // Only disable if already submitted or evaluated
    return assignment?.assignment_status === 'Submitted' || 
           assignment?.assignment_status === 'Evaluated' || 
           isSubmitting;
  }

  // Upload resume to Supabase Storage
  async function uploadResume(file, candidateId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    console.log("📤 Uploading resume to:", filePath);
    console.log("📄 File size:", (file.size / 1024 / 1024).toFixed(2), "MB");

    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });

    if (error) {
      console.error('❌ Error uploading resume:', error);
      throw error;
    }

    console.log("✅ Upload successful:", data);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);

    console.log("🔗 Public URL:", urlData.publicUrl);

    return urlData.publicUrl;
  }

  // Validate file before upload
  function validateFile(file) {
    // Check file type (only PDF)
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed. Please upload a PDF file.');
      return false;
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit. Please upload a smaller file.');
      return false;
    }

    return true;
  }

  // ✅ Upload assignment file to storage - With bucket creation fallback
  async function uploadAssignmentFile(file) {
    if (!candidate || !assignment) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidate.id}/${assignment.id}/${Date.now()}_${file.name}`;
    const filePath = `assignment_files/${fileName}`;

    console.log("📤 Uploading assignment file to:", filePath);
    console.log("📄 File size:", (file.size / 1024 / 1024).toFixed(2), "MB");

    try {
      // Try uploading to assignment_files bucket first
      let { data, error } = await supabase.storage
        .from('assignment_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Error uploading to assignment_files bucket:', error);
        
        // If bucket doesn't exist, try creating it or fallback to resumes bucket
        if (error.message?.includes('bucket') || error.statusCode === 404) {
          console.log('⚠️ assignment_files bucket not found, trying to create it...');
          
          // Try to create the bucket
          const { error: createError } = await supabase.storage.createBucket('assignment_files', {
            public: true,
            allowedMimeTypes: ['*/*'],
            fileSizeLimit: 104857600 // 100MB
          });
          
          if (createError) {
            console.error('❌ Failed to create bucket:', createError);
            // Fallback to resumes bucket
            console.log('🔄 Falling back to resumes bucket...');
            return await uploadAssignmentFileToResumesBucket(file);
          }
          
          // Retry upload after bucket creation
          const retryResult = await supabase.storage
            .from('assignment_files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (retryResult.error) {
            console.error('❌ Retry upload failed:', retryResult.error);
            throw retryResult.error;
          }
          
          data = retryResult.data;
        } else {
          throw error;
        }
      }

      console.log("✅ Assignment file uploaded successfully:", data);

      const { data: urlData } = supabase.storage
        .from('assignment_files')
        .getPublicUrl(filePath);

      return {
        file_name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type
      };
    } catch (error) {
      console.error('Upload error:', error);
      // Try fallback to resumes bucket
      console.log('🔄 Falling back to resumes bucket...');
      return await uploadAssignmentFileToResumesBucket(file);
    }
  }

  // ✅ Fallback: Upload to resumes bucket
  async function uploadAssignmentFileToResumesBucket(file) {
    if (!candidate || !assignment) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `assignments/${candidate.id}/${assignment.id}/${Date.now()}_${file.name}`;
    const filePath = `${fileName}`;

    console.log("📤 Uploading to resumes bucket:", filePath);

    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading to resumes bucket:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);

    return {
      file_name: file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type
    };
  }

  // ✅ Handle assignment file upload
  async function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    // Check if already 5 files uploaded
    if (uploadedFiles.length + files.length > 5) {
      alert(`You can only upload up to 5 files. You already have ${uploadedFiles.length} file(s) uploaded.`);
      e.target.value = '';
      return;
    }

    setIsUploadingFiles(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // ✅ Check file size (max 100MB per file)
        if (file.size > 100 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds 100MB limit. Please upload a smaller file.`);
          continue;
        }

        const uploadedFile = await uploadAssignmentFile(file);
        
        if (uploadedFile) {
          // Save file record to database
          const { data: fileRecord, error: dbError } = await supabase
            .from('assignment_files')
            .insert({
              candidate_id: candidate.id,
              assignment_id: assignment.id,
              file_name: uploadedFile.file_name,
              file_path: uploadedFile.file_path,
              file_url: uploadedFile.file_url,
              file_size: uploadedFile.file_size,
              file_type: uploadedFile.file_type
            })
            .select()
            .single();

          if (dbError) {
            console.error('Error saving file record:', dbError);
            alert(`Failed to save file "${file.name}" record.`);
          } else {
            setUploadedFiles(prev => [fileRecord, ...prev]);
          }
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploadingFiles(false);
      e.target.value = '';
    }
  }

  // ✅ Remove uploaded file
  async function handleRemoveFile(fileId) {
    if (!confirm('Are you sure you want to remove this file?')) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('assignment_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Error deleting file record:', dbError);
        alert('Failed to remove file.');
        return;
      }

      // Update state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Failed to remove file.');
    }
  }

  // ✅ Check if submission is valid (at least one file OR link provided)
  function isSubmissionValid() {
    if (assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated') {
      return false;
    }
    const hasLink = assignmentLink.trim() !== '';
    const hasFiles = uploadedFiles.length > 0;
    return hasLink || hasFiles;
  }

  // ✅ Handle assignment submission with files and link
  async function handleSubmitAssignment() {
    if (!isSubmissionValid()) {
      alert('Please either upload at least one file or provide a valid link to submit your assignment.');
      return;
    }

    if (assignment?.assignment_status === 'Evaluated') {
      alert('Assignment is currently being evaluated by HR. No further changes allowed.');
      return;
    }

    setIsSubmitting(true);
    
    const now = new Date().toISOString();
    const deadline = new Date(assignment.deadline).getTime();
    const submittedAt = new Date(now).getTime();
    const isLateSubmission = submittedAt > deadline;
    
    let lateDurationText = null;
    if (isLateSubmission) {
      const lateMs = submittedAt - deadline;
      const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
      const lateMinutes = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
      lateDurationText = `${lateHours}h ${lateMinutes}m`;
    }

    // Prepare submission data
    const updateData = {
      submitted_at: now,
      assignment_status: 'Submitted'
    };

    // If link is provided, add it as submitted_link
    if (assignmentLink.trim() !== '') {
      updateData.submitted_link = assignmentLink.trim();
    } else {
      // If no link but files are uploaded, set a placeholder indicating file submission
      updateData.submitted_link = `File submission (${uploadedFiles.length} files uploaded)`;
    }

    // If late, add metadata
    if (isLateSubmission) {
      updateData.is_late_submission = true;
      updateData.late_duration = lateDurationText;
    }

    const { error } = await supabase.from('assignments').update(updateData).eq('candidate_id', candidate.id);

    if (error) {
      alert(`Submission failure: ${error.message}`);
      setIsSubmitting(false);
    } else {
      if (isLateSubmission) {
        alert(`✅ Assignment submitted successfully!\n\n⚠️ LATE SUBMISSION: Your submission is ${lateDurationText} past the deadline. HR will be notified.`);
      } else {
        alert('✅ Assignment submitted successfully!');
      }
      await fetchWorkflowContext();
      await fetchUploadedFiles();
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    if (!emailInput.trim()) return;

    const { data, error } = await supabase.from('candidates').select('*').eq('email', emailInput.trim().toLowerCase()).maybeSingle();

    if (error) {
      setErrorMsg('A database retrieval anomaly occurred.');
    } else if (data) {
      localStorage.setItem('candidateEmail', data.email);
      setCandidate(data);
      
      navigate('/portal', { replace: true });
    } else {
      setErrorMsg('Email address not registered. Proceed to fill out the internship form.');
      setIsRegistering(true);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErrorMsg('');
    
    // Validate required fields
    if (!regForm.name || !emailInput || !regForm.phone || !regForm.domain || !regForm.source) {
      alert('Please fill out all required fields.');
      return;
    }

    // Validate resume file
    if (!resumeFile) {
      alert('Please upload your resume (PDF format, max 100MB).');
      return;
    }

    // Validate file before proceeding
    if (!validateFile(resumeFile)) {
      return;
    }

    // If source is 'Other', validate other_source
    let finalSource = regForm.source;
    if (regForm.source === 'Other') {
      if (!regForm.other_source.trim()) {
        alert('Please specify your source.');
        return;
      }
      finalSource = regForm.other_source.trim();
    }

    // Validate referrer details if source is Referral
    if (regForm.source === 'Referral') {
      if (!regForm.referrer_name || !regForm.referrer_contact) {
        alert('Please enter both the referrer\'s name and contact number.');
        return;
      }
    }

    // Validate email
    const cleanEmail = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    const { data: checkExist } = await supabase.from('candidates').select('*').eq('email', cleanEmail).maybeSingle();
    if (checkExist) {
      alert('This email profile matches a pre-existing profile. Logging into workspace.');
      setCandidate(checkExist);
      return;
    }

    // Start upload
    setUploading(true);

    try {
      // Step 1: Create the candidate record first
      const insertData = {
        name: regForm.name,
        email: cleanEmail,
        phone: regForm.phone,
        domain: regForm.domain,
        source: finalSource,
        current_stage: 'Applied',
        status: 'In_Progress',
        resume_review: 'Pending',
        portfolio_link: regForm.portfolio_link || null
      };

      console.log("📝 Creating candidate with data:", insertData);

      const { data: newCand, error: insertError } = await supabase
        .from('candidates')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error creating candidate:", insertError);
        setErrorMsg(`Registration operation aborted: ${insertError.message}`);
        setUploading(false);
        return;
      }

      console.log("✅ Candidate created with ID:", newCand.id);

      // Step 2: Upload resume to storage
      let resumeUrl = null;
      try {
        resumeUrl = await uploadResume(resumeFile, newCand.id);
        console.log("✅ Resume uploaded successfully:", resumeUrl);
      } catch (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        alert('Resume upload failed. Please try again.');
        setUploading(false);
        return;
      }

      // Step 3: Update candidate with resume URL
      if (resumeUrl) {
        console.log("💾 Updating candidate with resume URL:", resumeUrl);
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ resume_link: resumeUrl })
          .eq('id', newCand.id);

        if (updateError) {
          console.error("❌ Error updating resume link:", updateError);
          alert('Failed to save resume link. Please contact support.');
          setUploading(false);
          return;
        }
        console.log("✅ Resume link saved successfully!");
      }

      // Step 4: If source is Referral, create entry in referrals table
      if (regForm.source === 'Referral') {
        const { error: referralError } = await supabase
          .from('referrals')
          .insert({
            candidate_id: newCand.id,
            candidate_name: regForm.name,
            candidate_email: cleanEmail,
            referrer_name: regForm.referrer_name,
            referrer_contact: regForm.referrer_contact,
            status: 'Pending'
          });

        if (referralError) {
          console.error("❌ Error saving referral data:", referralError);
        } else {
          console.log("✅ Referral data saved successfully");
        }
      }

      alert('✅ Registered successfully!');
      
      localStorage.removeItem('candidateEmail');
      setRegForm({ 
        name: '', 
        phone: '', 
        domain: '', 
        source: '', 
        referrer_contact: '',
        referrer_name: '',
        other_source: '',
        portfolio_link: ''
      });
      setResumeFile(null);
      setEmailInput('');
      setUploading(false);
      navigate('/login', { replace: true });
      
    } catch (err) {
      console.error('❌ Registration error:', err);
      alert('An error occurred during registration. Please try again.');
      setUploading(false);
    }
  }

  // Submit question
  async function handleSubmitQuestion(e) {
    e.preventDefault();
    
    if (!newQuestion.trim()) {
      alert('Please enter your question.');
      return;
    }
    
    setIsSubmittingQuestion(true);
    
    const { data, error } = await supabase
      .from('candidate_questions')
      .insert({
        candidate_id: candidate.id,
        candidate_name: candidate.name || candidate.full_name,
        candidate_email: candidate.email,
        question: newQuestion.trim(),
        status: 'Pending',
        is_public: false
      })
      .select()
      .single();
    
    if (error) {
      alert(`Failed to submit question: ${error.message}`);
    } else {
      alert('✅ Your question has been submitted. HR will respond shortly.');
      setNewQuestion('');
      await fetchQuestions();
    }
    
    setIsSubmittingQuestion(false);
  }

  async function handleAcceptInterview(interviewId) {
    const { error } = await supabase
      .from('interviews')
      .update({ candidate_accepted: true })
      .eq('id', interviewId);
    
    if (error) {
      console.error("Error accepting interview:", error);
      alert("Failed to update status. Please try again.");
    } else {
      alert("Interview accepted! HR has been notified.");
      fetchWorkflowContext(); 
    }
  }

  async function handleRequestReschedule(e) {
    e.preventDefault();
    const selectedInterview = interviews.find(x => x.id === selectedInterviewId);
    if ((selectedInterview?.reschedule_count || 0) >= 2) {
      alert('Maximum 2 reschedule requests allowed.');
      return;
    }
    
    if (!selectedInterviewId || !rescheduleReason.trim()) {
      alert('Please provide your availability preferences and reason for rescheduling.');
      return;
    }

    const { error } = await supabase
      .from('interview_reschedule_requests')
      .insert({
        interview_id: selectedInterviewId,
        requested_by: 'Candidate',
        reason: rescheduleReason.trim(),
        proposed_time_1: new Date().toISOString(),
        status: 'Pending'
      });

    if (error) {
      alert(`Error documenting request parameters: ${error.message}`);
    } else {
      await supabase.from('interviews').update({ 
        status: 'Reschedule_Requested', 
        reschedule_count: (selectedInterview?.reschedule_count || 0) + 1 
      }).eq('id', selectedInterviewId);
      
      alert('Your reschedule request has been sent to HR.');
      setRescheduleReason('');
      setSelectedInterviewId(null);
      fetchWorkflowContext();
    }
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem('candidateEmail');
      localStorage.clear();
      sessionStorage.clear();
      
      setCandidate(null);
      setEmailInput('');
      
      navigate('/login', { replace: true }); 
    } catch (err) {
      console.error("Logout error:", err);
      navigate('/login', { replace: true });
    }
  };

  const openFAQModal = () => {
    setShowFAQModal(true);
  };

  const closeFAQModal = () => {
    setShowFAQModal(false);
  };

  const groupedFAQs = faqs.reduce((groups, faq) => {
    const category = faq.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(faq);
    return groups;
  }, {});

  const isLoginPath = window.location.pathname === '/login';

  // ✅ Extract time from ISO string - converts UTC back to IST
  function extractTimeFromISO(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      // Add 5 hours 30 minutes to convert UTC to IST
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

  // Display time in IST
  const getTimeSlotDisplay = (interview) => {
    if (interview.time_slot) {
      return interview.time_slot;
    }
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

  // Display date in IST
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

  // Display time in IST using extractTimeFromISO
  const formatTimeIST = (dateString) => {
    if (!dateString) return '';
    return extractTimeFromISO(dateString);
  };

  const hasProbationMeeting = () => {
    return onboardingData && 
           onboardingData.probation_meeting_scheduled === true && 
           onboardingData.probation_meeting_date;
  };

  const getProbationMeetingDetails = () => {
    if (!onboardingData) return null;
    return {
      date: onboardingData.probation_meeting_date,
      end: onboardingData.probation_meeting_end,
      link: onboardingData.probation_meeting_link
    };
  };

  // Check if candidate is on waitlist
  const isOnWaitlist = candidate?.current_stage === 'Waitlist';

  if (!candidate || isLoginPath) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: '460px', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#1e3a8a', fontSize: '26px', fontWeight: '800', margin: '0 0 8px 0' }}>Jarurat Care Foundation</h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Candidate Portal</p>
          </div>
          {errorMsg && <div style={{ padding: '12px 16px', background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>{errorMsg}</div>}
          {!isRegistering ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Registered Email</label>
                <input 
                  type="email" 
                  placeholder="Enter your registered email address" 
                  required 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '15px', backgroundColor: '#fff', color: '#000', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <button type="submit" style={{ width: '100%', background: '#1e40af', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>Login</button>
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>New Applicant? <span onClick={() => setIsRegistering(true)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>Register here</span></p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter your full name" 
                  required 
                  value={regForm.name} 
                  onChange={(e) => setRegForm({...regForm, name: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Email ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  required 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Contact Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter your contact number" 
                  required 
                  value={regForm.phone} 
                  onChange={(e) => setRegForm({...regForm, phone: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Domain <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  required 
                  value={regForm.domain} 
                  onChange={(e) => setRegForm({...regForm, domain: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                >
                  <option value="">Select your preferred domain</option>
                  {domains.length > 0 ? domains.map(d => <option key={d} value={d}>{d}</option>) : (
                    <>
                      <option value="Automation & Operations">Automation & Operations</option>
                      <option value="Brand Management & Outreach">Brand Management & Outreach</option>
                      <option value="Business Development">Business Development</option>
                      <option value="Clinical Psychologist">Clinical Psychologist</option>
                      <option value="Content Creation">Content Creation</option>
                      <option value="Creative Design">Creative Design</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="HR Psychologist">HR Psychologist</option>
                      <option value="Human Resources (HR)">Human Resources (HR)</option>
                      <option value="Lead Generation">Lead Generation</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Media & Public Relations (PR)">Media & Public Relations (PR)</option>
                      <option value="Motion Graphics">Motion Graphics</option>
                      <option value="Operations">Operations</option>
                      <option value="Project Management">Project Management</option>
                      <option value="Python Automation">Python Automation</option>
                      <option value="Sales and Marketing">Sales and Marketing</option>
                      <option value="Social Media Management">Social Media Management</option>
                      <option value="Talent Acquisition">Talent Acquisition</option>
                      <option value="Video Editing/Making">Video Editing/Making</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Full stack Developer">Full stack Developer</option>
                    </>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Source <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  required 
                  value={regForm.source} 
                  onChange={(e) => {
                    setRegForm({...regForm, source: e.target.value});
                    if (e.target.value !== 'Referral' && e.target.value !== 'Other') {
                      setRegForm(prev => ({...prev, source: e.target.value, referrer_contact: '', referrer_name: '', other_source: ''}));
                    }
                  }} 
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                >
                  <option value="">Select</option>
                  <option value="Internshala">Internshala</option>
                  <option value="Referral">Referral</option>
                  <option value="Wellfound">Wellfound</option>
                  <option value="Indeed">Indeed</option>
                  <option value="College Outreach">College Outreach</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Other Source Input */}
              {regForm.source === 'Other' && (
                <div style={{ marginBottom: '14px', animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Please specify your source <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Please enter your source." 
                    required 
                    value={regForm.other_source} 
                    onChange={(e) => setRegForm({...regForm, other_source: e.target.value})} 
                    style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
              )}

              {/* Referral Details */}
              {regForm.source === 'Referral' && (
                <>
                  <div style={{ marginBottom: '14px', animation: 'fadeIn 0.3s ease' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Referrer's Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Enter referrer's full name" 
                      required 
                      value={regForm.referrer_name} 
                      onChange={(e) => setRegForm({...regForm, referrer_name: e.target.value})} 
                      style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                  <div style={{ marginBottom: '14px', animation: 'fadeIn 0.3s ease' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Referrer's Contact Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Enter referrer's contact number" 
                      required 
                      value={regForm.referrer_contact} 
                      onChange={(e) => setRegForm({...regForm, referrer_contact: e.target.value})} 
                      style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                </>
              )}

              {/* Resume File Upload - Simplified */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Resume (PDF only, max 100MB) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none'
                  }}>
                    Choose File
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      onChange={(e) => {
                        if (e.target.files.length > 0 && validateFile(e.target.files[0])) {
                          setResumeFile(e.target.files[0]);
                        }
                        e.target.value = '';
                      }} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  {resumeFile ? (
                    <span style={{ fontSize: '14px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📄 {resumeFile.name} ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button 
                        type="button"
                        onClick={() => setResumeFile(null)}
                        style={{
                          padding: '2px 10px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>No file chosen</span>
                  )}
                </div>
                {uploading && (
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    ⏳ Uploading...
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Portfolio Link <span style={{ color: '#94a3b8', fontSize: '11px' }}>(Optional)</span></label>
                <input 
                  type="url" 
                  placeholder="Please enter your portfolio link" 
                  value={regForm.portfolio_link} 
                  onChange={(e) => setRegForm({...regForm, portfolio_link: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                style={{ 
                  width: '100%', 
                  background: uploading ? '#94a3b8' : '#059669', 
                  color: '#fff', 
                  padding: '12px', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  cursor: uploading ? 'not-allowed' : 'pointer' 
                }}
                onMouseEnter={(e) => !uploading && (e.target.style.background = '#047857')}
                onMouseLeave={(e) => !uploading && (e.target.style.background = '#059669')}
              >
                {uploading ? 'Uploading...' : 'Register'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748b' }}>Already registered? <span onClick={() => setIsRegistering(false)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>Return to Login</span></p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 5-STEP PROGRESS LOGIC
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
  } else if (candidate.current_stage === 'Selected' || candidate.current_stage === 'Rejected' || 
      candidate.current_stage === 'Internship Discontinued' || candidate.current_stage === 'Withdrawn' ||
      candidate.current_stage === 'Terminated') {
    currentStepIndex = 3; 
  } else {
    const foundIndex = stageMapping.findIndex(s => s.id === candidate.current_stage);
    if (foundIndex !== -1) currentStepIndex = foundIndex;
  }

  const isSubmissionCompleted = assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated';

  const getAssignmentTitle = () => {
    if (!candidate) return 'Assignment';
    return `${candidate.domain} Assignment`;
  };

  const formatTime = (milliseconds) => {
    if (milliseconds === null) return 'Calculating...';
    if (milliseconds <= 0) return 'EXPIRED';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const hasClearedR1 = candidate.r1_status === 'Passed' || candidate.r1_status === 'Selected';
  const hasClearedR2 = candidate.r2_status === 'Passed' || candidate.r2_status === 'Selected';
  const hasR2Scheduled = interviews.some(iv => iv.round === 'R2' && iv.status === 'Scheduled');

  const isAssignmentLate = () => {
    if (!assignment || !assignment.deadline) return false;
    if (assignment.assignment_status === 'Submitted' && assignment.submitted_at) {
      const deadline = new Date(assignment.deadline).getTime();
      const submittedAt = new Date(assignment.submitted_at).getTime();
      return submittedAt > deadline;
    }
    return false;
  };

  const getLateDuration = () => {
    if (!assignment || !assignment.deadline || !assignment.submitted_at) return null;
    const deadline = new Date(assignment.deadline).getTime();
    const submittedAt = new Date(assignment.submitted_at).getTime();
    if (submittedAt <= deadline) return null;
    const lateMs = submittedAt - deadline;
    const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
    const lateMinutes = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${lateHours}h ${lateMinutes}m`;
  };

  const probationMeeting = hasProbationMeeting() ? getProbationMeetingDetails() : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/jarurat-logo.png" 
            alt="Jarurat Care Logo" 
            style={{ height: '55px', objectFit: 'contain' }} 
          />
          <span style={{ color: '#fff', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Jarurat Care Foundation <span style={{ fontWeight: '300', opacity: '0.8' }}>| CANDIDATE PORTAL</span></span>
        </div>
        <button type="button" onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 18px', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>LOGOUT</button>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Waitlist Banner */}
        {isOnWaitlist && (
          <div style={{ 
            background: '#f5f3ff', 
            border: '2px solid #8b5cf6', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>⏳</span>
            <h3 style={{ color: '#5b21b6', margin: '0 0 8px 0', fontSize: '22px' }}>You're on our Waitlist</h3>
            <p style={{ color: '#6d28d9', fontSize: '15px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              Thank you for your interest in joining Jarurat Care Foundation. 
              While we don't have an opening that matches your profile right now, 
              we've placed your application on our waitlist. 
              We'll reach out to you when a suitable position becomes available.
            </p>
            {candidate.waitlisted_at && (
              <p style={{ fontSize: '12px', color: '#a78bfa', marginTop: '8px' }}>
                Waitlisted on: {new Date(candidate.waitlisted_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', marginBottom: '30px', textAlign: 'center' }}>
          <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px', color: '#475569', margin: '0 0 25px 0', fontWeight: '700' }}>Application Progress</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            {stageMapping.map((stage, index) => {
              let isCompleted = index <= currentStepIndex;
              
              if (stage.id === 'Assignment') {
                isCompleted = assignment?.assignment_status === 'Submitted' || assignment?.assignment_status === 'Evaluated'; 
              } else if (stage.id === 'Interview') {
                const isInterviewCleared = candidate.current_stage === 'Selected' || 
                                          candidate.current_stage === 'Probation' || 
                                          candidate.current_stage === 'Onboarding Done' || 
                                          candidate.current_stage === 'Internship Discontinued' ||
                                          candidate.current_stage === 'Withdrawn' ||
                                          candidate.current_stage === 'Terminated';
                if (candidate.current_stage === 'Waitlist') {
                  const restoreStage = candidate.waitlist_restore_stage || 'Applied';
                  const restoreIndex = stageMapping.findIndex(s => s.id === restoreStage);
                  isCompleted = index <= restoreIndex;
                } else {
                  isCompleted = isInterviewCleared;
                }
              } else if (stage.id === 'Probation') {
                const isProbationActive = candidate.current_stage === 'Probation' || 
                                          candidate.current_stage === 'Onboarding Done' ||
                                          candidate.current_stage === 'Internship Discontinued' ||
                                          candidate.current_stage === 'Withdrawn' ||
                                          candidate.current_stage === 'Terminated';
                if (candidate.current_stage === 'Waitlist') {
                  const restoreStage = candidate.waitlist_restore_stage || 'Applied';
                  const restoreIndex = stageMapping.findIndex(s => s.id === restoreStage);
                  isCompleted = index <= restoreIndex;
                } else {
                  isCompleted = isProbationActive;
                }
              } else if (stage.id === 'Onboarding Done') {
                isCompleted = candidate.current_stage === 'Onboarding Done';
                if (candidate.current_stage === 'Waitlist') {
                  isCompleted = false;
                }
              } else {
                if (candidate.current_stage === 'Waitlist' && stage.id === 'Applied') {
                  isCompleted = true;
                } else {
                  isCompleted = index <= currentStepIndex;
                }
              }

              const isActive = index === currentStepIndex && 
                               candidate.current_stage !== 'Rejected' && 
                               candidate.current_stage !== 'Internship Discontinued' && 
                               candidate.current_stage !== 'Withdrawn' && 
                               candidate.current_stage !== 'Terminated' && 
                               candidate.current_stage !== 'Waitlist';
              
              let bgColor = '#cbd5e1';
              if (isCompleted) bgColor = '#10b981';
              if (isActive && !isCompleted && candidate.current_stage !== 'Rejected' && candidate.current_stage !== 'Internship Discontinued' && candidate.current_stage !== 'Withdrawn' && candidate.current_stage !== 'Terminated' && candidate.current_stage !== 'Waitlist') bgColor = '#2563eb';

              return (
                <React.Fragment key={stage.id}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: bgColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                      {isCompleted && candidate.current_stage !== 'Rejected' && candidate.current_stage !== 'Internship Discontinued' && candidate.current_stage !== 'Withdrawn' && candidate.current_stage !== 'Terminated' && candidate.current_stage !== 'Waitlist' ? '✓' : index + 1}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', marginTop: '8px', color: isCompleted || isActive ? '#0f172a' : '#64748b', whiteSpace: 'pre-line', textAlign: 'center' }}>
                      {stage.label}
                    </span>
                  </div>
                  {index < stageMapping.length - 1 && (
                    <div style={{ height: '3px', background: index < currentStepIndex ? '#10b981' : '#e2e8f0', flex: 1, position: 'relative', top: '-10px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '30px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '22px', color: '#0f172a', fontWeight: '800', margin: '0 0 6px 0' }}>WELCOME, {candidate.name?.toUpperCase()}!</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 25px 0' }}>Your internship portal tracker at Jarurat Care Foundation is active.</p>
            <hr style={{ border: 'none', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '25px' }} />
            
            {candidate.current_stage === 'Applied' && (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>Application Under Review</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                  We are currently evaluating your profile. If your qualifications align with our requirements, you will be contacted with the next steps.
                </p>
              </div>
            )}

            {candidate.current_stage === 'Assignment' && (
              <div>
                {assignment && (assignment.assignment_status === 'Submitted' || assignment.assignment_status === 'Evaluated') ? (
                  <div style={{ 
                    background: isAssignmentLate() ? '#fef2f2' : '#f0fdf4', 
                    borderLeft: isAssignmentLate() ? '4px solid #ef4444' : '4px solid #10b981', 
                    padding: '12px 18px', 
                    borderRadius: '4px', 
                    marginBottom: '25px' 
                  }}>
                    <p style={{ margin: 0, color: isAssignmentLate() ? '#991b1b' : '#166534', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}>
                      {isAssignmentLate() ? (
                        <>
                          ⚠️ <strong>LATE SUBMISSION</strong> — Your assignment was submitted {getLateDuration()} past the deadline. HR will review your submission.
                        </>
                      ) : (
                        '✅ Your assignment is currently under review. Please wait for further updates from our team.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', borderLeft: '4px solid #2563eb', padding: '12px 18px', borderRadius: '4px', marginBottom: '25px' }}>
                    <p style={{ margin: 0, color: '#1e293b', fontSize: '14px', lineHeight: '1.5' }}>
                      Please complete the <strong>{candidate.domain}</strong> assessment below. Your submission will be reviewed by our team. <br />
                      {isLate ? (
                        <span style={{ color: '#dc2626', fontWeight: '500' }}>
                          ⏰ <strong>DEADLINE OVER</strong> — Submission beyond this point will be recorded as <strong>LATE</strong>.
                          <br />
                          <span style={{ fontSize: '13px', color: '#991b1b' }}>
                            (Late by: {lateDuration})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '500' }}>
                          ⏱️ You have <strong>{formatTime(timeLeft)}</strong> to submit.
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {assignment ? (
                  <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0f172a', textAlign: 'center', fontWeight: 'bold' }}>
                      Task: {getAssignmentTitle()}
                    </h3>
                    
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                      <a href={assignment.task_link_template} target="_blank" rel="noreferrer" style={{ display: 'inline-block', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', padding: '12px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}>
                        View Assignment
                      </a>
                    </div>
                    
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                      {/* File Upload Section */}
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                          Upload Files (Max 5 files, any format, max 100MB each)
                        </label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <label style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: '6px',
                            cursor: isSubmissionDisabled() ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: 'none',
                            opacity: isSubmissionDisabled() ? 0.6 : 1
                          }}>
                            Choose Files
                            <input 
                              type="file" 
                              multiple
                              onChange={handleFileUpload} 
                              disabled={isSubmissionDisabled() || uploadedFiles.length >= 5}
                              style={{ display: 'none' }} 
                            />
                          </label>
                          {isUploadingFiles && <span style={{ fontSize: '13px', color: '#64748b' }}>Uploading...</span>}
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                            {uploadedFiles.length}/5 files uploaded
                          </span>
                        </div>
                        
                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            {uploadedFiles.map((file) => (
                              <div key={file.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 10px',
                                background: '#f8fafc',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                  <span style={{ fontSize: '12px' }}>📄</span>
                                  <a 
                                    href={file.file_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ 
                                      fontSize: '13px', 
                                      color: '#2563eb', 
                                      textDecoration: 'none',
                                      flex: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {file.file_name}
                                  </a>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                                {!isSubmissionDisabled() && (
                                  <button
                                    onClick={() => handleRemoveFile(file.id)}
                                    style={{
                                      padding: '2px 8px',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link Input Section */}
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          And/Or Provide a Link (Google Drive, etc.)
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <input 
                            type="url" 
                            placeholder="Paste Your Google Drive Assignment Link Here" 
                            value={assignmentLink}
                            onChange={(e) => setAssignmentLink(e.target.value)}
                            disabled={isSubmissionDisabled()}
                            style={{ 
                              flex: 1, 
                              padding: '10px 14px', 
                              border: '1px solid #cbd5e1', 
                              borderRadius: '6px', 
                              outline: 'none', 
                              fontSize: '14px', 
                              backgroundColor: isSubmissionDisabled() ? '#f1f5f9' : '#fff', 
                              color: '#000' 
                            }} 
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button 
                          onClick={handleSubmitAssignment} 
                          disabled={isSubmissionDisabled() || !isSubmissionValid()}
                          style={{ 
                            backgroundColor: (isSubmissionDisabled() || !isSubmissionValid()) ? '#cbd5e1' : (isLate ? '#dc2626' : '#059669'), 
                            color: '#fff', 
                            border: 'none', 
                            padding: '10px 24px', 
                            borderRadius: '6px', 
                            cursor: (isSubmissionDisabled() || !isSubmissionValid()) ? 'not-allowed' : 'pointer', 
                            fontWeight: '600', 
                            fontSize: '14px' 
                          }}
                        >
                          {isSubmitting ? 'Submitting...' : (isLate ? 'Submit Late' : 'Submit Assignment')}
                        </button>
                        {!isSubmissionValid() && !isSubmissionDisabled() && (
                          <span style={{ fontSize: '12px', color: '#dc2626' }}>
                            ⚠️ Please upload at least one file or provide a link
                          </span>
                        )}
                      </div>

                      {/* Submission Status */}
                      {isLate && !isSubmissionCompleted && (
                        <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: '500', marginTop: '8px', textAlign: 'center' }}>
                          ⚠️ You are submitting <strong>LATE</strong> by {lateDuration}. This will be recorded as a late submission.
                        </p>
                      )}
                      {isSubmissionCompleted && isAssignmentLate() && (
                        <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: '500', marginTop: '8px', textAlign: 'center' }}>
                          ⚠️ <strong>LATE SUBMISSION</strong> — Submitted {getLateDuration()} past the deadline.
                        </p>
                      )}
                      {assignment.submitted_at && !isAssignmentLate() && (
                        <p style={{ color: '#059669', fontSize: '13px', fontWeight: '500', marginTop: '8px', textAlign: 'center' }}>
                          ✓ Submitted at {new Date(assignment.submitted_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : <p style={{ color: '#64748b', fontStyle: 'italic' }}>Generating target module tasks configuration hooks entries...</p>}
              </div>
            )}

            {candidate.current_stage === 'Interview' && (
              <div>
                <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 15px 0' }}>Your Scheduled Interview Operations</h3>
                
                {hasClearedR1 && !hasClearedR2 && (
                  <div style={{ 
                    background: '#f0fdf4', 
                    borderLeft: '4px solid #22c55e', 
                    borderRadius: '6px', 
                    padding: '14px 18px', 
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: '1.5' }}>
                      <span style={{ fontSize: '20px' }}>🎉</span>
                      <span style={{ fontWeight: '600' }}> Round 1 Cleared</span> — Congratulations on successfully clearing Round 1. Our team will reach out to you shortly with details regarding the next interview round.                    
                    </p>
                  </div>
                )}

                {hasClearedR2 && (
                  <div style={{ 
                    background: '#eff6ff', 
                    borderLeft: '4px solid #3b82f6', 
                    borderRadius: '6px', 
                    padding: '14px 18px', 
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', lineHeight: '1.5' }}>
                      <span style={{ fontWeight: '600' }}>★ All Rounds Completed</span> — Outstanding! You've successfully completed all interview rounds. Our team will reach out with the next steps.
                    </p>
                  </div>
                )}

                {interviews.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>
                    Your profile is under review for the Interview stage. We will notify you here once your interview slot is finalized.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {interviews
                      .filter(iv => iv.status !== 'On Hold' && iv.result !== 'On Hold')
                      .map(iv => {
                      let badgeBg = '#f1f5f9';
                      let badgeColor = '#475569';
                      let badgeText = iv.status || 'Pending';

                      if (iv.result === 'Rejected') {
                        badgeBg = '#fef2f2'; badgeColor = '#dc2626'; badgeText = 'Rejected';
                      } else if (iv.status === 'Reschedule_Requested') {
                        badgeBg = '#fef3c7'; badgeColor = '#d97706'; badgeText = 'Reschedule Requested';
                      } else if (iv.status === 'Scheduled') {
                        badgeBg = '#dbeafe'; badgeColor = '#1d4ed8'; badgeText = 'Scheduled';
                      } else if (iv.result === 'Selected') {
                        badgeBg = '#dcfce7'; badgeColor = '#16a34a'; badgeText = 'Cleared';
                      }

                      const isAccepted = iv.candidate_accepted === true;
                      const isRescheduleRequested = iv.status === 'Reschedule_Requested';
                      const isRescheduleFormOpen = selectedInterviewId === iv.id;

                      const timeSlot = getTimeSlotDisplay(iv);
                      const formattedDate = getFormattedDateIST(iv.scheduled_date_time);

                      return (
                        <div key={iv.id} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', background: '#fcfdfe' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontWeight: '700', color: '#4f46e5', fontSize: '15px' }}>ROUND PIPELINE: {iv.round}</span>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: badgeBg, color: badgeColor }}>
                              {badgeText}
                            </span>
                          </div>
                          
                          <p style={{ margin: '4px 0', fontSize: '14px', color: '#1a202c' }}>
  <strong>Date:</strong> {formattedDate}
</p>
<p style={{ margin: '4px 0', fontSize: '14px', color: '#1a202c' }}>
  <strong>Time Slot:</strong> {timeSlot || formatTimeIST(iv.scheduled_date_time)}
</p>
                          
                          {iv.result === 'Rejected' && (
                            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginTop: '10px', textAlign: 'center', fontWeight: '500' }}>
                              ❌ Unfortunately, you have not been selected to move forward in this round.
                            </div>
                          )}

                          <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', backgroundColor: '#0f172a', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '500' }}>
                              Join Digital Room Space
                            </a>
                            
                            <button 
                              onClick={() => handleAcceptInterview(iv.id)} 
                              disabled={isAccepted || isRescheduleRequested || isRescheduleFormOpen || iv.result === 'Selected' || iv.result === 'Rejected'}
                              style={{ 
                                backgroundColor: (isAccepted || isRescheduleRequested || isRescheduleFormOpen || iv.result === 'Selected' || iv.result === 'Rejected') ? '#9ca3af' : '#059669', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '8px 16px', 
                                borderRadius: '4px', 
                                cursor: (isAccepted || isRescheduleRequested || isRescheduleFormOpen || iv.result === 'Selected' || iv.result === 'Rejected') ? 'not-allowed' : 'pointer', 
                                fontSize: '13px', 
                                fontWeight: '500' 
                              }}
                            >
                              {iv.result === 'Selected' ? '✅ Cleared' : 
                               iv.result === 'Rejected' ? '❌ Rejected' :
                               isAccepted ? 'Invitation Accepted' : 'Accept Invitation'}
                            </button>

                            {iv.result === 'Pending' && (iv.reschedule_count || 0) < 2 && (
                              <button 
                                onClick={() => setSelectedInterviewId(iv.id)} 
                                disabled={isAccepted || isRescheduleRequested}
                                style={{ 
                                  backgroundColor: (isAccepted || isRescheduleRequested) ? '#9ca3af' : '#fff', 
                                  border: '1px solid #cbd5e1', 
                                  padding: '8px 14px', 
                                  borderRadius: '4px', 
                                  cursor: (isAccepted || isRescheduleRequested) ? 'not-allowed' : 'pointer', 
                                  fontSize: '13px', 
                                  color: (isAccepted || isRescheduleRequested) ? '#9ca3af' : '#475569', 
                                  fontWeight: '500' 
                                }}
                              >
                                {isRescheduleRequested ? 'Reschedule Requested' : 'Request Time Reschedule'}
                              </button>
                            )}
                            {(iv.reschedule_count || 0) >= 2 && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>Max reschedules reached.</p>}
                          </div>
                          
                          {isRescheduleFormOpen && (
                            <form onSubmit={handleRequestReschedule} style={{ marginTop: '20px', padding: '15px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                              <h4 style={{ margin: '0 0 10px 0', color: '#b45309', fontSize: '14px' }}>Request Reschedule</h4>
                              <textarea 
                                required 
                                placeholder="Please mention your availability preferences and the reason for rescheduling..." 
                                value={rescheduleReason} 
                                onChange={(e) => setRescheduleReason(e.target.value)} 
                                style={{ width: '100%', height: '80px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }} 
                              />
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" style={{ backgroundColor: '#b45309', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Submit Request</button>
                                <button type="button" onClick={() => setSelectedInterviewId(null)} style={{ backgroundColor: 'transparent', border: 'none', color: '#5f6368', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
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

            {candidate.current_stage === 'Selected' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '48px' }}>🎉</span>
                <h3 style={{ color: '#065f46', fontSize: '22px', margin: '10px 0 6px 0' }}>Congratulations, You Are Selected!</h3>
                <p style={{ color: '#475569', fontSize: '15px', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                  We are pleased to inform you that you have successfully cleared all stages of our evaluation process. 
                  Your profile and performance during the interview rounds have demonstrated exceptional potential. 
                  The HR team will be in touch with you shortly to initiate the next steps of your journey. 
                  We are excited to welcome you to the team and look forward to working with you.
                </p>

                {probationMeeting && (
                  <div style={{ 
                    background: '#fefce8', 
                    border: '1px solid #fde68a', 
                    borderRadius: '8px', 
                    padding: '20px',
                    marginTop: '16px',
                    textAlign: 'left'
                  }}>
                    <h4 style={{ color: '#92400e', margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
                      📅 Probation Meeting Scheduled
                    </h4>
                    <div style={{ 
                      background: '#fff', 
                      padding: '16px', 
                      borderRadius: '6px', 
                      border: '1px solid #a7f3d0'
                    }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Date:</strong> {getFormattedDateIST(probationMeeting.date)}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Time (IST):</strong> {extractTimeFromISO(probationMeeting.date)} - {extractTimeFromISO(probationMeeting.end)}
                      </p>
                      <p style={{ margin: '8px 0 0 0' }}>
                        <strong>Meeting Link:</strong> 
                        <a 
                          href={probationMeeting.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            color: '#2563eb', 
                            textDecoration: 'none', 
                            display: 'inline-block',
                            marginLeft: '6px',
                            fontWeight: '500'
                          }}
                        >
                          Join Meeting →
                        </a>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {candidate.current_stage === 'Rejected' && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#991b1b' }}>
                <h3 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Application Update</h3>
                <p style={{ fontSize: '14px', color: '#475569', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                  Thank you for your interest in joining Jarurat Care Foundation. After a thorough review, we regret to inform you that we will not be proceeding with your candidacy at this time. We sincerely appreciate the time and effort you invested in this process and wish you the very best in your future career endeavors.
                </p>
              </div>
            )}

            {candidate.current_stage === 'Probation' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '48px' }}>⏳</span>
                <h3 style={{ color: '#92400e', fontSize: '22px', margin: '10px 0 6px 0' }}>Active Probation</h3>
                <p style={{ color: '#475569', fontSize: '15px', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                  You are currently in your probationary period. We look forward to your growth with the team!
                </p>
                
                {probationMeeting && (
                  <div style={{ 
                    background: '#fefce8', 
                    border: '1px solid #fde68a', 
                    borderRadius: '8px', 
                    padding: '20px',
                    marginTop: '16px',
                    textAlign: 'left'
                  }}>
                    <h4 style={{ color: '#92400e', margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
                      📅 Probation Meeting Scheduled
                    </h4>
                    <div style={{ 
                      background: '#fff', 
                      padding: '16px', 
                      borderRadius: '6px', 
                      border: '1px solid #a7f3d0'
                    }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Date:</strong> {getFormattedDateIST(probationMeeting.date)}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Time (IST):</strong> {extractTimeFromISO(probationMeeting.date)} - {extractTimeFromISO(probationMeeting.end)}
                      </p>
                      <p style={{ margin: '8px 0 0 0' }}>
                        <strong>Meeting Link:</strong> 
                        <a 
                          href={probationMeeting.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            color: '#2563eb', 
                            textDecoration: 'none', 
                            display: 'inline-block',
                            marginLeft: '6px',
                            fontWeight: '500'
                          }}
                        >
                          Join Meeting →
                        </a>
                      </p>
                    </div>
                  </div>
                )}
                
                {!probationMeeting && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#d97706' }}>
                    ⏳ Your probation meeting will be scheduled soon. Please check back for updates.
                  </p>
                )}
              </div>
            )}

            {candidate.current_stage === 'Onboarding Done' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '48px' }}>🎉</span>
                <h3 style={{ color: '#065f46', fontSize: '22px', margin: '10px 0 6px 0' }}>Onboarding Complete!</h3>
                <p style={{ color: '#475569', fontSize: '15px', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>Congratulations on completing your onboarding journey. We are pleased to welcome you to the organization and look forward to your contributions to the team. You will receive further details soon</p>
              </div>
            )}

            {candidate.current_stage === 'Internship Discontinued' && (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px 0',
                color: '#991b1b'
              }}>
                <p style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  margin: '0 0 16px 0',
                  color: '#991b1b'
                }}>
                  Dear {candidate.name || candidate.full_name || 'Candidate'},
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '0 auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  We would like to take this opportunity to thank you for your time and contributions during your tenure with us. 
                  After careful consideration, we have decided to conclude your internship journey with Jarurat Care Foundation. 
                  We truly appreciate the efforts you have put in and wish you the very best in your future professional endeavors. 
                  Should opportunities arise in the future that align with your skills, we will be happy to connect with you again.
                </p>
              </div>
            )}

            {candidate.current_stage === 'Terminated' && (
              <div style={{ 
                textAlign: 'center', 
                padding: '30px 0',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fee2e2'
              }}>
                <span style={{ fontSize: '48px' }}>📋</span>
                <h3 style={{ 
                  color: '#991b1b', 
                  fontSize: '22px', 
                  margin: '10px 0 6px 0' 
                }}>
                  Dear {candidate.name || candidate.full_name || 'Candidate'},
                </h3>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '0 auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  We hope this message finds you well. We are writing to inform you that, after careful evaluation of your performance during the probationary period, we have decided to conclude your association with Jarurat Care Foundation.
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '12px auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  We want to thank you for the time and effort you have invested during your time with us. We truly appreciate your contributions and wish you nothing but the very best in your future professional endeavors.
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '12px auto 0 auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  Should you have any questions or need any clarification, please feel free to reach out to the HR team. We wish you success in all your future pursuits.
                </p>
                <div style={{
                  marginTop: '20px',
                  padding: '8px 20px',
                  background: '#fee2e2',
                  borderRadius: '8px',
                  display: 'inline-block',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  ⚪ Internship Terminated
                </div>
              </div>
            )}

            {candidate.current_stage === 'Withdrawn' && (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px 0',
                color: '#7c3aed'
              }}>
                <p style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  margin: '0 0 16px 0',
                  color: '#7c3aed'
                }}>
                  Dear {candidate.name || candidate.full_name || 'Candidate'},
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '0 auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  We acknowledge that you have decided to withdraw your application from the recruitment process with Jarurat Care Foundation.
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '8px auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  We respect your decision and appreciate the time and effort you invested in our selection process. We wish you the very best in your future endeavors and hope you find a role that perfectly aligns with your career aspirations.
                </p>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#475569', 
                  maxWidth: '600px', 
                  margin: '8px auto 0 auto', 
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}>
                  Should you wish to reapply in the future or if opportunities arise that match your profile, we would be happy to connect with you again.
                </p>
                <div style={{
                  marginTop: '16px',
                  padding: '8px 20px',
                  background: '#f3e8ff',
                  borderRadius: '8px',
                  display: 'inline-block',
                  color: '#7c3aed',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  ⚪ Application Withdrawn
                </div>
              </div>
            )}

            {candidate.current_stage === 'Waitlist' && (
              <div style={{ 
                padding: '20px', 
                background: '#f5f3ff', 
                borderRadius: '8px', 
                border: '1px solid #e9d5ff',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#6d28d9', fontSize: '14px', lineHeight: '1.6' }}>
                  Your application is currently on our waitlist. 
                  We will contact you when a suitable position becomes available.
                </p>
                {candidate.waitlisted_at && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#a78bfa' }}>
                    Waitlisted on: {new Date(candidate.waitlisted_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status & Instructions</h3>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '600' }}>CURRENT LIFECYCLE STAGE</span>
                <span style={{ 
                  fontSize: '15px', 
                  fontWeight: '700', 
                  color: isOnWaitlist ? '#8b5cf6' : '#1e3a8a'
                }}>
                  {candidate.current_stage?.toUpperCase() ?? 'N/A'}
                </span>
              </div>

              {isOnWaitlist && (
                <div style={{ 
                  background: '#f5f3ff', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e9d5ff',
                  fontSize: '13px', 
                  color: '#6d28d9', 
                  lineHeight: '1.6' 
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>⏳ Waitlist Status</strong>
                  <p style={{ margin: '0', fontSize: '13px' }}>
                    Your application is currently on our waitlist. We will contact you when a suitable position becomes available.
                  </p>
                </div>
              )}

              {candidate.current_stage === 'Assignment' && assignment && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' }}>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Assignment:</strong> {candidate.domain}</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Status:</strong> {assignment.assignment_status}</p>
                  <p style={{ margin: 0 }}>Please complete and submit your assignment via the portal.</p>
                </div>
              )}

              {candidate.current_stage === 'Interview' && (
                <>
                  {hasR2Scheduled && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>
                      <strong>Instructions:</strong> If the scheduled time slot aligns with your availability, please click <strong>Accept Invitation</strong> to confirm your presence. Alternatively, click <strong>Request Time Reschedule</strong> to specify your reason and provide alternative availability.
                      <strong><p>Note : A 1-hour window has been reserved for your interview. HR will reach out to you within this period to confirm a 15-minute interview slot.</p></strong>
                    </div>
                  )}
                  {!hasR2Scheduled && interviews.length > 0 && !hasClearedR1 && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>
                      <strong>Instructions:</strong> If the scheduled time slot aligns with your availability, please click <strong>Accept Invitation</strong> to confirm your presence. Alternatively, click <strong>Request Time Reschedule</strong> to specify your reason and provide alternative availability.
                      <strong><p>Note : A 1-hour window has been reserved for your interview. HR will reach out to you within this period to confirm a 15-minute interview slot.</p></strong>
                    </div>
                  )}
                  {hasClearedR1 && !hasClearedR2 && !hasR2Scheduled && (
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #22c55e', fontSize: '13px', color: '#166534', lineHeight: '1.5' }}>
                      <strong>✓ Round 1 Cleared</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                        Congratulations on clearing Round 1. Our team will contact you shortly regarding the next stage.
                      </p>
                    </div>
                  )}
                  {hasClearedR2 && (
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #3b82f6', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                      <strong>★ All Rounds Completed</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                        Congratulations on completing all interview rounds. Our team will reach out with the next steps.
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {candidate.current_stage === 'Selected' && (
                <div style={{ 
                  background: '#f0fdf4', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #bbf7d0',
                  fontSize: '13px', 
                  color: '#166534', 
                  lineHeight: '1.6' 
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>📋 Probation Period Information</strong>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                    As part of our process, all new members initially go through a probation period of one week. This is to assess mutual fit.
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '500' }}>During this period:</p>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '13px' }}>
                    <li>You will be working on assigned tasks</li>
                    <li>The team will review your performance, communication, and involvement</li>
                    <li>Based on this, your role will be confirmed for continuation with the organization</li>
                    <li>Note : Leaves are not permitted during the probation period.</li>
                  </ul>
                </div>
              )}
              
              {candidate.current_stage === 'Applied' && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', lineHeight: '1.4' }}><strong>Review Status Context:</strong> Please monitor this dashboard for updates regarding your application status.</div>
              )}

              {candidate.current_stage === 'Probation' && (
                <div style={{ 
                  background: '#fefce8', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #fde68a',
                  fontSize: '13px', 
                  color: '#92400e', 
                  lineHeight: '1.6' 
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>⏳ Probation Period</strong>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                    You are currently in your probationary period. This is a time for mutual assessment and growth.
                  </p>
                  {probationMeeting && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '12px', 
                      background: '#fff', 
                      borderRadius: '6px',
                      border: '1px solid #fde68a'
                    }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '12px' }}>
                        📅 Probation Meeting Scheduled
                      </p>
                      <p style={{ margin: '0 0 2px 0', fontSize: '12px' }}>
                        <strong>Date:</strong> {getFormattedDateIST(probationMeeting.date)}
                      </p>
                      <p style={{ margin: '0 0 2px 0', fontSize: '12px' }}>
                        <strong>Time (IST):</strong> {extractTimeFromISO(probationMeeting.date)} - {extractTimeFromISO(probationMeeting.end)}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                        <a 
                          href={probationMeeting.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#2563eb', fontWeight: '500', textDecoration: 'none' }}
                        >
                          Join Meeting →
                        </a>
                      </p>
                    </div>
                  )}
                  {!probationMeeting && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#d97706' }}>
                      ⏳ Your probation meeting will be scheduled soon. Please check back for updates.
                    </p>
                  )}
                </div>
              )}

              {candidate.current_stage === 'Terminated' && (
                <div style={{ 
                  background: '#fef2f2', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #fee2e2',
                  fontSize: '13px', 
                  color: '#991b1b', 
                  lineHeight: '1.6' 
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>📋 Internship Terminated</strong>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                    Your employment has been terminated after the probationary period. Please contact HR if you have any questions.
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                    We wish you all the best in your future endeavors.
                  </p>
                </div>
              )}

              {candidate.current_stage === 'Withdrawn' && (
                <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '13px', color: '#6b21a8', lineHeight: '1.5' }}>
                  <strong>⚠️ Application Withdrawn</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7c3aed' }}>
                    Your application has been withdrawn. Please contact HR if you have any questions.
                  </p>
                </div>
              )}

              <button onClick={fetchWorkflowContext} style={{ marginTop: '16px', width: '100%', padding: '10px', fontSize: '13px', fontWeight: '600', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', background: '#f0f9ff', cursor: 'pointer' }}>🔄 Sync Workspace State</button>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
                *Use this button if data is not updating automatically.
              </p>
            </div>

            {/* QUESTIONS & SUPPORT SECTION */}
            <div style={{ 
              background: '#fff', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
              border: '1px solid #e2e8f0',
              marginTop: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💬 Ask a Question (Please check FAQs before proceeding)
              </h3>
              
              <form onSubmit={handleSubmitQuestion}>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '10px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSubmittingQuestion ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: isSubmittingQuestion ? 0.7 : 1
                  }}
                >
                  {isSubmittingQuestion ? 'Submitting...' : 'Submit Question'}
                </button>
              </form>
              
              {questions.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px 0' }}>
                    Messages ({questions.length})
                  </h4>
                  {questions.map(q => {
                    const isSystemMessage = q.is_system_message === true;
                    
                    return (
                      <div key={q.id} style={{
                        padding: '12px',
                        background: isSystemMessage ? '#f5f3ff' : '#f8fafc',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        border: isSystemMessage ? '2px solid #8b5cf6' : '1px solid #e2e8f0'
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
                                <p style={{ margin: '0', fontSize: '13px', color: '#1e293b' }}>
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
                              </>
                            )}
                            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                              {new Date(q.created_at).toLocaleString()}
                            </p>
                          </div>
                          <span style={{
                            fontSize: '10px',
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FAQ SECTION */}
            <div style={{ 
              background: '#fff', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
              border: '1px solid #e2e8f0',
              marginTop: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0', fontSize: '15px', color: '#1e293b' }}>
                  📖 Frequently Asked Questions
                </h3>
                <button 
                  onClick={openFAQModal}
                  style={{
                    padding: '6px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  View All
                  {faqs.length > 0 && (
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '0 8px',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}>
                      {faqs.length}
                    </span>
                  )}
                </button>
              </div>
              
              {faqs.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '12px' }}>No FAQs available yet.</p>
              ) : (
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
                  Click "View All" to see all frequently asked questions.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FAQ MODAL */}
      {showFAQModal && (
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
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px' }}>📖 Frequently Asked Questions</h2>
              <button 
                onClick={closeFAQModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
              Questions you might ask about the recruitment process
            </p>

            {Object.keys(groupedFAQs).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No FAQs available yet.</p>
            ) : (
              Object.keys(groupedFAQs).map(category => (
                <div key={category} style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#1e3a8a', 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    margin: '0 0 12px 0',
                    padding: '8px 12px',
                    background: '#f0f4ff',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {category}
                  </h4>
                  {groupedFAQs[category].map(faq => (
                    <details key={faq.id} style={{ marginBottom: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1e293b',
                        padding: '12px 16px',
                        background: '#fafafa',
                        transition: 'background 0.2s'
                      }}>
                        {faq.question}
                      </summary>
                      <div style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#475569',
                        background: '#fff',
                        borderTop: '1px solid #e2e8f0',
                        lineHeight: '1.6'
                      }}>
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              ))
            )}

            <button 
              onClick={closeFAQModal}
              style={{
                width: '100%',
                padding: '10px',
                background: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                marginTop: '10px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}