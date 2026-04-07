-- Create a secure function for students to list available tests WITHOUT questions/answers
CREATE OR REPLACE FUNCTION public.get_student_available_tests(
  _exam_type exam_type DEFAULT NULL,
  _test_type test_type DEFAULT NULL,
  _subject test_subject DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  subject test_subject,
  chapter text,
  difficulty difficulty_level,
  duration_minutes integer,
  exam_type exam_type,
  test_type test_type,
  negative_marking numeric,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id, t.title, t.subject, t.chapter, t.difficulty,
    t.duration_minutes, t.exam_type, t.test_type, t.negative_marking,
    t.is_active, t.created_at
  FROM public.tests t
  WHERE t.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.test_availability ta
      JOIN public.class_students cs ON cs.class_id = ta.class_id
      WHERE ta.test_id = t.id
        AND ta.is_locked = false
        AND cs.student_id = auth.uid()
    )
    AND (_exam_type IS NULL OR t.exam_type = _exam_type)
    AND (_test_type IS NULL OR t.test_type = _test_type)
    AND (_subject IS NULL OR t.subject = _subject)
  ORDER BY t.created_at DESC;
$$;

-- Remove the student direct SELECT policy that exposes questions with correct answers
DROP POLICY IF EXISTS "Students can view unlocked tests for their classes" ON public.tests;