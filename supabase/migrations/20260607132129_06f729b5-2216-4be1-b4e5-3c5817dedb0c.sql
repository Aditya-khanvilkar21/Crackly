CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  marked_for_review jsonb NOT NULL DEFAULT '[]'::jsonb,
  visited_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_index_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_question_index integer NOT NULL DEFAULT 0,
  time_left_seconds integer NOT NULL DEFAULT 0,
  submitted boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX test_attempts_active_unique
  ON public.test_attempts (student_id, test_id)
  WHERE submitted = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own attempts"
  ON public.test_attempts FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students create own attempts"
  ON public.test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() AND submitted = false);

CREATE POLICY "Students update own active attempts"
  ON public.test_attempts FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND submitted = false)
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students delete own attempts"
  ON public.test_attempts FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

CREATE TRIGGER test_attempts_set_updated_at
  BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
