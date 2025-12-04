-- Add DELETE policies for tables that need cascade deletion

-- Allow delete on email_submissions
CREATE POLICY "Public can delete emails" 
ON public.email_submissions 
FOR DELETE 
USING (true);

-- Allow delete on analytics_events
CREATE POLICY "Public can delete analytics" 
ON public.analytics_events 
FOR DELETE 
USING (true);