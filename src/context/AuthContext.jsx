import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Create the context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  // State variables
  const [hrUser, setHrUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Check for existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  // Auto-extend session on user activity (optional - keeps session alive)
  useEffect(() => {
    if (!hrUser) return;

    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem('lastActivity', now.toString());
      
      // If session is about to expire, auto-extend it
      if (sessionExpiry) {
        const timeRemaining = sessionExpiry - now;
        // If less than 30 minutes remaining, auto-extend
        if (timeRemaining < 30 * 60 * 1000 && timeRemaining > 0) {
          const newExpiry = now + (8 * 60 * 60 * 1000);
          localStorage.setItem('sessionExpiry', newExpiry.toString());
          setSessionExpiry(newExpiry);
          setSessionWarning(false);
          console.log('🔄 Session auto-extended due to activity');
        }
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [hrUser, sessionExpiry]);

  // Function to check if user is already logged in
  async function checkSession() {
    try {
      // Check if we have stored user data
      const storedEmail = localStorage.getItem('hrEmail');
      const storedRole = localStorage.getItem('userRole');
      const storedName = localStorage.getItem('userName');
      const storedTeam = localStorage.getItem('userTeam');
      const storedExpiry = localStorage.getItem('sessionExpiry');

      console.log('🔍 Session check:', { storedEmail, storedRole, storedName });

      if (storedEmail && storedRole) {
        // Check session expiry - but DON'T auto-logout
        if (storedExpiry) {
          const expiryTime = parseInt(storedExpiry);
          const now = Date.now();
          
          if (now > expiryTime) {
            // Session expired - show warning but KEEP the user logged in
            console.log('⚠️ Session expired, but keeping user logged in');
            setSessionWarning(true);
            setSessionExpiry(expiryTime);
          } else {
            setSessionExpiry(expiryTime);
            setSessionWarning(false);
          }
        }

        // Try to verify user in database
        const { data: user, error } = await supabase
          .from('hr_users')
          .select('*')
          .eq('email', storedEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && user) {
          setHrUser(user);
          setUserRole(user.role);
          // Use stored name if available, fallback to user.name
          const name = storedName || user.name || user.email?.split('@')[0] || 'HR User';
          setUserName(name);
          setUserTeam(user.team || 'leadership');
          
          // Ensure localStorage has the name
          if (!storedName) {
            localStorage.setItem('userName', name);
          }
          console.log('✅ Session restored for:', name);
        } else {
          // User not found in DB, but keep the session data anyway
          console.log('⚠️ User not found in DB, but keeping local session');
          setUserRole(storedRole);
          setUserName(storedName || storedEmail.split('@')[0]);
          setUserTeam(storedTeam || 'leadership');
          setHrUser({ 
            email: storedEmail, 
            name: storedName || storedEmail.split('@')[0],
            role: storedRole,
            team: storedTeam || 'leadership'
          });
        }
      } else {
        console.log('ℹ️ No session found');
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Don't clear session on error - keep user logged in
    } finally {
      setLoading(false);
    }
  }

  // Clear all session data (only called on explicit logout)
  function clearSession() {
    console.log('🗑️ Clearing session...');
    localStorage.removeItem('hrEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userTeam');
    localStorage.removeItem('panelistName');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('lastActivity');
    setHrUser(null);
    setUserRole(null);
    setUserName(null);
    setUserTeam(null);
    setSessionExpiry(null);
    setSessionWarning(false);
  }

  // Login function
  async function login(email) {
    try {
      setLoading(true);
      console.log('🔑 Logging in:', email);
      
      // Check if user exists in hr_users table
      const { data: user, error } = await supabase
        .from('hr_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw new Error('Database error: ' + error.message);
      }

      if (!user) {
        throw new Error('User not found or inactive. Please contact admin.');
      }

      // Determine role and team based on email if not set in DB
      let role = user.role;
      let team = user.team || 'leadership';
      let name = user.name || user.email?.split('@')[0] || 'HR User';

      // Set session expiry - 8 hours from now
      const expiry = Date.now() + (8 * 60 * 60 * 1000);

      // ===== Store in localStorage =====
      localStorage.setItem('hrEmail', user.email);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name);
      localStorage.setItem('userTeam', team);
      localStorage.setItem('panelistName', user.panelist_name || name);
      localStorage.setItem('sessionExpiry', expiry.toString());
      localStorage.setItem('lastActivity', Date.now().toString());

      console.log('✅ Login successful:', { email: user.email, role, name });

      // Update state
      setHrUser(user);
      setUserRole(role);
      setUserName(name);
      setUserTeam(team);
      setSessionExpiry(expiry);
      setSessionWarning(false);

      return user;

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // Quick login for development (bypasses DB check)
  function quickLogin(email, name, role, team) {
    console.log('⚡ Quick login:', { email, name, role, team });
    
    // Set session expiry - 8 hours from now
    const expiry = Date.now() + (8 * 60 * 60 * 1000);
    
    localStorage.setItem('hrEmail', email);
    localStorage.setItem('userRole', role || 'hr');
    localStorage.setItem('userName', name || email.split('@')[0]);
    localStorage.setItem('userTeam', team || 'leadership');
    localStorage.setItem('panelistName', name || email.split('@')[0]);
    localStorage.setItem('sessionExpiry', expiry.toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    
    setUserRole(role || 'hr');
    setUserName(name || email.split('@')[0]);
    setUserTeam(team || 'leadership');
    setHrUser({ email, name, role, team });
    setSessionExpiry(expiry);
    setSessionWarning(false);
  }

  // Extend session manually
  function extendSession() {
    const expiry = Date.now() + (8 * 60 * 60 * 1000);
    localStorage.setItem('sessionExpiry', expiry.toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    setSessionExpiry(expiry);
    setSessionWarning(false);
    console.log('🔄 Session extended for another 8 hours');
  }

  // Logout function - ONLY called when user clicks logout
  function logout() {
    clearSession();
  }

  // Check if session is expired (just for display purposes)
  function isSessionExpired() {
    if (!sessionExpiry) return false;
    return Date.now() > sessionExpiry;
  }

  // Helper functions for role checks
  const isHR = userRole === 'super_admin' || 
               userRole === 'hr_lead' || 
               userRole === 'project_manager' || 
               userRole === 'assignment_team' || 
               userRole === 'scheduling_team';

  const isAdmin = userRole === 'super_admin' || 
                  userRole === 'hr_lead' || 
                  userRole === 'project_manager';

  const isPanelist = userRole === 'panelist' || 
                     userRole === 'r1_panelist' || 
                     userRole === 'r2_panelist';

  const isSuperAdmin = userRole === 'super_admin';

  const isHRLead = userRole === 'hr_lead';

  const isProjectManager = userRole === 'project_manager';

  const isAssignmentTeam = userRole === 'assignment_team';

  const isSchedulingTeam = userRole === 'scheduling_team';

  const isR1Panelist = userRole === 'r1_panelist';
  const isR2Panelist = userRole === 'r2_panelist';

  // Context value object
  const value = {
    // State
    hrUser,
    userRole,
    userName,
    userTeam,
    loading,
    sessionExpiry,
    sessionWarning,
    
    // Functions
    login,
    quickLogin,
    logout,
    clearSession,
    checkSession,
    extendSession,
    isSessionExpired,
    
    // Role checks
    isHR,
    isAdmin,
    isPanelist,
    isSuperAdmin,
    isHRLead,
    isProjectManager,
    isAssignmentTeam,
    isSchedulingTeam,
    isR1Panelist,
    isR2Panelist,
    
    // Helper to check specific permission
    hasRole: (role) => userRole === role,
    hasAnyRole: (roles) => roles.includes(userRole),
    isInTeam: (team) => userTeam === team
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;