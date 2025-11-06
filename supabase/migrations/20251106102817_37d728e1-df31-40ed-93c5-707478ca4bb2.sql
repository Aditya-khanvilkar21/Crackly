-- Add test_type enum to distinguish between chapter tests and mock tests
CREATE TYPE public.test_type AS ENUM ('chapter_test', 'mock_test');

-- Add test_type column to tests table
ALTER TABLE public.tests ADD COLUMN test_type public.test_type NOT NULL DEFAULT 'chapter_test';

-- Make chapter and subject nullable for mock tests
ALTER TABLE public.tests ALTER COLUMN chapter DROP NOT NULL;
ALTER TABLE public.tests ALTER COLUMN subject DROP NOT NULL;