import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ central storage sync helper
  const syncStorage = (sessionData) => {
    if (sessionData?.access_token) {
      localStorage.setItem('auth_token', sessionData.access_token);
      localStorage.setItem('auth_user', JSON.stringify(sessionData.user));
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  };

  // Check if user is logged in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user || null);
        syncStorage(currentSession);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // ✅ Listen for auth changes (no unnecessary async)
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      syncStorage(newSession);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email, password, fullName, region) => {
    try {
      setError(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            region: region
          }
        }
      });

      if (signUpError) throw signUpError;

      // wait for OTP verification — do NOT set session here
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (signInError) throw signInError;

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      syncStorage(null);
      setUser(null);
      setSession(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,

    // ✅ more robust than !!user
    isAuthenticated: !!session
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};