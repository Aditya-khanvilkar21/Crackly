-- Create storage bucket for test question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-questions', 'test-questions', true);

-- Create RLS policies for test question images
CREATE POLICY "Super admins can upload test question images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'test-questions' 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can update test question images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'test-questions' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete test question images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'test-questions' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view test question images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'test-questions');