-- Add is_disabled column to tuition_classes table
ALTER TABLE public.tuition_classes ADD COLUMN is_disabled boolean DEFAULT false;

-- Update RLS policy to prevent students from viewing disabled classes
DROP POLICY IF EXISTS "Members can view their classes" ON public.tuition_classes;

CREATE POLICY "Members can view their classes"
ON public.tuition_classes FOR SELECT
USING (
  (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  OR (public.is_in_class(auth.uid(), id) AND (is_disabled = false OR is_disabled IS NULL))
);