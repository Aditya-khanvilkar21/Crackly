-- Update RLS policy for test_availability to only allow class admins (not super_admins)
DROP POLICY IF EXISTS "Admins can manage test availability for their classes" ON public.test_availability;

CREATE POLICY "Class admins can manage test availability for their classes"
ON public.test_availability
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tuition_classes
    WHERE tuition_classes.id = test_availability.class_id
      AND tuition_classes.admin_id = auth.uid()
  )
);