import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './components/dashboard/AdminDashboard';
import DoctorDashboard from './components/dashboard/DoctorDashboard';
import ReceptionistDashboard from './components/dashboard/ReceptionistDashboard';
import PatientRegistration from './components/patient/PatientRegistration';
import PatientList from './components/patient/PatientList';
import PatientDetail from './components/patient/PatientDetail';
import MedicalRecordForm from './components/medical-record/MedicalRecordForm';
import MedicalRecordList from './components/medical-record/MedicalRecordList';
import PaymentForm from './components/payment/PaymentForm';
import PaymentList from './components/payment/PaymentList';
import FinancialDashboard from './components/financial/FinancialDashboard';
import TreatmentMaster from './components/treatments/TreatmentMaster';
import ReportsPage from './components/reports/ReportsPage';
import SettingsPage from './components/settings/SettingsPage';
import ProfilePage from './components/profile/ProfilePage';
import DoctorProfilePage from './components/profile/DoctorProfilePage';
import SchedulePage from './components/schedule/SchedulePage';
import VisitHistory from './components/schedule/VisitHistory';
import DoctorSchedulePage from './components/schedule/DoctorSchedulePage';
import LoadingSpinner from './components/common/LoadingSpinner';

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
    <Routes>
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

      {/* BUG-H3 FIX: Komentar dipindah ke luar element */}
      <Route path="/pasien/:patientId" element={
        <ProtectedRoute allowedRoles={['dokter', 'resepsionis', 'admin']}>
          <PatientDetail />
        </ProtectedRoute>
      } />

      {/* FIX Bug #5: Komentar dipindah ke luar element */}
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
  );
}

export default App;