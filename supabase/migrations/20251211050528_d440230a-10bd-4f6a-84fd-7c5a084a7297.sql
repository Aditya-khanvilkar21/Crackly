-- Create exam_type enum
CREATE TYPE public.exam_type AS ENUM ('JEE', 'NEET', 'CET');

-- Add exam_type column to tests table
ALTER TABLE public.tests ADD COLUMN exam_type public.exam_type NOT NULL DEFAULT 'JEE';

-- Update existing tests based on subjects (Biology tests are likely NEET)
UPDATE public.tests 
SET exam_type = 'NEET' 
WHERE subject = 'biology' OR (test_type = 'mock_test' AND title ILIKE '%neet%');

-- Add index for better query performance
CREATE INDEX idx_tests_exam_type ON public.tests(exam_type);