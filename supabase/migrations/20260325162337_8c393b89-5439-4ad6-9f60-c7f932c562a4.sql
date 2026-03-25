
CREATE OR REPLACE FUNCTION public.get_available_students_for_class(_class_id uuid)
RETURNS TABLE(id uuid, full_name text, student_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id, p.full_name, p.student_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
  WHERE p.id NOT IN (
    SELECT cs.student_id FROM public.class_students cs WHERE cs.class_id = _class_id
  )
  AND (
    public.is_class_admin(auth.uid(), _class_id)
    OR public.has_role(auth.uid(), 'super_admin')
  )
  ORDER BY p.full_name;
$$;
