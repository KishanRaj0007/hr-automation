import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  
  // Pipeline Evaluation States
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedTaskUrl, setSelectedTaskUrl] = useState('');
  const [evaluation, setEvaluation] = useState({
    current_stage: '',
    assignment_link: '',
    assignment_score: '',
    assignment_remarks: '',
    r1_score: '',
    r1_remarks: '',
    r2_score: '',
    r2_remarks: ''
  });

  const [metrics, setMetrics] = useState({ 
    total: 0, 
    applied: 0, 
    assignment: 0, 
    interview: 0, 
    selected: 0, 
    rejected: 0, 
    pending_approval: 0 
  });

  // ✅ NEW: Fetch domains from database
  const [domainAssignmentLinks, setDomainAssignmentLinks] = useState({});
  const [uniqueDomains, setUniqueDomains] = useState([]);

  useEffect(() => {
    fetchCandidates();
    fetchDomainLinks();
  }, []);

  // ✅ NEW: Fetch domain links from assignment_templates
  async function fetchDomainLinks() {
    const { data, error } = await supabase
      .from('assignment_templates')
      .select('domain, assignment_link, assignment_name')
      .order('domain', { ascending: true });

    if (error) {
      console.error("Error fetching domain links:", error);
      // ✅ ONLY 22 DOMAINS
      const fallbackLinks = {
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
      setDomainAssignmentLinks(fallbackLinks);
      setUniqueDomains(Object.keys(fallbackLinks));
      return;
    }

    if (data && data.length > 0) {
      // Convert to object { domain: link }
      const linksObject = {};
      data.forEach(item => {
        linksObject[item.domain] = item.assignment_link;
      });
      setDomainAssignmentLinks(linksObject);
      setUniqueDomains(data.map(d => d.domain));
    }
  }

  async function fetchCandidates() {
    // ✅ CORRECT: Join with assignments table
    const { data, error } = await supabase
      .from('candidates')
      .select('*, assignments(assignment_status)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setCandidates(data || []);
    calculateMetrics(data || []);
  }

  function calculateMetrics(list) {
    const counts = { 
      total: list.length, 
      applied: 0, 
      assignment: 0, 
      interview: 0, 
      selected: 0, 
      rejected: 0, 
      pending_approval: 0 
    };
    
    list.forEach(c => {
      const stage = c.current_stage?.toLowerCase();
      if (counts.hasOwnProperty(stage)) counts[stage]++;
      
      // Logic for Pending Approval
      if (c.current_stage === 'Assignment' && c.assignments?.[0]?.assignment_status === 'Evaluated') {
        counts.pending_approval++;
      }
    });
    setMetrics(counts);
  }

  // Open Pipeline Detail evaluation workspace sidebar
  const handleOpenEvaluation = (candidate) => {
    setSelectedCandidate(candidate);
    // ✅ Get link from fetched data or fallback
    const taskUrl = domainAssignmentLinks[candidate.domain] || 
                    domainAssignmentLinks["UI/UX Design"] || 
                    "https://docs.google.com/document/d/1Zs3Jo35y8USq4plJi4FLdk0Ufjxli0hKOvBteE62DnA/edit?usp=drive_link";
    setSelectedTaskUrl(taskUrl);
    setEvaluation({
      current_stage: candidate.current_stage || 'Applied',
      assignment_link: candidate.assignment_link || '',
      assignment_score: candidate.assignment_score || '',
      assignment_remarks: candidate.assignment_remarks || '',
      r1_score: candidate.r1_score || '',
      r1_remarks: candidate.r1_remarks || '',
      r2_score: candidate.r2_score || '',
      r2_remarks: candidate.r2_remarks || ''
    });
  };

  // Persist metrics, score evaluation updates to Supabase backend
  const handleSaveEvaluation = async () => {
    if (!selectedCandidate) return;
    
    const { error } = await supabase
      .from('candidates')
      .update({
        current_stage: evaluation.current_stage,
        assignment_link: evaluation.assignment_link,
        assignment_score: evaluation.assignment_score ? parseFloat(evaluation.assignment_score) : null,
        assignment_remarks: evaluation.assignment_remarks,
        r1_score: evaluation.r1_score ? parseFloat(evaluation.r1_score) : null,
        r1_remarks: evaluation.r1_remarks,
        r2_score: evaluation.r2_score ? parseFloat(evaluation.r2_score) : null,
        r2_remarks: evaluation.r2_remarks
      })
      .eq('id', selectedCandidate.id);

    if (error) {
      alert("Error saving candidate records: " + error.message);
    } else {
      setSelectedCandidate(null);
      fetchCandidates();
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const nameMatch = (candidate.name || candidate.full_name || '').toLowerCase().includes(search.toLowerCase());
    const domainMatch = domainFilter === '' || candidate.domain === domainFilter;
    
    // Updated stage filter logic to handle Pending Approval
    let stageMatch = stageFilter === '' || candidate.current_stage === stageFilter;
    if (stageFilter === 'Pending Approval') {
      stageMatch = candidate.current_stage === 'Assignment' && candidate.assignments?.[0]?.assignment_status === 'Evaluated';
    }
    
    return nameMatch && domainMatch && stageMatch;
  });

  return (
    <div style={{ position: 'relative', overflowX: 'hidden', minHeight: '100vh', backgroundColor: '#fcfcfd' }}>
      <div style={{ padding: '40px 60px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        
        {/* Header */}
        <h1 style={{ color: '#0f1e36', marginBottom: '40px', fontWeight: '800', fontSize: '56px', textAlign: 'center', letterSpacing: '-1px' }}>
          HR Funnel Dashboard
        </h1>
        
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '20px', marginBottom: '40px' }}>
          {[
            { label: 'TOTAL', count: metrics.total, color: '#3b82f6' },
            { label: 'APPLIED', count: metrics.applied, color: '#4b5563' },
            { label: 'ASSIGNMENT', count: metrics.assignment, color: '#f59e0b' },
            { label: 'PENDING APPROVAL', count: metrics.pending_approval, color: '#7c3aed' },
            { label: 'INTERVIEW', count: metrics.interview, color: '#a855f7' },
            { label: 'SELECTED', count: metrics.selected, color: '#10b981' },
            { label: 'REJECTED', count: metrics.rejected, color: '#ef4444' }
          ].map(m => (
            <div 
              key={m.label} 
              onClick={() => setStageFilter(m.label === 'TOTAL' ? '' : m.label.replace(' ', ' ').charAt(0) + m.label.slice(1).toLowerCase().replace(' ', ' ').replace('pending approval', 'Pending Approval'))} 
              style={{ 
                background: '#fff', 
                padding: '25px 15px', 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), 0 2px 6px rgba(0, 0, 0, 0.02)', 
                borderTop: `4px solid ${m.color}`, 
                cursor: 'pointer', 
                textAlign: 'center',
                borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ fontSize: '10px', color: '#718096', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '12px' }}>{m.label}</div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a' }}>{m.count}</div>
            </div>
          ))}
        </div>

        {/* Filter Inputs Container */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '35px' }}>
          <input 
            type="text" 
            placeholder="Search candidate..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ padding: '14px 20px', borderRadius: '10px', border: 'none', background: '#3d3d3d', color: '#fff', width: '320px', fontSize: '15px', outline: 'none' }} 
          />
          
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ padding: '14px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '15px', background: '#fff', color: '#4b5563', width: '160px', outline: 'none' }}>
            <option value="">Domain</option>
            {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ padding: '14px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '15px', background: '#fff', color: '#4b5563', width: '180px', outline: 'none' }}>
            <option value="">Stage</option>
            <option value="Applied">Applied</option>
            <option value="Assignment">Assignment</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Interview">Interview</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Main Table Layout */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Name</th>
                <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Domain</th>
                <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Stage</th>
                <th style={{ padding: '18px 24px', color: '#718096', fontWeight: '500', fontSize: '14px' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c) => {
                 const isPending = c.current_stage === 'Assignment' && c.assignments?.[0]?.assignment_status === 'Evaluated';
                 return (
                <tr 
                  key={c.id} 
                  onClick={() => handleOpenEvaluation(c)} 
                  style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                >
                  <td style={{ padding: '20px 24px', fontWeight: '600', color: '#1d4ed8', fontSize: '16px' }}>{c.name || c.full_name}</td>
                  <td style={{ padding: '20px 24px', color: '#4a5568', fontSize: '16px' }}>{c.domain}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', background: '#e4eaf2', color: '#2d3748' }}>
                      {c.current_stage}
                    </span>
                    {isPending && (
                      <span style={{ marginLeft: '10px', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: '#fef3c7', color: '#92400e' }}>
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px', color: '#718096', fontSize: '16px' }}>{c.source}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Slid-out Pipeline Panel Evaluation Drawer workspace */}
      {selectedCandidate && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '460px', height: '100vh', background: '#fff', boxShadow: '-10px 0 30px rgba(0,0,0,0.08)', zIndex: 1000, padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: '1px solid #e5e7eb' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f1e36', fontSize: '24px', fontWeight: '700' }}>{selectedCandidate.name || selectedCandidate.full_name}</h2>
              <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontSize: '14px' }}>Track: <strong>{selectedCandidate.domain}</strong> | Source: {selectedCandidate.source}</p>
            </div>
            <button onClick={() => setSelectedCandidate(null)} style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
          </div>

          {/* Workflow Stage Controller Pipeline Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>Current Pipeline Status Stage</label>
            <select 
              value={evaluation.current_stage} 
              onChange={(e) => setEvaluation({...evaluation, current_stage: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="Applied">Applied</option>
              <option value="Assignment">Assignment</option>
              <option value="Interview">Interview</option>
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Block 1: Domain-wise Assignment Sender Module */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '14px' }}>1. Distribute Challenge Assignment Task</h4>
            
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Select Task Track Repository Link</label>
            <select 
              value={selectedTaskUrl} 
              onChange={(e) => setSelectedTaskUrl(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px', background: '#fff' }}
            >
              {Object.entries(domainAssignmentLinks).map(([name, url]) => (
                <option key={name} value={url}>{name} Challenge Package</option>
              ))}
            </select>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(selectedTaskUrl);
                alert("Assignment payload link successfully copied to your Clipboard to forward to candidate!");
              }}
              style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
            >
              Copy Assignment URL Link
            </button>
          </div>

          {/* Block 2: Assignment Submission & Grade Metrics */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '14px' }}>2. Assignment Evaluation Board</h4>
            
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Submitted Assignment Resource Link</label>
            <input 
              type="text" 
              placeholder="https://github.com/candidate-repo" 
              value={evaluation.assignment_link} 
              onChange={(e) => setEvaluation({...evaluation, assignment_link: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px' }} 
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Score (0-10)</label>
                <input 
                  type="number" max="10" min="0" placeholder="Marks"
                  value={evaluation.assignment_score} 
                  onChange={(e) => setEvaluation({...evaluation, assignment_score: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>HR Status Remarks</label>
                <input 
                  type="text" placeholder="Excellent analytical structure"
                  value={evaluation.assignment_remarks} 
                  onChange={(e) => setEvaluation({...evaluation, assignment_remarks: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
            </div>
          </div>

          {/* Block 3: R1 Interview Metrics Panel */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#7c3aed', fontSize: '14px' }}>3. Technical Interview Board Loop (Round R1)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>R1 Score</label>
                <input 
                  type="number" placeholder="Marks"
                  value={evaluation.r1_score} 
                  onChange={(e) => setEvaluation({...evaluation, r1_score: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>R1 Feedback Notes</label>
                <input 
                  type="text" placeholder="Strong core architecture fundamentals"
                  value={evaluation.r1_remarks} 
                  onChange={(e) => setEvaluation({...evaluation, r1_remarks: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
            </div>
          </div>

          {/* Block 4: R2 Interview Metrics Panel */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#059669', fontSize: '14px' }}>4. Director / Culture Interview Loop (Round R2)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>R2 Score</label>
                <input 
                  type="number" placeholder="Marks"
                  value={evaluation.r2_score} 
                  onChange={(e) => setEvaluation({...evaluation, r2_score: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>R2 Final Remarks</label>
                <input 
                  type="text" placeholder="Fits team vision seamlessly"
                  value={evaluation.r2_remarks} 
                  onChange={(e) => setEvaluation({...evaluation, r2_remarks: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
            </div>
          </div>

          {/* Footer Save Operations Elements */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setSelectedCandidate(null)}
              style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#4b5563', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEvaluation}
              style={{ flex: 2, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
            >
              Save Pipeline Changes
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default CandidatesPage;