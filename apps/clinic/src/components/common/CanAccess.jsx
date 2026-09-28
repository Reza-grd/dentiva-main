import React from 'react';
import { usePermission } from '../../contexts/PermissionsContext';

/**
 * Component to conditionally render UI based on RBAC permissions.
 * 
 * @param {string} action - The required permission name (e.g. 'emr.delete')
 * @param {ReactNode} children - Content to render if permission is granted
 * @param {ReactNode} fallback - Content to render if permission is denied (optional)
 */
const CanAccess = ({ action, children, fallback = null }) => {
  const { hasPermission, loading } = usePermission();

  if (loading) return null; // Or a skeleton loader if preferred

  if (hasPermission(action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default CanAccess;
