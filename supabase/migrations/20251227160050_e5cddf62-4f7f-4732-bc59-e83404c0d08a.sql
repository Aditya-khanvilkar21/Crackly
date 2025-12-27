-- Fix get_test_for_taking function to verify student enrollment
CREATE OR REPLACE FUNCTION public.get_test_for_taking(test_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_data jsonb;
  questions_array jsonb;
  cleaned_questions jsonb := '[]'::jsonb;
  question jsonb;
  has_access boolean;
BEGIN
  -- Check if user is admin/super_admin or student with access to unlocked test
  SELECT 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1
      FROM test_availability ta
      JOIN class_students cs ON cs.class_id = ta.class_id
      WHERE ta.test_id = test_id_param
        AND ta.is_locked = false
        AND cs.student_id = auth.uid()
    )
  INTO has_access;
  
  IF NOT has_access THEN
    RETURN NULL;
  END IF;
  
  -- Get the test data
  SELECT row_to_json(t.*)::jsonb INTO test_data
  FROM tests t
  WHERE t.id = test_id_param AND t.is_active = true;
  
  IF test_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get questions array
  questions_array := test_data->'questions';
  
  -- Strip correctAnswer from each question
  FOR question IN SELECT * FROM jsonb_array_elements(questions_array)
  LOOP
    cleaned_questions := cleaned_questions || jsonb_build_array(
      question - 'correctAnswer'
    );
  END LOOP;
  
  -- Replace questions with cleaned version
  test_data := jsonb_set(test_data, '{questions}', cleaned_questions);
  
  RETURN test_data;
END;
$$;