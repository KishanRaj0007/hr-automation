// src/pages/QuestionsPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

function QuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidate_questions')
      .select('*, question_replies(*), candidates(name, email, domain)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }

  const filteredQuestions = questions.filter(q => {
    const matchesFilter = filter === 'all' || q.status === filter;
    const matchesSearch = q.question?.toLowerCase().includes(search.toLowerCase()) ||
                          q.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
                          q.candidates?.name?.toLowerCase().includes(search.toLowerCase()) ||
                          q.candidates?.email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = questions.filter(q => q.status === 'Pending').length;
  const repliedCount = questions.filter(q => q.status === 'Replied').length;

  const handleFilterClick = (filterValue) => {
    setFilter(filterValue);
  };

  // Reusable styles
  const inputStyle = { width: '100%', padding: '12px 16px', boxSizing: 'border-box', border: '1px solid var(--glass-border)', borderRadius: '8px', outline: 'none', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', transition: 'all 0.2s', fontFamily: 'inherit' };

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ padding: '40px 60px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <button 
              onClick={() => navigate('/')}
              className="btn-glass"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ← Back to Dashboard
            </button>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>💬 Support Hub</h1>
            <div style={{ width: '150px' }}></div>
          </div>

          {/* Clickable KPI Cards */}
          <div className="animate-fade-up delay-100" style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div 
              onClick={() => handleFilterClick('all')}
              className="glass-panel"
              style={{ 
                padding: '24px', 
                cursor: 'pointer',
                flex: 1,
                minWidth: '140px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                borderTop: filter === 'all' ? '4px solid var(--primary)' : '1px solid var(--glass-border)',
                background: filter === 'all' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                boxShadow: filter === 'all' ? '0 10px 30px rgba(59, 130, 246, 0.2)' : 'none',
                transform: filter === 'all' ? 'translateY(-4px)' : 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Queries</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: filter === 'all' ? '#60a5fa' : '#fff' }}>{questions.length}</div>
            </div>

            <div 
              onClick={() => handleFilterClick('Pending')}
              className="glass-panel"
              style={{ 
                padding: '24px', 
                cursor: 'pointer',
                flex: 1,
                minWidth: '140px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                borderTop: filter === 'Pending' ? '4px solid #fbbf24' : '1px solid var(--glass-border)',
                background: filter === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                boxShadow: filter === 'Pending' ? '0 10px 30px rgba(245, 158, 11, 0.2)' : 'none',
                transform: filter === 'Pending' ? 'translateY(-4px)' : 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>⏳ Actionable</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: filter === 'Pending' ? '#fbbf24' : '#fff' }}>{pendingCount}</div>
            </div>

            <div 
              onClick={() => handleFilterClick('Replied')}
              className="glass-panel"
              style={{ 
                padding: '24px', 
                cursor: 'pointer',
                flex: 1,
                minWidth: '140px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                borderTop: filter === 'Replied' ? '4px solid #34d399' : '1px solid var(--glass-border)',
                background: filter === 'Replied' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                boxShadow: filter === 'Replied' ? '0 10px 30px rgba(16, 185, 129, 0.2)' : 'none',
                transform: filter === 'Replied' ? 'translateY(-4px)' : 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>✅ Resolved</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: filter === 'Replied' ? '#34d399' : '#fff' }}>{repliedCount}</div>
            </div>

            <button
              onClick={fetchQuestions}
              className="btn-glass"
              style={{ flexShrink: 0, alignSelf: 'center', height: 'fit-content' }}
            >
              🔄 Sync Inbox
            </button>
          </div>

          {/* Search and Filter */}
          <div className="glass-panel animate-fade-up delay-200" style={{ display: 'flex', gap: '16px', marginBottom: '32px', padding: '16px 24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search candidate or query payload..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </div>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ ...inputStyle, width: '200px', cursor: 'pointer', color: '#000' }}
            >
              <option value="all">All Queries</option>
              <option value="Pending">⏳ Actionable</option>
              <option value="Replied">✅ Resolved</option>
            </select>
          </div>

          {/* Questions Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-muted)' }}>Decrypting inbox payload...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="glass-panel animate-fade-up delay-300" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>📭 Inbox zero. No queries match current parameters.</p>
            </div>
          ) : (
            <div className="glass-panel animate-fade-up delay-300" style={{ overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Candidate</th>
                    <th style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Query Payload</th>
                    <th style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                    <th style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Timestamp</th>
                    <th style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q, index) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--glass-border)', background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px', marginBottom: '4px' }}>
                          {q.candidate_name || q.candidates?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--primary)' }}>
                          {q.candidates?.email || q.candidate_email}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {q.candidates?.domain || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', maxWidth: '320px' }}>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}>
                          {q.question}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: q.status === 'Replied' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: q.status === 'Replied' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${q.status === 'Replied' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {q.status === 'Replied' ? 'Resolved' : 'Actionable'}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {new Date(q.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <button
                          onClick={() => navigate(`/candidate/${q.candidate_id}`)}
                          className="btn-premium"
                          style={{ padding: '8px 16px', fontSize: '12px' }}
                        >
                          Access Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default QuestionsPage;