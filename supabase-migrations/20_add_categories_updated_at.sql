-- Migration: Add updated_at column to categories table
-- This migration adds the missing updated_at column and trigger to the categories table

-- Add updated_at column to categories table
ALTER TABLE categories 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have the same updated_at as created_at
UPDATE categories 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after setting values
ALTER TABLE categories 
ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_categories_updated_at 
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN categories.updated_at IS 'Timestamp when the category was last updated';

-- Verify the column was added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE 'Successfully added updated_at column to categories table';
    ELSE
        RAISE EXCEPTION 'Failed to add updated_at column to categories table';
    END IF;
END $$;