-- Restore EXECUTE on RLS helper functions used inside policy expressions.
GRANT EXECUTE ON FUNCTION public.can_student_access_test(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_test_admin_for_student(uuid, uuid, uuid) TO authenticated;

-- Restore class_students INSERT to allow class admins to add any student to their class.
DROP POLICY IF EXISTS "Admins can add students with approved join request" ON public.class_students;

CREATE POLICY "Admins can add students to their class"
ON public.class_students
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.is_class_admin(auth.uid(), class_id)
);