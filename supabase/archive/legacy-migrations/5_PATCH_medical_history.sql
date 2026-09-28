-- PATCH: Update medical_history table with new diseases and konsumsi_obat field
-- File: 5_PATCH_medical_history.sql

-- Alter table medical_history to add new columns if they do not exist
DO $$
BEGIN
    -- Add boolean columns for newly added diseases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='stroke') THEN
        ALTER TABLE medical_history ADD COLUMN stroke BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='ginjal') THEN
        ALTER TABLE medical_history ADD COLUMN ginjal BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='hepatitis') THEN
        ALTER TABLE medical_history ADD COLUMN hepatitis BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='tuberkulosis') THEN
        ALTER TABLE medical_history ADD COLUMN tuberkulosis BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='kanker') THEN
        ALTER TABLE medical_history ADD COLUMN kanker BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='hiv') THEN
        ALTER TABLE medical_history ADD COLUMN hiv BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='thalassemia') THEN
        ALTER TABLE medical_history ADD COLUMN thalassemia BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='hemofilia') THEN
        ALTER TABLE medical_history ADD COLUMN hemofilia BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='osteoporosis') THEN
        ALTER TABLE medical_history ADD COLUMN osteoporosis BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='tiroid') THEN
        ALTER TABLE medical_history ADD COLUMN tiroid BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='asam_urat') THEN
        ALTER TABLE medical_history ADD COLUMN asam_urat BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='reumatik') THEN
        ALTER TABLE medical_history ADD COLUMN reumatik BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='epilepsi') THEN
        ALTER TABLE medical_history ADD COLUMN epilepsi BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='glaukoma') THEN
        ALTER TABLE medical_history ADD COLUMN glaukoma BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='covid19') THEN
        ALTER TABLE medical_history ADD COLUMN covid19 BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add text column for konsumsi_obat
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medical_history' AND column_name='konsumsi_obat') THEN
        ALTER TABLE medical_history ADD COLUMN konsumsi_obat TEXT DEFAULT '';
    END IF;
END $$;
