-- SUPABASE MIGRATION 40: ENTERPRISE RBAC (Phase 1)
-- Implements Granular Role-Based Access Control

-- 1. Create RBAC Tables
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'patient.read'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  is_revoked BOOLEAN DEFAULT FALSE, -- Allows revoking a specific permission from a role
  PRIMARY KEY (user_id, permission_id)
);

-- Note: We add a role_id to users to map them to a primary role
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- 2. Seed Permissions
INSERT INTO public.permissions (module, action, name, description) VALUES
  -- Patient
  ('patient', 'read', 'patient.read', 'Lihat data pasien'),
  ('patient', 'create', 'patient.create', 'Buat data pasien baru'),
  ('patient', 'update', 'patient.update', 'Ubah data pasien'),
  ('patient', 'delete', 'patient.delete', 'Hapus data pasien'),
  ('patient', 'export', 'patient.export', 'Ekspor data pasien'),
  -- Appointment
  ('appointment', 'read', 'appointment.read', 'Lihat jadwal kunjungan'),
  ('appointment', 'create', 'appointment.create', 'Buat jadwal kunjungan'),
  ('appointment', 'update', 'appointment.update', 'Ubah jadwal kunjungan'),
  ('appointment', 'delete', 'appointment.delete', 'Hapus jadwal kunjungan'),
  ('appointment', 'cancel', 'appointment.cancel', 'Batalkan jadwal kunjungan'),
  -- Medical Record (EMR)
  ('emr', 'read', 'emr.read', 'Lihat rekam medis'),
  ('emr', 'create', 'emr.create', 'Isi rekam medis'),
  ('emr', 'update', 'emr.update', 'Ubah rekam medis'),
  ('emr', 'delete', 'emr.delete', 'Hapus rekam medis'),
  ('emr', 'approve', 'emr.approve', 'Verifikasi rekam medis'),
  ('emr', 'export', 'emr.export', 'Ekspor rekam medis'),
  -- Financial
  ('finance', 'read', 'finance.read', 'Lihat data finansial & tagihan'),
  ('finance', 'update', 'finance.update', 'Ubah data tagihan'),
  ('finance', 'payment', 'finance.payment', 'Proses pembayaran'),
  ('finance', 'refund', 'finance.refund', 'Proses refund'),
  ('finance', 'export', 'finance.export', 'Ekspor data finansial'),
  -- Inventory
  ('inventory', 'read', 'inventory.read', 'Lihat inventaris'),
  ('inventory', 'create', 'inventory.create', 'Tambah inventaris'),
  ('inventory', 'update', 'inventory.update', 'Ubah inventaris'),
  ('inventory', 'delete', 'inventory.delete', 'Hapus inventaris'),
  -- Dashboard & Settings
  ('dashboard', 'read', 'dashboard.read', 'Lihat dashboard analitik'),
  ('settings', 'read', 'settings.read', 'Lihat pengaturan klinik'),
  ('settings', 'update', 'settings.update', 'Ubah pengaturan klinik'),
  -- User Management
  ('user', 'read', 'user.read', 'Lihat data pengguna'),
  ('user', 'create', 'user.create', 'Buat pengguna baru'),
  ('user', 'update', 'user.update', 'Ubah pengguna'),
  ('user', 'delete', 'user.delete', 'Hapus pengguna')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Super Admin', 'Full Access ke seluruh sistem', TRUE),
  ('Clinic Owner', 'Pemilik klinik, akses penuh kecuali manage Super Admin', TRUE),
  ('Manager', 'Manajer operasional klinik', TRUE),
  ('Dentist', 'Dokter gigi spesialis / umum', TRUE),
  ('Assistant', 'Asisten / Perawat gigi', TRUE),
  ('Receptionist', 'Resepsionis pendaftaran', TRUE),
  ('Cashier', 'Kasir / Keuangan', TRUE),
  ('Viewer', 'Akses read-only', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 4. Map Permissions to Roles (Stored Procedure for cleanliness)
DO $$
DECLARE
  role_super_admin UUID;
  role_owner UUID;
  role_manager UUID;
  role_dentist UUID;
  role_assistant UUID;
  role_receptionist UUID;
  role_cashier UUID;
  role_viewer UUID;
BEGIN
  SELECT id INTO role_super_admin FROM public.roles WHERE name = 'Super Admin';
  SELECT id INTO role_owner FROM public.roles WHERE name = 'Clinic Owner';
  SELECT id INTO role_manager FROM public.roles WHERE name = 'Manager';
  SELECT id INTO role_dentist FROM public.roles WHERE name = 'Dentist';
  SELECT id INTO role_assistant FROM public.roles WHERE name = 'Assistant';
  SELECT id INTO role_receptionist FROM public.roles WHERE name = 'Receptionist';
  SELECT id INTO role_cashier FROM public.roles WHERE name = 'Cashier';
  SELECT id INTO role_viewer FROM public.roles WHERE name = 'Viewer';

  -- CLEAR existing to avoid duplicates on re-run
  DELETE FROM public.role_permissions;

  -- Super Admin & Clinic Owner: ALL PERMISSIONS
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_super_admin, id FROM public.permissions;
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_owner, id FROM public.permissions WHERE name != 'user.delete'; -- Just an example exception

  -- Manager: All except some critical settings
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_manager, id FROM public.permissions 
  WHERE name NOT IN ('settings.update', 'user.delete');

  -- Dentist: Patient, Appt, EMR (no delete), no finance (except read maybe)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_dentist, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'patient.create', 'patient.update',
    'appointment.read', 'appointment.create',
    'emr.read', 'emr.create', 'emr.update', 'emr.approve',
    'dashboard.read'
  );

  -- Assistant: View appt, help EMR input
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_assistant, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'appointment.read', 
    'emr.read', 'emr.create', 'emr.update',
    'inventory.read', 'inventory.update'
  );

  -- Receptionist: Appt, Patient, basic billing read
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_receptionist, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'patient.create', 'patient.update',
    'appointment.read', 'appointment.create', 'appointment.update', 'appointment.cancel',
    'finance.read', 'dashboard.read'
  );

  -- Cashier: Finance
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_cashier, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'appointment.read',
    'finance.read', 'finance.update', 'finance.payment', 'finance.refund', 'finance.export',
    'dashboard.read'
  );

  -- Viewer: Read only
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_viewer, id FROM public.permissions 
  WHERE action = 'read';
