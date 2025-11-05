-- Update existing profiles without student_id using a simpler approach
DO $$
DECLARE
  profile_record RECORD;
  counter INTEGER := 1000;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles WHERE student_id IS NULL ORDER BY created_at
  LOOP
    UPDATE public.profiles 
    SET student_id = 'JEE2025' || LPAD(counter::text, 5, '0')
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Now make student_id NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN student_id SET NOT NULL;

-- Create a sequence for student IDs
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 2000;

-- Drop and recreate the handle_new_user function to auto-generate student IDs
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'), 
    new_student_id
  );
  
  RETURN new;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();