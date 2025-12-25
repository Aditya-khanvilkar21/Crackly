-- Add RLS policy to allow students to view tests that are unlocked for their classes
CREATE POLICY "Students can view unlocked tests for their classes"
ON public.tests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM test_availability ta
    JOIN class_students cs ON cs.class_id = ta.class_id
    WHERE ta.test_id = tests.id
      AND ta.is_locked = false
      AND cs.student_id = auth.uid()
  )
);