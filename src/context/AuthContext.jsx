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

  // Auto-extend session on user activity
  useEffect(() => {
    if (!hrUser) return;

    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem('lastActivity', now.toString());
      
      if (sessionExpiry) {
        const timeRemaining = sessionExpiry - now;
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
      const storedEmail = localStorage.getItem('hrEmail');
      const storedRole = localStorage.getItem('userRole');
      const storedName = localStorage.getItem('userName');
      const storedTeam = localStorage.getItem('userTeam');
      const storedExpiry = localStorage.getItem('sessionExpiry');

      console.log('🔍 Session check:', { storedEmail, storedRole, storedName });

      if (storedEmail && storedRole) {
        if (storedExpiry) {
          const expiryTime = parseInt(storedExpiry);
          const now = Date.now();
          
          if (now > expiryTime) {
            console.log('⚠️ Session expired, but keeping user logged in');
            setSessionWarning(true);
            setSessionExpiry(expiryTime);
          } else {
            setSessionExpiry(expiryTime);
            setSessionWarning(false);
          }
        }

        const { data: user, error } = await supabase
          .from('hr_users')
          .select('*')
          .eq('email', storedEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && user) {
          setHrUser(user);
          setUserRole(user.role);
          const name = storedName || user.name || user.email?.split('@')[0] || 'HR User';
          setUserName(name);
          setUserTeam(user.team || 'leadership');
          
          if (!storedName) {
            localStorage.setItem('userName', name);
          }
          console.log('✅ Session restored for:', name);
        } else {
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
    } finally {
      setLoading(false);
    }
  }

  // Clear all session data
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

  // Login function - FIXED: Removed supabase.sql
  async function login(email, password) {
    try {
      setLoading(true);
      console.log('🔑 Logging in:', email);
      
      // First, authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Check if user exists in hr_users but not in auth
        const { data: hrUserCheck, error: hrCheckError } = await supabase
          .from('hr_users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .maybeSingle();

        if (hrUserCheck && !hrCheckError) {
          // User exists in hr_users but not in auth - create auth user
          console.log('🔄 User exists in hr_users but not in auth. Creating auth user...');
          
          const { data: newAuthUser, error: createError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: hrUserCheck.name,
                role: hrUserCheck.role
              }
            }
          });

          if (!createError && newAuthUser.user) {
            console.log('✅ Auth user created successfully');
            // Try login again
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (!retryError) {
              // Continue with successful login
              return await completeLogin(retryData.user, email);
            }
          }
        }
        
        throw new Error('Invalid credentials: ' + authError.message);
      }

      return await completeLogin(authData.user, email);

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }

  // Helper function to complete login after authentication
  async function completeLogin(authUser, email) {
    try {
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

      // FIXED: Get current login_count and increment it
      const currentCount = user.login_count || 0;
      
      // Update last_login and login_count
      await supabase
        .from('hr_users')
        .update({
          last_login: new Date().toISOString(),
          login_count: currentCount + 1
        })
        .eq('id', user.id);

      // Log to audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'hr_users',
          record_id: user.id,
          action: 'login',
          new_data: { 
            login_time: new Date().toISOString(),
            user_name: user.name,
            user_email: user.email,
            user_role: user.role
          },
          performed_by: user.email
        });

      // Determine role and team
      let role = user.role;
      let team = user.team || 'leadership';
      let name = user.name || user.email?.split('@')[0] || 'HR User';

      // Set session expiry - 8 hours from now
      const expiry = Date.now() + (8 * 60 * 60 * 1000);

      // Store in localStorage
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

      return { success: true, user };

    } catch (error) {
      console.error('Complete login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Quick login for development (bypasses DB check)
  function quickLogin(email, name, role, team) {
    console.log('⚡ Quick login:', { email, name, role, team });
    
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

  // Logout function
  async function logout() {
    if (hrUser) {
      try {
        await supabase
          .from('audit_logs')
          .insert({
            table_name: 'hr_users',
            record_id: hrUser.id,
            action: 'logout',
            new_data: { 
              logout_time: new Date().toISOString(),
              user_name: hrUser.name,
              user_email: hrUser.email
            },
            performed_by: hrUser.email
          });
      } catch (error) {
        console.error('Error logging logout:', error);
      }
    }
    
    await supabase.auth.signOut();
    clearSession();
  }

  // Check if session is expired
  function isSessionExpired() {
    if (!sessionExpiry) return false;
    return Date.now() > sessionExpiry;
  }

  // Check if user can register other users
  function canRegisterUsers() {
    const allowedRoles = ['hr_lead', 'project_manager'];
    return userRole && allowedRoles.includes(userRole);
  }

  // Register a new user
  async function registerUser(userData) {
    try {
      if (!canRegisterUsers()) {
        throw new Error('You do not have permission to register users. Only HR Lead and Project Manager can register.');
      }

      const { email, name, role, team } = userData;

      const { data: existingUser, error: checkError } = await supabase
        .from('hr_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        throw new Error('Error checking existing user: ' + checkError.message);
      }

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      });

      if (authError) {
        throw new Error('Auth error: ' + authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      const { data: hrUser, error: hrError } = await supabase
        .from('hr_users')
        .insert({
          id: authData.user.id,
          email: email,
          name: name,
          role: role || 'panelist',
          team: team || 'panel_r1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (hrError) {
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error('Error rolling back auth user:', deleteError);
        }
        throw new Error('HR user creation error: ' + hrError.message);
      }

      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'hr_users',
          record_id: hrUser.id,
          action: 'create_user',
          new_data: {
            email,
            name,
            role,
            team,
            created_by: hrUser?.email || 'system'
          },
          performed_by: hrUser?.email || 'system'
        });

      return { 
        success: true, 
        user: hrUser,
        tempPassword: tempPassword,
        message: `User registered successfully! Temporary password: ${tempPassword}`
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
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
    
    // Registration functions
    canRegisterUsers,
    registerUser,
    
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