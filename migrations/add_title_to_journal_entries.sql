-- Adicionar coluna title à tabela journal_entries se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'journal_entries' 
        AND column_name = 'title'
    ) THEN 
        ALTER TABLE journal_entries ADD COLUMN title TEXT;
    END IF;
END $$;