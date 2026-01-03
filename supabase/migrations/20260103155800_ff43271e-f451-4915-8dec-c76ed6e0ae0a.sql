-- Fix 1: Drop the vulnerable policy that allows users to self-assign any role
DROP POLICY IF EXISTS "Users can set initial role on signup" ON public.user_roles;

-- Fix 2: Update handle_new_user trigger to auto-assign student role server-side
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_student_id text;
BEGIN
  -- Generate student ID in format JEE2025XXXXX
  new_student_id := 'JEE2025' || LPAD(nextval('student_id_seq')::text, 5, '0');
  
  -- Insert profile with auto-generated student ID
  INSERT INTO public.profiles (id, full_name, student_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'), 
    new_student_id
  );
  
  -- Auto-assign student role server-side (secure - cannot be bypassed)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  RETURN NEW;
END;
$$;

-- Fix 3: Drop the overly permissive policy that lets any admin view ALL profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a more secure policy: Admins can only view profiles of students who have sent join requests to their classes
CREATE POLICY "Admins can view join request student profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.join_requests jr
    JOIN public.tuition_classes tc ON jr.class_id = tc.id
    WHERE jr.student_id = profiles.id
      AND (tc.admin_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);