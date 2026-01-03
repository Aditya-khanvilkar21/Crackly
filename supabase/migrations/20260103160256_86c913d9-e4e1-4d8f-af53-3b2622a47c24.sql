-- Create admin_requests table for pending admin signups
CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own request status
CREATE POLICY "Users can view own request"
ON public.admin_requests FOR SELECT
USING (user_id = auth.uid());

-- Super admins can view all requests
CREATE POLICY "Super admins can view all requests"
ON public.admin_requests FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update requests (approve/reject)
CREATE POLICY "Super admins can update requests"
ON public.admin_requests FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can insert their own request (via trigger - but we need insert for signup flow)
CREATE POLICY "Users can create own request"
ON public.admin_requests FOR INSERT
WITH CHECK (user_id = auth.uid());