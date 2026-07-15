DROP POLICY IF EXISTS "View own or class-admin attempts" ON public.test_attempts;
CREATE POLICY "View own or class-admin attempts"
ON public.test_attempts
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    submitted = true
    AND public.is_test_admin_for_student(auth.uid(), student_id, test_id)
  )
);