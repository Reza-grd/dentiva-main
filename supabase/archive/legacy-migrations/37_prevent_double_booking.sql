-- SUPABASE MIGRATION 37: PREVENT DOUBLE BOOKING
-- Resolves BUS-001 by enforcing a unique constraint on active appointments.

-- Create a unique index for (dokter_id, tanggal_kunjungan, jam_kunjungan)
-- only for visits that are NOT cancelled, ensuring a doctor cannot have 
-- two active appointments at the exact same time slot.
CREATE UNIQUE INDEX IF NOT EXISTS visits_unique_slot_idx 
ON public.visits (dokter_id, tanggal_kunjungan, jam_kunjungan) 
WHERE status != 'cancelled';
