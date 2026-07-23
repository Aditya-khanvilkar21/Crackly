
-- 1. Drop the confusing "WITH CHECK false" INSERT policy on test_results.
-- Inserts are done by the edge function using the service role (which bypasses RLS entirely),
-- so no INSERT policy is needed. Default deny still blocks direct client inserts.
DROP POLICY IF EXISTS "Only backend can insert results" ON public.test_results;

-- 2. Tighten get_available_students_for_class: only return students who submitted a
-- pending or approved join_request for one of the calling admin's classes.
CREATE OR REPLACE FUNCTION public.get_available_students_for_class(_class_id uuid)
 RETURNS TABLE(id uuid, full_name text, student_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.student_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
  WHERE p.id NOT IN (
    SELECT cs.student_id FROM public.class_students cs WHERE cs.class_id = _class_id
  )
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.is_class_admin(auth.uid(), _class_id)
      AND EXISTS (
        SELECT 1 FROM public.join_requests jr
        WHERE jr.student_id = p.id
          AND jr.class_id = _class_id
          AND jr.status IN ('pending','approved')
      )
    )
  )
  ORDER BY p.full_name;
$function$;

-- 3. Tighten class_students INSERT: require an approved join_request from the student,
--    unless the caller is a super_admin.
DROP POLICY IF EXISTS "Admins can manage their class students" ON public.class_students;

CREATE POLICY "Admins can view their class students"
ON public.class_students
FOR SELECT
USING (public.is_class_admin(auth.uid(), class_id));

CREATE POLICY "Admins can add students with approved join request"
ON public.class_students
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.is_class_admin(auth.uid(), class_id)
    AND EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.student_id = class_students.student_id
        AND jr.class_id = class_students.class_id
        AND jr.status = 'approved'
    )
  )
);

CREATE POLICY "Admins can remove their class students"
ON public.class_students
FOR DELETE
USING (public.is_class_admin(auth.uid(), class_id));

CREATE POLICY "Admins can update their class students"
ON public.class_students
FOR UPDATE
USING (public.is_class_admin(auth.uid(), class_id))
WITH CHECK (public.is_class_admin(auth.uid(), class_id));

-- 4. Reduce SECURITY DEFINER exposure: revoke EXECUTE on internal helpers that
--    are only used by triggers, never called from the client/RPC.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_student_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_test_admin_for_student(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_student_access_test(uuid, uuid) FROM PUBLIC, anon, authenticated;
