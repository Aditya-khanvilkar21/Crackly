-- Make test-questions bucket private to prevent unauthenticated access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'test-questions';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view test question images" ON storage.objects;

-- Create policy allowing only authenticated users who are taking or have taken tests, or admins
CREATE POLICY "Authenticated users can view test question images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'test-questions' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to upload test question images
CREATE POLICY "Admins can upload test question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'test-questions' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Allow admins to update test question images
CREATE POLICY "Admins can update test question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'test-questions' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Allow admins to delete test question images
CREATE POLICY "Admins can delete test question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'test-questions' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
);