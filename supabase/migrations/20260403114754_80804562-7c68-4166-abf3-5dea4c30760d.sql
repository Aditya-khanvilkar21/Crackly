-- =============================================
-- FIX 1: Prevent privilege escalation in user_roles
-- Block INSERT/UPDATE/DELETE for non-super-admins
-- =============================================

-- Deny INSERT for non-super-admins
CREATE POLICY "Only super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Deny UPDATE for non-super-admins
CREATE POLICY "Only super admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Deny DELETE for non-super-admins
CREATE POLICY "Only super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- =============================================
-- FIX 2: Prevent email spoofing in admin_requests
-- Enforce email matches the authenticated user's JWT email
-- =============================================

-- Drop and recreate the INSERT policy with email validation
DROP POLICY IF EXISTS "Users can create own request" ON public.admin_requests;

CREATE POLICY "Users can create own request"
ON public.admin_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND email = (auth.jwt() ->> 'email')
);