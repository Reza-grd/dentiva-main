import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

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
const TreatmentMaster = lazy(() => import('./components/treatments/TreatmentMaster'));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const ProfilePage = lazy(() => import('./components/profile/ProfilePage'));
const DoctorProfilePage = lazy(() => import('./components/profile/DoctorProfilePage'));
const SchedulePage = lazy(() => import('./components/schedule/SchedulePage'));
const VisitHistory = lazy(() => import('./components/schedule/VisitHistory'));
const DoctorSchedulePage = lazy(() => import('./components/schedule/DoctorSchedulePage'));
const QueueDisplay = lazy(() => import('./components/queue/QueueDisplay'));
const AuditLogPage = lazy(() => import('./components/admin/AuditLogPage'));
const UserManagementPage = lazy(() => import('./components/admin/UserManagementPage'));

function App() {
  const { loading, user, userProfile, signOut } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (user && !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Gagal Memuat Profil</h2>
          <p className="text-gray-600 mb-6">
            Koneksi ke database bermasalah atau data profil belum lengkap.
            <br />
            <span className="text-xs text-gray-400">ID: {user.id}</span>
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Coba Lagi
            </button>
            <button 
              onClick={signOut} 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Logout
            </button>
          </div>
        </div>
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
        <Routes>
          {/* Public Queue Display — for TV in waiting room */}
          <Route path="/queue-display" element={<QueueDisplay />} />

          <Route path="/login" element={<LoginPage />} />
          
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

          {/* TODO: Saat ini Transaksi sengaja memakai komponen PaymentList yang sama dengan Pembayaran sebagai perbaikan sementara. Jika secara bisnis keduanya harus dibedakan, maka ganti komponen di sini nantinya. */}
          <Route path="/admin/transaksi" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PaymentList />
            </ProtectedRoute>
          } />

          <Route path="/admin/treatments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TreatmentMaster />
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

          <Route path="/resepsionis/transaksi" element={
            <ProtectedRoute allowedRoles={['resepsionis', 'admin']}>
              <PaymentList />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;