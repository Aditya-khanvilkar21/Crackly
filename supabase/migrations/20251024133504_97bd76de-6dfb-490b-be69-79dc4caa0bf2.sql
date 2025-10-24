-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view their students profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage their class students" ON public.class_students;
DROP POLICY IF EXISTS "Students can view their class memberships" ON public.class_students;
DROP POLICY IF EXISTS "Admins can manage their classes" ON public.tuition_classes;
DROP POLICY IF EXISTS "Members can view their classes" ON public.tuition_classes;
DROP POLICY IF EXISTS "Students can view their own results" ON public.test_results;
DROP POLICY IF EXISTS "Admins can view results of their class students" ON public.test_results;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can set initial role on signup" ON public.user_roles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_class_admin(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tuition_classes
    WHERE id = _class_id
      AND admin_id = _user_id
  ) OR public.has_role(_user_id, 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_in_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_students
    WHERE class_id = _class_id
      AND student_id = _user_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view their students profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.class_students cs
    JOIN public.tuition_classes tc ON cs.class_id = tc.id
    WHERE cs.student_id = profiles.id
      AND (tc.admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Tuition classes policies
CREATE POLICY "Admins can manage their classes"
ON public.tuition_classes FOR ALL
USING (
  admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Members can view their classes"
ON public.tuition_classes FOR SELECT
USING (
  admin_id = auth.uid() 
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.is_in_class(auth.uid(), id)
);

-- Class students policies
CREATE POLICY "Admins can manage their class students"
ON public.class_students FOR ALL
USING (
  public.is_class_admin(auth.uid(), class_id)
);

CREATE POLICY "Students can view their class memberships"
ON public.class_students FOR SELECT
USING (
  student_id = auth.uid() OR public.is_class_admin(auth.uid(), class_id)
);

-- Test results policies
CREATE POLICY "Students can view their own results"
ON public.test_results FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Admins can view results of their class students"
ON public.test_results FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.class_students cs
    JOIN public.tuition_classes tc ON cs.class_id = tc.id
    WHERE cs.student_id = test_results.student_id
      AND (tc.admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- User roles policies (keep super_admin only for management)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can set initial role on signup"
ON public.user_roles FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('student'::app_role, 'admin'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Update handle_new_user to not auto-assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    public.generate_student_id()
  );
  
  RETURN NEW;
END;
$$;