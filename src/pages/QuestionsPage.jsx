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

  return (
    <div style={{ padding: '30px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Back Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: '700' }}>💬 Candidate Questions</h1>
          <div style={{ width: '150px' }}></div>
        </div>

        {/* Clickable KPI Cards */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div 
            onClick={() => handleFilterClick('all')}
            style={{ 
              background: filter === 'all' ? '#eff6ff' : '#fff', 
              padding: '14px 24px', 
              borderRadius: '12px', 
              border: filter === 'all' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              cursor: 'pointer',
              flex: 1,
              minWidth: '140px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              boxShadow: filter === 'all' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>{questions.length}</div>
          </div>

          <div 
            onClick={() => handleFilterClick('Pending')}
            style={{ 
              background: filter === 'Pending' ? '#fffbeb' : '#fff', 
              padding: '14px 24px', 
              borderRadius: '12px', 
              border: filter === 'Pending' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              cursor: 'pointer',
              flex: 1,
              minWidth: '140px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              boxShadow: filter === 'Pending' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏳ Pending</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#92400e' }}>{pendingCount}</div>
          </div>

          <div 
            onClick={() => handleFilterClick('Replied')}
            style={{ 
              background: filter === 'Replied' ? '#f0fdf4' : '#fff', 
              padding: '14px 24px', 
              borderRadius: '12px', 
              border: filter === 'Replied' ? '2px solid #22c55e' : '1px solid #e2e8f0',
              cursor: 'pointer',
              flex: 1,
              minWidth: '140px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              boxShadow: filter === 'Replied' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Replied</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#166534' }}>{repliedCount}</div>
          </div>

          <button
            onClick={fetchQuestions}
            style={{ 
              padding: '8px 16px', 
              background: '#e2e8f0', 
              color: '#475569', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              alignSelf: 'center',
              height: 'fit-content',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#cbd5e1'}
            onMouseLeave={(e) => e.target.style.background = '#e2e8f0'}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by question or candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: '100%',
                padding: '10px 16px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '14px',
                backgroundColor: '#ffffff',
                color: '#1a202c',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ 
              padding: '10px 16px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              background: '#fff',
              fontSize: '14px',
              color: '#1a202c',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Questions</option>
            <option value="Pending">⏳ Pending</option>
            <option value="Replied">✅ Replied</option>
          </select>
        </div>

        {/* Questions Table */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</p>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#94a3b8', fontSize: '16px' }}>No questions found</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', color: '#042e69', fontWeight: '600' }}>Candidate</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', color: '#042e69', fontWeight: '600' }}>Question</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', color: '#042e69', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', color: '#042e69', fontWeight: '600' }}>Asked</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', color: '#042e69', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: '500', color: '#020a14', fontSize: '14px' }}>
                        {q.candidate_name || q.candidates?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#020a14' }}>
                        {q.candidates?.email || q.candidate_email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#020a14' }}>
                        {q.candidates?.domain || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', maxWidth: '320px' }}>
                      <div style={{ fontSize: '14px', color: '#020a14', lineHeight: '1.4' }}>
                        {q.question}
                      </div>
                      {/* ✅ REMOVED: 💬 1 reply(ies) */}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: q.status === 'Replied' ? '#dcfce7' : '#fef3c7',
                        color: q.status === 'Replied' ? '#166534' : '#92400e'
                      }}>
                        {q.status === 'Replied' ? ' Replied' : ' Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#020a14' }}>
                      {new Date(q.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={() => navigate(`/candidate/${q.candidate_id}`)}
                        style={{
                          padding: '6px 14px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        View Candidate
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
  );
}

export default QuestionsPage;