import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HRAdminDashboard from './pages/HRAdminDashboard';
import CandidateDetailsPage from './pages/CandidateDetailsPage';
import CandidatePortalPage from './pages/CandidatePortalPage';
import QuestionsPage from './pages/QuestionsPage';
import HRLogin from './components/HRLogin';
import HRAdminAnalytics from './components/HRAdminAnalytics';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* EXISTING ROUTES - UNCHANGED */}
          <Route path="/" element={<HRAdminDashboard />} />
          <Route path="/candidate/:id" element={<CandidateDetailsPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/login" element={<CandidatePortalPage />} />
          <Route path="/portal" element={<CandidatePortalPage />} />
          
          {/* NEW ROUTES */}
          <Route path="/hr-login" element={<HRLogin />} />
          <Route path="/analytics" element={<HRAdminAnalytics />} />
          
          {/* 404 Fallback - UNCHANGED */}
          <Route path="*" element={
            <div style={{ 
              padding: '50px', 
              textAlign: 'center', 
              fontFamily: 'sans-serif', 
              color: '#64748b' 
            }}>
              <h2>404: Page Not Found</h2>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;