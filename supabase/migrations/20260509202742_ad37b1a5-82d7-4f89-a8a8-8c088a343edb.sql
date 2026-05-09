
CREATE POLICY "Students can view tests scheduled for their classes"
ON public.tests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scheduled_tests st
    JOIN public.class_students cs ON cs.class_id = st.class_id
    WHERE st.test_id = tests.id
      AND cs.student_id = auth.uid()
  )
);
