
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_student_id text;
BEGIN
  new_student_id := 'CRACKLY' || LPAD(nextval('student_id_seq')::text, 5, '0');

  INSERT INTO public.profiles (id, full_name, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    new_student_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_student_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'CRACKLY' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE student_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$function$;

UPDATE public.profiles
SET student_id = 'CRACKLY' || SUBSTRING(student_id FROM 8)
WHERE student_id LIKE 'JEE2025%';
