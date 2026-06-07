
-- 1) Allow super admins to delete admin_requests
CREATE POLICY "Super admins can delete requests"
ON public.admin_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Drop the policy that exposes full tests.questions (with correctAnswer) to enrolled students pre-attempt
DROP POLICY IF EXISTS "Students can view tests scheduled for their classes" ON public.tests;

-- Replacement: safe RPC that returns only id+title for scheduled tests in classes the student belongs to
CREATE OR REPLACE FUNCTION public.get_scheduled_test_meta(_test_ids uuid[])
RETURNS TABLE(id uuid, title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT t.id, t.title
  FROM public.tests t
  WHERE t.id = ANY(_test_ids)
    AND EXISTS (
      SELECT 1
      FROM public.scheduled_tests st
      JOIN public.class_students cs ON cs.class_id = st.class_id
      WHERE st.test_id = t.id
        AND cs.student_id = auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_scheduled_test_meta(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_scheduled_test_meta(uuid[]) TO authenticated;

-- 3) Tighten SECURITY DEFINER functions: remove anon execute
REVOKE EXECUTE ON FUNCTION public.get_test_for_taking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_test_for_taking(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_test_result_with_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_test_result_with_questions(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_student_available_tests(exam_type, test_type, test_subject) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_available_tests(exam_type, test_type, test_subject) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_available_students_for_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_students_for_class(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_in_class(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_in_class(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_class_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_admin(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_student_id() FROM PUBLIC, anon, authenticated;
