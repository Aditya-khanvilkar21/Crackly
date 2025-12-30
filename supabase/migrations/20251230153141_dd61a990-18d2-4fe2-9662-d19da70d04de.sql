-- Add negative_marking column to tests table for mock tests
ALTER TABLE public.tests ADD COLUMN negative_marking numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tests.negative_marking IS 'Negative marking value per wrong answer (e.g., 0.25 means -0.25 per wrong answer)';