-- Priority 2: Restrict profile viewing to owners and relevant admins only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view their students profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM class_students cs
    JOIN tuition_classes tc ON cs.class_id = tc.id
    WHERE cs.student_id = profiles.id
    AND tc.admin_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
);

-- Priority 2: Make classes visible only to members and admins
DROP POLICY IF EXISTS "Anyone can view classes" ON public.tuition_classes;

CREATE POLICY "Members can view their classes"
ON public.tuition_classes
FOR SELECT
USING (
  admin_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1
    FROM class_students
    WHERE class_students.class_id = tuition_classes.id
    AND class_students.student_id = auth.uid()
  )
);

-- Priority 2: Prevent students from inserting test results directly
DROP POLICY IF EXISTS "Students can insert their own results" ON public.test_results;

CREATE POLICY "Only backend can insert results"
ON public.test_results
FOR INSERT
WITH CHECK (false);

-- Allow service role to insert (for edge function)
ALTER TABLE public.test_results FORCE ROW LEVEL SECURITY;