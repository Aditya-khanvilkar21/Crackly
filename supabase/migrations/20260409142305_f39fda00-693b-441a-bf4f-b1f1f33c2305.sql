CREATE POLICY "Students can view tests they have attempted"
ON public.tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_results
    WHERE test_results.test_id = tests.id
      AND test_results.student_id = auth.uid()
  )
);