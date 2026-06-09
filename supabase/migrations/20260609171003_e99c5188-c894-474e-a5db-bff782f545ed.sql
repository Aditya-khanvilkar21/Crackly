
-- Restrict admin read access to attempts of students in their own classes; super_admin still sees all
DROP POLICY IF EXISTS "Students view own attempts" ON public.test_attempts;

CREATE POLICY "View own or class-admin attempts"
ON public.test_attempts
FOR SELECT
USING (
  student_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.class_students cs
    JOIN public.tuition_classes tc ON tc.id = cs.class_id
    WHERE cs.student_id = test_attempts.student_id
      AND tc.admin_id = auth.uid()
  )
);

-- Tighten INSERT to ensure student is enrolled in a class with access to this test
DROP POLICY IF EXISTS "Students create own attempts" ON public.test_attempts;

CREATE POLICY "Students create own attempts"
ON public.test_attempts
FOR INSERT
WITH CHECK (
  student_id = auth.uid()
  AND submitted = false
  AND (
    EXISTS (
      SELECT 1
      FROM public.test_availability ta
      JOIN public.class_students cs ON cs.class_id = ta.class_id
      WHERE ta.test_id = test_attempts.test_id
        AND ta.is_locked = false
        AND cs.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.scheduled_tests st
      JOIN public.class_students cs ON cs.class_id = st.class_id
      WHERE st.test_id = test_attempts.test_id
        AND cs.student_id = auth.uid()
        AND now() >= st.scheduled_at
        AND now() <= st.scheduled_at + (st.duration_minutes || ' minutes')::interval
    )
  )
);
