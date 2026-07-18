import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';
import { useToast } from '../components/common/ToastNotification';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    // BUG FIX: Gunakan object sebagai "ref" agar nilai terbaru selalu terbaca
    // di dalam closure onAuthStateChange tanpa stale closure problem.
    const state = { isInitialLoad: true };

    const initializeAuth = async () => {
      try {
        logger.debug('🔍 Checking user session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        if (session?.user && mounted) {
          logger.debug('✅ User found');
          setUser(session.user);
          state.currentUserId = session.user.id;
          await fetchUserProfile(session.user.id);
        } else {
          logger.debug('ℹ️ No active session');
        }
      } catch (err) {
        console.error('❌ Initialization error:', err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) {
          logger.debug('✅ Initial load complete, setting loading to false');
          setLoading(false);
          state.isInitialLoad = false; // Tandai initial load sudah selesai
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state changed:', event);
        
        // Skip jika masih initial load untuk menghindari race condition
        if (state.isInitialLoad) {
          logger.debug('⏭️ Skipping auth change during initial load');
          return;
        }

        // BUG FIX: Skip INITIAL_SESSION event — sudah ditangani oleh getSession()
        // di initializeAuth(). Tanpa ini, INITIAL_SESSION bisa memicu double-fetch.
        if (event === 'INITIAL_SESSION') {
          logger.debug('⏭️ Skipping INITIAL_SESSION event (handled by getSession)');
          return;
        }

        const sessionUserId = session?.user?.id || null;
        const prevUserId = state.currentUserId || null;

        if (sessionUserId === prevUserId && sessionUserId !== null) {
          logger.debug('⏭️ User ID is unchanged. Skipping loading screen and profile refetch.');
          if (mounted && session?.user) {
            setUser(session.user);
          }
          return;
        }

        try {
          if (mounted) setLoading(true); // Set loading saat ada perubahan auth
          
          if (session?.user) {
            if (mounted) {
              setUser(session.user);
              state.currentUserId = session.user.id;
              await fetchUserProfile(session.user.id);
            }
          } else {
            if (mounted) {
              setUser(null);
              setUserProfile(null);
              state.currentUserId = null;
            }
          }
        } catch (error) {
          console.error('Auth change processing error:', error);
          if (mounted) setError(error.message);
        } finally {
          if (mounted) {
            logger.debug('✅ Auth state change processed, setting loading to false');
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Monitor aktivitas untuk automatic session inactivity timeout (15 menit)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 menit
    let timeoutId;

    const logoutUser = async () => {
      logger.info('🔄 Session timeout due to inactivity');
      await signOut();
      toast.warning('Sesi Anda telah berakhir karena tidak ada aktivitas.');
    };

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
    };

    // Event listeners untuk mendeteksi aktivitas pengguna
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const setupListeners = () => {
      events.forEach(event => {
        window.addEventListener(event, resetTimeout);
      });
    };

    const removeListeners = () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };

    setupListeners();
    resetTimeout(); // Mulai timeout awal

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      removeListeners();
    };
  }, [user]);

  const fetchUserProfile = async (userId) => {
    try {
      logger.debug('Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error; // Lempar error agar bisa di-catch di pemanggil
      }

      if (data.is_active === false) {
        await supabase.auth.signOut();
        toast.error('Akun Anda telah dinonaktifkan. Silakan hubungi administrator.');
        throw new Error('Akun dinonaktifkan');
      }
      
      logger.debug('✅ Profile loaded');
      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error; // Penting untuk melempar error
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // BUG FIX: fetchUserProfile bisa throw jika profil belum ada di tabel users.
      // Tangkap error agar loading tidak stuck di true, dan kembalikan error ke caller.
      try {
        await fetchUserProfile(data.user.id);
      } catch (profileError) {
        console.error('Profile fetch failed after login:', profileError);
        // Logout dari Supabase Auth karena profil tidak tersedia
        await supabase.auth.signOut();
        throw new Error('Akun ditemukan tapi data profil belum ada. Hubungi administrator.');
      }

      return { success: true, data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: email,
            full_name: userData.full_name,
            role: userData.role || 'resepsionis',
            phone: userData.phone || null,
          },
        ]);

      if (profileError) throw profileError;

      return { success: true, data: authData };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserProfile(null);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await fetchUserProfile(user.id);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;