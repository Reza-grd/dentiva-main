import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // SaaS Subscription & Feature Gating State
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [features, setFeatures] = useState({});
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setSubscription(null);
      setPlan(null);
      setFeatures({});
      setLoading(false);
      setLoadingSubscription(false);
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

    const fetchSubscription = async () => {
      try {
        setLoadingSubscription(true);
        const clinicId = userProfile?.clinic_id;

        if (!clinicId) {
          setLoadingSubscription(false);
          return;
        }

        // Query clinic_subscriptions for current user's clinic
        const { data: subData, error: subErr } = await supabase
          .from('clinic_subscriptions')
          .select('*, plan:subscription_plans(*)')
          .eq('clinic_id', clinicId)
          .eq('status', 'active')
          .maybeSingle();

        if (subErr) {
          console.warn('Subscription fetch warning:', subErr.message);
        }

        if (subData && subData.plan) {
          setSubscription(subData);
          setPlan(subData.plan);
          setFeatures(subData.plan.features || {});
        } else {
          // Fallback to default Starter plan if no active subscription row exists yet
          const { data: starterPlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', 'Starter')
            .maybeSingle();

          if (starterPlan) {
            setPlan(starterPlan);
            setFeatures(starterPlan.features || {});
          }
        }
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchPermissions();
    fetchSubscription();
  }, [user, userProfile?.clinic_id]);

  const hasPermission = (permissionName) => {
    // If it's Super Admin (which we could inject into permissions context directly), return true.
    // For now, we rely strictly on the permissions array fetched from backend.
    return permissions.includes(permissionName);
  };

  /**
   * Check if a SaaS feature is enabled for the clinic's current subscription plan.
   * Features defined in subscription_plans.features JSONB (e.g. whatsapp_reminders, custom_reports).
   */
  const hasFeature = (featureName) => {
    if (!features) return false;
    return !!features[featureName];
  };

  return (
    <PermissionsContext.Provider value={{ 
      permissions, 
      hasPermission, 
      loading, 
      subscription, 
      plan, 
      features, 
      loadingSubscription, 
      hasFeature 
    }}>
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
