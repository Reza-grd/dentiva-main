import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { encryptionService } from '../services/encryptionService';
import logger from '../utils/logger';
import { useToast } from '../components/common/ToastNotification';

const AuthContext = createContext({});

/** Akun hasil pendaftaran mandiri yang belum menyelesaikan pendaftaran klinik. */
export const isPendingSignup = (user) => Boolean(user?.user_metadata?.signup_clinic);

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
  // Status akun & klinik dari RPC get_my_account_status() (lihat migration clinic_user_status).
  // Tetap terbaca walau klinik ditangguhkan, sehingga aplikasi bisa menampilkan alasannya.
  const [accountStatus, setAccountStatus] = useState(null);
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
              setAccountStatus(null);
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

  const fetchAccountStatus = async () => {
    const { data, error } = await supabase.rpc('get_my_account_status').maybeSingle();
    if (error) {
      // Fungsi belum ada (migration Console belum dijalankan) → perilaku lama.
      logger.debug('get_my_account_status unavailable:', error.message);
      return null;
    }
    return data;
  };

  const fetchUserProfile = async (userId) => {
    try {
      logger.debug('Fetching user profile for:', userId);

      const status = await fetchAccountStatus();
      setAccountStatus(status);

      if (status && ['suspended', 'deactivated'].includes(status.user_status)) {
        await supabase.auth.signOut();
        setAccountStatus(null);
        toast.error(
          status.user_status === 'suspended'
            ? 'Akun Anda sedang ditangguhkan. Silakan hubungi admin klinik.'
            : 'Akun Anda telah dinonaktifkan. Silakan hubungi admin klinik.'
        );
        throw new Error('Akun tidak aktif');
      }

      if (status && !status.has_access) {
        // Klinik tidak aktif (ditangguhkan / ditutup / menunggu aktivasi).
        // Profil tidak bisa dibaca karena RLS; App menampilkan halaman klinik tidak aktif.
        setUserProfile(null);
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error; // Lempar error agar bisa di-catch di pemanggil
      }

      if (!data) {
        // Belum terhubung ke klinik mana pun — mis. pendaftar mandiri yang baru
        // memverifikasi email. App menampilkan formulir penyelesaian pendaftaran.
        setUserProfile(null);
        return null;
      }

      if (data.status ? !['invited', 'active'].includes(data.status) : data.is_active === false) {
        await supabase.auth.signOut();
        toast.error('Akun Anda telah dinonaktifkan. Silakan hubungi administrator.');
        throw new Error('Akun dinonaktifkan');
      }

      if (data.nik) {
        try {
          const decrypted = await encryptionService.decryptBatch([data.nik]);
          data.nik = decrypted[0];
        } catch (encErr) {
          console.error('Failed to decrypt user NIK:', encErr);
        }
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
        const profile = await fetchUserProfile(data.user.id);
        if (!profile && !isPendingSignup(data.user)) {
          const status = await fetchAccountStatus();
          if (!status) throw new Error('Profil tidak ditemukan');
        }
        // Catat waktu login & ubah status 'invited' → 'active' pada login pertama.
        supabase.rpc('record_login').then(({ error: rlErr }) => {
          if (rlErr) logger.debug('record_login failed:', rlErr.message);
        });
      } catch (profileError) {
        console.error('Profile fetch failed after login:', profileError);
        // Logout dari Supabase Auth karena profil tidak tersedia
        await supabase.auth.signOut();
        throw new Error(
          profileError?.message === 'Akun tidak aktif'
            ? 'Akun Anda tidak aktif. Hubungi admin klinik.'
            : 'Akun ditemukan tapi data profil belum ada. Hubungi administrator.'
        );
      }

      return { success: true, data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pendaftaran klinik mandiri (halaman /daftar). Hanya membuat akun Auth; data
   * klinik disimpan di user_metadata.signup_clinic lalu diproses oleh RPC
   * register_clinic() SETELAH email terverifikasi (klinik berstatus 'pending'
   * sampai disetujui tim Dentiva). Staf klinik tidak mendaftar di sini —
   * mereka diundang admin klinik.
   */
  const signUpClinic = async ({ email, password, ownerName, ownerPhone, clinicName, clinicPhone, city, province }) => {
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/daftar/lanjut`,
        data: {
          full_name: ownerName,
          signup_clinic: { clinic_name: clinicName, clinic_phone: clinicPhone, city, province, owner_phone: ownerPhone },
        },
      },
    });
    if (authError) return { success: false, error: authError.message };
    // Jika konfirmasi email dinonaktifkan di Supabase, sesi langsung tersedia.
    return { success: true, needsEmailConfirmation: !data.session };
  };

  const completeClinicRegistration = async (form) => {
    const { error: rpcError } = await supabase.rpc('register_clinic', {
      p_clinic_name: form.clinicName,
      p_clinic_phone: form.clinicPhone,
      p_city: form.city || null,
      p_province: form.province || null,
      p_owner_name: form.ownerName,
      p_owner_phone: form.ownerPhone,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    // Klaim clinic_id baru ada di JWT setelah refresh.
    await supabase.auth.refreshSession();
    if (user) await fetchUserProfile(user.id);
    return { success: true };
  };

  const requestPasswordReset = async (email) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atur-password`,
    });
    return resetError ? { success: false, error: resetError.message } : { success: true };
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Cache pengaturan klinik tidak boleh terbawa ke pengguna/klinik berikutnya di komputer yang sama.
      try {
        localStorage.removeItem('clinic_settings');
        localStorage.removeItem('Dentiva_clinic_settings');
      } catch {
        /* storage tidak tersedia */
      }

      setUser(null);
      setUserProfile(null);
      setAccountStatus(null);

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
      const updatesCopy = { ...updates };
      if (updatesCopy.nik !== undefined && updatesCopy.nik !== null) {
        const encrypted = await encryptionService.encryptBatch([updatesCopy.nik]);
        updatesCopy.nik = encrypted[0];
      }
      const { error } = await supabase
        .from('users')
        .update(updatesCopy)
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

  const refreshAccountStatus = async () => {
    if (!user) return null;
    return fetchUserProfile(user.id);
  };

  const value = {
    user,
    userProfile,
    accountStatus,
    refreshAccountStatus,
    loading,
    error,
    signIn,
    signUpClinic,
    completeClinicRegistration,
    requestPasswordReset,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;