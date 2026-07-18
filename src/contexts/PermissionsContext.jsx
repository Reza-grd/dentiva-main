import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        // We call an RPC function to fetch the flat list of permission names for the current user
        const { data, error } = await supabase.rpc('get_my_permissions');
        if (!error && data) {
          setPermissions(data.map(p => p.permission_name));
        }
      } catch (err) {
        console.error('Failed to fetch permissions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permissionName) => {
    // If it's Super Admin (which we could inject into permissions context directly), return true.
    // For now, we rely strictly on the permissions array fetched from backend.
    return permissions.includes(permissionName);
  };

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionsProvider');
  }
  return context;
};
