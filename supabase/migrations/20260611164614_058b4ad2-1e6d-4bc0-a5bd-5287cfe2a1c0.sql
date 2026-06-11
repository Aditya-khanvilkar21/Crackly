
-- Tighten test_availability SELECT policy
DROP POLICY IF EXISTS "Anyone can view test availability" ON public.test_availability;

CREATE POLICY "Class members and admins can view test availability"
ON public.test_availability
FOR SELECT
TO authenticated
USING (
  public.is_in_class(auth.uid(), class_id)
  OR public.is_class_admin(auth.uid(), class_id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Prevent duplicate admin requests per user
DELETE FROM public.admin_requests a
USING public.admin_requests b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id;

ALTER TABLE public.admin_requests
  ADD CONSTRAINT admin_requests_user_id_unique UNIQUE (user_id);
