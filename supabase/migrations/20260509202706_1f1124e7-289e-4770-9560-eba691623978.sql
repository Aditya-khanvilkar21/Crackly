
-- Scheduled tests: admins schedule a test for one of their classes within a time window
CREATE TABLE public.scheduled_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  class_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  instructions text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_tests_class ON public.scheduled_tests(class_id);
CREATE INDEX idx_scheduled_tests_test ON public.scheduled_tests(test_id);
CREATE INDEX idx_scheduled_tests_window ON public.scheduled_tests(scheduled_at);

ALTER TABLE public.scheduled_tests ENABLE ROW LEVEL SECURITY;

-- Class admins (and super admins) can fully manage schedules for their classes
CREATE POLICY "Class admins manage scheduled tests"
ON public.scheduled_tests FOR ALL
USING (public.is_class_admin(auth.uid(), class_id))
WITH CHECK (public.is_class_admin(auth.uid(), class_id) AND created_by = auth.uid());

-- Students can view schedules for classes they belong to
CREATE POLICY "Students view their class schedules"
ON public.scheduled_tests FOR SELECT
USING (public.is_in_class(auth.uid(), class_id));

-- Auto update updated_at
CREATE TRIGGER trg_scheduled_tests_updated
BEFORE UPDATE ON public.scheduled_tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update get_test_for_taking to ALSO allow access during a live scheduled window
CREATE OR REPLACE FUNCTION public.get_test_for_taking(test_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  test_data jsonb;
  questions_array jsonb;
  cleaned_questions jsonb := '[]'::jsonb;
  question jsonb;
  has_access boolean;
BEGIN
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
    ) OR
    EXISTS (
      SELECT 1
      FROM scheduled_tests st
      JOIN class_students cs ON cs.class_id = st.class_id
      WHERE st.test_id = test_id_param
        AND cs.student_id = auth.uid()
        AND now() >= st.scheduled_at
        AND now() <= st.scheduled_at + (st.duration_minutes || ' minutes')::interval
    )
  INTO has_access;

  IF NOT has_access THEN RETURN NULL; END IF;

  SELECT row_to_json(t.*)::jsonb INTO test_data
  FROM tests t WHERE t.id = test_id_param AND t.is_active = true;

  IF test_data IS NULL THEN RETURN NULL; END IF;

  questions_array := test_data->'questions';
  FOR question IN SELECT * FROM jsonb_array_elements(questions_array) LOOP
    cleaned_questions := cleaned_questions || jsonb_build_array(question - 'correctAnswer');
  END LOOP;
  test_data := jsonb_set(test_data, '{questions}', cleaned_questions);
  RETURN test_data;
END;
$function$;
