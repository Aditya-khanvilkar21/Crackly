-- Drop the overly permissive policy that allows anyone to view full test data
DROP POLICY IF EXISTS "Anyone can view active tests" ON public.tests;

-- Create a new policy that only allows admins to see full test data
CREATE POLICY "Admins can view full tests" 
ON public.tests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create a secure RPC function that returns test with questions only if student has submitted it
CREATE OR REPLACE FUNCTION public.get_test_result_with_questions(test_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_data jsonb;
  has_submitted boolean;
BEGIN
  -- Check if the current user has submitted this test
  SELECT EXISTS (
    SELECT 1 FROM public.test_results
    WHERE test_id = test_id_param AND student_id = auth.uid()
  ) INTO has_submitted;
  
  -- If user hasn't submitted this test and is not an admin, return null
  IF NOT has_submitted AND NOT has_role(auth.uid(), 'admin'::app_role) AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NULL;
  END IF;
  
  -- Get the full test data including questions with correct answers
  SELECT row_to_json(t.*)::jsonb INTO test_data
  FROM tests t
  WHERE t.id = test_id_param;
  
  RETURN test_data;
END;
$$;