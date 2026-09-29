import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth, isPendingSignup } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import SetPasswordPage from './components/auth/SetPasswordPage';
import ClinicUnavailable from './components/auth/ClinicUnavailable';
import CompleteRegistration from './components/auth/CompleteRegistration';
import RegisterClinicPage from './components/auth/RegisterClinicPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@dentiva/ui';
import { Button } from '@dentiva/ui';

const AdminDashboard = lazy(() => import('./components/dashboard/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./components/dashboard/DoctorDashboard'));
const ReceptionistDashboard = lazy(() => import('./components/dashboard/ReceptionistDashboard'));
const PatientRegistration = lazy(() => import('./components/patient/PatientRegistration'));
const PatientList = lazy(() => import('./components/patient/PatientList'));
const PatientDetail = lazy(() => import('./components/patient/PatientDetail'));
const MedicalRecordForm = lazy(() => import('./components/medical-record/MedicalRecordForm'));
const MedicalRecordList = lazy(() => import('./components/medical-record/MedicalRecordList'));
const PaymentForm = lazy(() => import('./components/payment/PaymentForm'));
const PaymentList = lazy(() => import('./components/payment/PaymentList'));
const FinancialDashboard = lazy(() => import('./components/financial/FinancialDashboard'));
const CostingDashboard = lazy(() => import('./components/costing/CostingDashboard'));
const TreatmentMaster = lazy(() => import('./components/treatments/TreatmentMaster'));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ProfilePage = lazy(() => import('./components/profile/ProfilePage'));
const DoctorProfilePage = lazy(() => import('./components/profile/DoctorProfilePage'));
const SchedulePage = lazy(() => import('./components/schedule/SchedulePage'));
const VisitHistory = lazy(() => import('./components/schedule/VisitHistory'));
const DoctorSchedulePage = lazy(() => import('./components/schedule/DoctorSchedulePage'));
const QueueDisplay = lazy(() => import('./components/queue/QueueDisplay'));
const AuditLogPage = lazy(() => import('./components/admin/AuditLogPage'));
const UserManagementPage = lazy(() => import('./components/admin/UserManagementPage'));

function App() {
  const { loading, user, userProfile, accountStatus, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Tautan undangan / reset password: boleh dibuka sebelum profil termuat.
  if (location.pathname === '/atur-password') {
    return <SetPasswordPage />;
  }

  // Klinik ditangguhkan / ditutup / belum aktif (dikelola dari Dentiva Console).
  if (user && accountStatus && !accountStatus.has_access) {
    return <ClinicUnavailable />;
  }

  // Pendaftar mandiri yang sudah verifikasi email tapi belum mengirim data klinik.
  if (user && !userProfile && !accountStatus && isPendingSignup(user)) {
    return <CompleteRegistration />;
  }

  if (user && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#0B0F17] p-4 transition-colors duration-300">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[var(--color-accent)]/10 blur-[60px]" />
        <div className="absolute -bottom-15 -left-10 w-60 h-60 rounded-full bg-[var(--color-accent-secondary)]/10 blur-[50px]" />
        
        <Card className="w-full max-w-md relative z-10">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="text-red-500 dark:text-red-400" size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Gagal Memuat Profil</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Koneksi ke database bermasalah atau data profil belum lengkap. Silakan hubungi admin atau coba lagi beberapa saat lagi.
            </p>
            
            <div className="w-full bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-6 text-left">
              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">User ID Debug</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">{user.id}</span>
            </div>
            
            <div className="flex gap-3 w-full">
              <Button 
                onClick={() => window.location.reload()} 
                variant="primary"
                className="flex-1"
              >
                Coba Lagi
              </Button>
              <Button 
                onClick={signOut} 
                variant="outline"
                className="flex-1"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDefaultRoute = () => {
    if (!userProfile) return '/login';
    
    switch (userProfile.role) {
      case 'admin':
        return '/admin';
      case 'dokter':
        return '/dokter';
      case 'resepsionis':
        return '/resepsionis';
      default:
        return '/login';
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          {/* Layar antrean TV (tanpa login): token dibuat admin di Pengaturan → Layar Antrean TV.
              /queue-display lama tanpa token menampilkan petunjuk membuat tautan. */}
          <Route path="/antrean/:token" element={<QueueDisplay />} />
          <Route path="/queue-display" element={<QueueDisplay />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/daftar" element={user ? <Navigate to="/" replace /> : <RegisterClinicPage />} />
          
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dokter/*" element={
            <ProtectedRoute allowedRoles={['dokter', 'admin']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/*" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          } />

          <Route path="/pasien" element={
            <ProtectedRoute>
              <PatientList />
            </ProtectedRoute>
          } />

          <Route path="/pasien/daftar" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <PatientRegistration />
            </ProtectedRoute>
          } />

          <Route path="/pasien/:patientId" element={
            <ProtectedRoute allowedRoles={['dokter', 'resepsionis', 'admin']}>
              <PatientDetail />
            </ProtectedRoute>
          } />

          <Route path="/pasien/:patientId/kunjungan" element={
            <ProtectedRoute allowedRoles={['dokter', 'resepsionis', 'admin']}>
              <VisitHistory />
            </ProtectedRoute>
          } />

          <Route path="/rekam-medis/:patientId" element={
            <ProtectedRoute allowedRoles={['dokter']}>
              <MedicalRecordForm />
            </ProtectedRoute>
          } />

          <Route path="/pembayaran/:visitId" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <PaymentForm />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/pembayaran/:visitId" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <PaymentForm />
            </ProtectedRoute>
          } />

          <Route path="/keuangan" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <FinancialDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/pembayaran" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PaymentList />
            </ProtectedRoute>
          } />

          {/* Transaksi dulu duplikat Pembayaran; alamat lama dialihkan agar bookmark tetap jalan. */}
          <Route path="/admin/transaksi" element={<Navigate to="/admin/pembayaran" replace />} />

          <Route path="/admin/treatments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TreatmentMaster />
            </ProtectedRoute>
          } />

          <Route path="/admin/costing" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CostingDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/laporan" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/pengaturan" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/pengguna" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/audit-log" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogPage />
            </ProtectedRoute>
          } />

          <Route path="/profil" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/pengaturan" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="/pricing" element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/jadwal-dokter" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DoctorSchedulePage />
            </ProtectedRoute>
          } />

          <Route path="/admin/jadwal" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SchedulePage />
            </ProtectedRoute>
          } />

          <Route path="/dokter/jadwal" element={
            <ProtectedRoute allowedRoles={['dokter', 'admin']}>
              <SchedulePage />
            </ProtectedRoute>
          } />

          <Route path="/dokter/rekam-medis" element={
            <ProtectedRoute allowedRoles={['dokter']}>
              <MedicalRecordList />
            </ProtectedRoute>
          } />

          <Route path="/dokter/profil-dokter" element={
            <ProtectedRoute allowedRoles={['dokter']}>
              <DoctorProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/dokter/kunjungan" element={
            <ProtectedRoute allowedRoles={['dokter', 'admin']}>
              <VisitHistory />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/kunjungan" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <VisitHistory />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/jadwal" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <SchedulePage />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/pembayaran" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <PaymentList />
            </ProtectedRoute>
          } />

          <Route path="/resepsionis/transaksi" element={<Navigate to="/resepsionis/pembayaran" replace />} />

          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;