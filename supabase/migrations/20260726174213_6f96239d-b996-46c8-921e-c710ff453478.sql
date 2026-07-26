
ALTER TABLE public.tuition_classes
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Storage policies for class-logos bucket
CREATE POLICY "Class logos readable by authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'class-logos');

CREATE POLICY "Class admins can upload class logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'class-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_class_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  )
);

CREATE POLICY "Class admins can update class logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'class-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_class_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  )
);

CREATE POLICY "Class admins can delete class logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'class-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_class_admin(auth.uid(), (split_part(name, '/', 1))::uuid)
  )
);
