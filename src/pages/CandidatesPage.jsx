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

  const [domainAssignmentLinks, setDomainAssignmentLinks] = useState({});
  const [uniqueDomains, setUniqueDomains] = useState([]);

  useEffect(() => {
    fetchCandidates();
    fetchDomainLinks();
  }, []);

  async function fetchDomainLinks() {
    const { data, error } = await supabase
      .from('assignment_templates')
      .select('domain, assignment_link, assignment_name')
      .order('domain', { ascending: true });

    if (error) {
      console.error("Error fetching domain links:", error);
      const fallbackLinks = {
        "Automation & Operations": "https://docs.google.com/document/d/1Fx6qmrIjls92CKTHZPzLUemFZHVcsxOlnPeU48vUes0/edit?usp=drive_link",
        "UI/UX Design": "https://docs.google.com/document/d/1Zs3Jo35y8USq4plJi4FLdk0Ufjxli0hKOvBteE62DnA/edit?usp=drive_link",
      };
      setDomainAssignmentLinks(fallbackLinks);
      setUniqueDomains(Object.keys(fallbackLinks));
      return;
    }

    if (data && data.length > 0) {
      const linksObject = {};
      data.forEach(item => { linksObject[item.domain] = item.assignment_link; });
      setDomainAssignmentLinks(linksObject);
      setUniqueDomains(data.map(d => d.domain));
    }
  }

  async function fetchCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*, assignments(assignment_status)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    setCandidates(data || []);
    calculateMetrics(data || []);
  }

  function calculateMetrics(list) {
    const counts = { total: list.length, applied: 0, assignment: 0, interview: 0, selected: 0, rejected: 0, pending_approval: 0 };
    list.forEach(c => {
      const stage = c.current_stage?.toLowerCase();
      if (counts.hasOwnProperty(stage)) counts[stage]++;
      if (c.current_stage === 'Assignment' && c.assignments?.[0]?.assignment_status === 'Evaluated') {
        counts.pending_approval++;
      }
    });
    setMetrics(counts);
  }

  const handleOpenEvaluation = (candidate) => {
    setSelectedCandidate(candidate);
    const taskUrl = domainAssignmentLinks[candidate.domain] || domainAssignmentLinks["UI/UX Design"] || "https://docs.google.com/document/d/1Zs3Jo35y8USq4plJi4FLdk0Ufjxli0hKOvBteE62DnA/edit?usp=drive_link";
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

  const handleSaveEvaluation = async () => {
    if (!selectedCandidate) return;
    const { error } = await supabase.from('candidates').update({
      current_stage: evaluation.current_stage,
      assignment_link: evaluation.assignment_link,
      assignment_score: evaluation.assignment_score ? parseFloat(evaluation.assignment_score) : null,
      assignment_remarks: evaluation.assignment_remarks,
      r1_score: evaluation.r1_score ? parseFloat(evaluation.r1_score) : null,
      r1_remarks: evaluation.r1_remarks,
      r2_score: evaluation.r2_score ? parseFloat(evaluation.r2_score) : null,
      r2_remarks: evaluation.r2_remarks
    }).eq('id', selectedCandidate.id);

    if (error) { alert("Error saving candidate records: " + error.message); } 
    else { setSelectedCandidate(null); fetchCandidates(); }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const nameMatch = (candidate.name || candidate.full_name || '').toLowerCase().includes(search.toLowerCase());
    const domainMatch = domainFilter === '' || candidate.domain === domainFilter;
    let stageMatch = stageFilter === '' || candidate.current_stage === stageFilter;
    if (stageFilter === 'Pending Approval') {
      stageMatch = candidate.current_stage === 'Assignment' && candidate.assignments?.[0]?.assignment_status === 'Evaluated';
    }
    return nameMatch && domainMatch && stageMatch;
  });

  // Reusable styles for inputs
  const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '6px' };

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ minHeight: '100vh', padding: '40px 60px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: 'relative', zIndex: 1 }}>
        
        <h1 className="animate-fade-up" style={{ color: '#fff', marginBottom: '40px', fontWeight: '800', fontSize: '48px', textAlign: 'center', letterSpacing: '-1px' }}>
          Candidate Pipeline Board
        </h1>
        
        {/* Metric Cards Row */}
        <div className="animate-fade-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'TOTAL', count: metrics.total, color: '#3b82f6' },
            { label: 'APPLIED', count: metrics.applied, color: '#94a3b8' },
            { label: 'ASSIGNMENT', count: metrics.assignment, color: '#f59e0b' },
            { label: 'PENDING APPROVAL', count: metrics.pending_approval, color: '#c084fc' },
            { label: 'INTERVIEW', count: metrics.interview, color: '#8b5cf6' },
            { label: 'SELECTED', count: metrics.selected, color: '#10b981' },
            { label: 'REJECTED', count: metrics.rejected, color: '#ef4444' }
          ].map(m => {
            const filterVal = m.label === 'TOTAL' ? '' : m.label.replace(' ', ' ').charAt(0) + m.label.slice(1).toLowerCase().replace(' ', ' ').replace('pending approval', 'Pending Approval');
            const isActive = stageFilter === filterVal;
            return (
              <div 
                key={m.label} 
                onClick={() => setStageFilter(filterVal)} 
                className="glass-panel"
                style={{ 
                  padding: '20px 16px', 
                  borderTop: `4px solid ${m.color}`, 
                  cursor: 'pointer', 
                  textAlign: 'center',
                  transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                  transition: 'all 0.3s ease',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                  boxShadow: isActive ? `0 10px 30px ${m.color}20` : 'none'
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>{m.label}</div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: isActive ? m.color : '#fff' }}>{m.count}</div>
              </div>
            );
          })}
        </div>

        {/* Filter Inputs Container */}
        <div className="glass-panel animate-fade-up delay-200" style={{ display: 'flex', gap: '16px', marginBottom: '30px', padding: '16px 24px' }}>
          <input type="text" placeholder="Search candidate..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '320px' }} />
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ ...inputStyle, width: '200px', color: '#000' }}>
            <option value="">All Domains</option>
            {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ ...inputStyle, width: '220px', color: '#000' }}>
            <option value="">All Stages</option>
            <option value="Applied">Applied</option>
            <option value="Assignment">Assignment</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Interview">Interview</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Main Table Layout */}
        <div className="glass-panel animate-fade-up delay-300" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Name</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Domain</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Stage</th>
                <th style={{ padding: '20px 24px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c) => {
                 const isPending = c.current_stage === 'Assignment' && c.assignments?.[0]?.assignment_status === 'Evaluated';
                 return (
                <tr key={c.id} onClick={() => handleOpenEvaluation(c)} style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '20px 24px', fontWeight: '600', color: '#fff', fontSize: '15px' }}>{c.name || c.full_name}</td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>{c.domain}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(255,255,255,0.1)', color: '#60a5fa' }}>{c.current_stage}</span>
                    {isPending && <span style={{ marginLeft: '10px', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(192, 132, 252, 0.2)', color: '#e879f9' }}>Pending Approval</span>}
                  </td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>{c.source}</td>
                </tr>
                );
              })}
              {filteredCandidates.length === 0 && <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Interactive Slide-out Pipeline Panel Evaluation Drawer */}
        {selectedCandidate && (
          <>
            <div onClick={() => setSelectedCandidate(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}></div>
            <div className="glass-panel" style={{ position: 'fixed', top: 0, right: 0, width: '460px', height: '100vh', borderRadius: 0, borderLeft: '1px solid var(--glass-border)', borderTop: 'none', borderBottom: 'none', zIndex: 1000, padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'rgba(7, 9, 15, 0.95)', backdropFilter: 'blur(30px)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '24px', fontWeight: '800' }}>{selectedCandidate.name || selectedCandidate.full_name}</h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Track: <strong>{selectedCandidate.domain}</strong> | Source: {selectedCandidate.source}</p>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="btn-glass" style={{ padding: '6px 12px', fontSize: '16px' }}>×</button>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Pipeline Stage Override</label>
                <select value={evaluation.current_stage} onChange={(e) => setEvaluation({...evaluation, current_stage: e.target.value})} style={{...inputStyle, color: '#000'}}>
                  <option value="Applied">Applied</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Interview">Interview</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Block 1 */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>1. Challenge Distribution</h4>
                <label style={labelStyle}>Task Repository Reference</label>
                <select value={selectedTaskUrl} onChange={(e) => setSelectedTaskUrl(e.target.value)} style={{...inputStyle, marginBottom: '16px', color: '#000'}}>
                  {Object.entries(domainAssignmentLinks).map(([name, url]) => (
                    <option key={name} value={url}>{name} Package</option>
                  ))}
                </select>
                <button onClick={() => { navigator.clipboard.writeText(selectedTaskUrl); alert("Copied to Clipboard!"); }} className="btn-glass" style={{ width: '100%', borderColor: 'var(--primary)', color: '#60a5fa' }}>
                  Copy Payload URL
                </button>
              </div>

              {/* Block 2 */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '15px' }}>2. Assignment Evaluation</h4>
                <label style={labelStyle}>Submitted Resource Link</label>
                <input type="text" placeholder="https://..." value={evaluation.assignment_link} onChange={(e) => setEvaluation({...evaluation, assignment_link: e.target.value})} style={{...inputStyle, marginBottom: '16px'}} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Score</label><input type="number" max="10" min="0" value={evaluation.assignment_score} onChange={(e) => setEvaluation({...evaluation, assignment_score: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Remarks</label><input type="text" value={evaluation.assignment_remarks} onChange={(e) => setEvaluation({...evaluation, assignment_remarks: e.target.value})} style={inputStyle} /></div>
                </div>
              </div>

              {/* Block 3 */}
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#c4b5fd', fontSize: '15px' }}>3. Technical Board (R1)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div><label style={labelStyle}>R1 Score</label><input type="number" value={evaluation.r1_score} onChange={(e) => setEvaluation({...evaluation, r1_score: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Feedback</label><input type="text" value={evaluation.r1_remarks} onChange={(e) => setEvaluation({...evaluation, r1_remarks: e.target.value})} style={inputStyle} /></div>
                </div>
              </div>

              {/* Block 4 */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#6ee7b7', fontSize: '15px' }}>4. Culture Loop (R2)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div><label style={labelStyle}>R2 Score</label><input type="number" value={evaluation.r2_score} onChange={(e) => setEvaluation({...evaluation, r2_score: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Final Remarks</label><input type="text" value={evaluation.r2_remarks} onChange={(e) => setEvaluation({...evaluation, r2_remarks: e.target.value})} style={inputStyle} /></div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '16px' }}>
                <button onClick={() => setSelectedCandidate(null)} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleSaveEvaluation} className="btn-premium" style={{ flex: 2, background: '#10b981' }}>Save Pipeline State</button>
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}

export default CandidatesPage;