END $$;

-- 5. Helper Function for RLS
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check user_permissions explicitly granted
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = FALSE
  ) INTO v_has_access;

  IF v_has_access THEN RETURN TRUE; END IF;

  -- Check user_permissions explicitly revoked (overrides role)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check role_permissions
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.uid() AND p.name = p_permission_name
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Migrate Existing Users
DO $$
DECLARE
  role_manager UUID;
  role_dentist UUID;
  role_receptionist UUID;
  role_cashier UUID;
BEGIN
  SELECT id INTO role_manager FROM public.roles WHERE name = 'Manager';
  SELECT id INTO role_dentist FROM public.roles WHERE name = 'Dentist';
  SELECT id INTO role_receptionist FROM public.roles WHERE name = 'Receptionist';
  SELECT id INTO role_cashier FROM public.roles WHERE name = 'Cashier';

  -- Map old string roles to new UUID roles
  UPDATE public.users SET role_id = role_manager WHERE role = 'admin' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_dentist WHERE role = 'dokter' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_receptionist WHERE role = 'resepsionis' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_cashier WHERE role = 'kasir' AND role_id IS NULL;
  
  -- Fallback for any unknown role
  UPDATE public.users SET role_id = role_receptionist WHERE role_id IS NULL;
END $$;

-- 7. RPC to fetch permissions for frontend
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name::VARCHAR
  FROM public.users u
  JOIN public.role_permissions rp ON rp.role_id = u.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() AND up.permission_id = p.id AND up.is_revoked = TRUE
  )
  UNION
  SELECT p.name::VARCHAR
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = auth.uid() AND up.is_revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

