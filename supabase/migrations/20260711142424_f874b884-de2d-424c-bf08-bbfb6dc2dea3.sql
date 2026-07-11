
-- Helper function: check whether a student has legitimate access to take a test
CREATE OR REPLACE FUNCTION public.can_student_access_test(_student_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.test_availability ta
    JOIN public.class_students cs ON cs.class_id = ta.class_id
    WHERE ta.test_id = _test_id
      AND ta.is_locked = false
      AND cs.student_id = _student_id
  ) OR EXISTS (
    SELECT 1
    FROM public.scheduled_tests st
    JOIN public.class_students cs ON cs.class_id = st.class_id
    WHERE st.test_id = _test_id
      AND cs.student_id = _student_id
      AND now() >= st.scheduled_at
      AND now() <= st.scheduled_at + ((st.duration_minutes || ' minutes')::interval)
  );
$$;

-- Helper function: check whether an admin owns a class that this test is assigned to
CREATE OR REPLACE FUNCTION public.is_test_admin_for_student(_admin_id uuid, _student_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tuition_classes tc
    JOIN public.class_students cs ON cs.class_id = tc.id
    LEFT JOIN public.test_availability ta
      ON ta.class_id = tc.id AND ta.test_id = _test_id
    LEFT JOIN public.scheduled_tests st
      ON st.class_id = tc.id AND st.test_id = _test_id
    WHERE tc.admin_id = _admin_id
      AND cs.student_id = _student_id
      AND (ta.id IS NOT NULL OR st.id IS NOT NULL)
  );
$$;

REVOKE ALL ON FUNCTION public.can_student_access_test(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_student_access_test(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_test_admin_for_student(uuid, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_test_admin_for_student(uuid, uuid, uuid) TO authenticated, service_role;

-- Tighten INSERT policy on test_attempts to strictly validate enrollment via helper
DROP POLICY IF EXISTS "Students create own attempts" ON public.test_attempts;
CREATE POLICY "Students create own attempts"
ON public.test_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND submitted = false
  AND public.can_student_access_test(auth.uid(), test_id)
);

-- Scope admin SELECT to attempts on tests actually assigned to admin's class
DROP POLICY IF EXISTS "View own or class-admin attempts" ON public.test_attempts;
CREATE POLICY "View own or class-admin attempts"
ON public.test_attempts
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR public.is_test_admin_for_student(auth.uid(), student_id, test_id)
);
