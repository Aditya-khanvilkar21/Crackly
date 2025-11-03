-- Add profile fields for student information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS class_status text CHECK (class_status IN ('11th_appearing', '12th_appearing', '12th_passed')),
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS state text;

-- Create join requests table
CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.tuition_classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Enable RLS
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for join_requests
CREATE POLICY "Students can view their own join requests"
ON public.join_requests
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can create join requests"
ON public.join_requests
FOR INSERT
WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view requests for their classes"
ON public.join_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tuition_classes
    WHERE id = join_requests.class_id
    AND (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);

CREATE POLICY "Admins can update requests for their classes"
ON public.join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tuition_classes
    WHERE id = join_requests.class_id
    AND (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_join_requests_updated_at
BEFORE UPDATE ON public.join_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();