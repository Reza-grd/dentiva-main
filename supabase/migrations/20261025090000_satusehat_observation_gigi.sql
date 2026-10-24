-- SATUSEHAT Modul Gigi: Observation (odontogram & OHIS) ikut antrean kirim/retry satusehat_outbox.
-- Dijaga: baseline sintetis uji smoke tidak punya kolom resource_type.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'satusehat_outbox' and column_name = 'resource_type') then
    alter table public.satusehat_outbox drop constraint if exists satusehat_outbox_resource_type_check;
    alter table public.satusehat_outbox add constraint satusehat_outbox_resource_type_check
      check (resource_type = any (array['Organization', 'Location', 'Practitioner', 'Patient', 'Encounter', 'Condition',
                                        'Procedure', 'MedicationRequest', 'Composition', 'Observation']));
  end if;
end $$;
