import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AccessDenied from './AccessDenied';

import MainLayout from '../layout/MainLayout';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Memverifikasi akses..." />;
  }

  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
    // Tampilkan halaman AccessDenied yang informatif alih-alih silent redirect
    return <AccessDenied />;
  }

  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

export default ProtectedRoute;
