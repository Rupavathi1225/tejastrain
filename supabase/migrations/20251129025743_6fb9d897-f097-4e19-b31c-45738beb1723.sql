-- Create categories table
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code_range TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blogs table
CREATE TABLE public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES public.categories(id),
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create related_searches table
CREATE TABLE public.related_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create web_results table
CREATE TABLE public.web_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  related_search_id UUID REFERENCES public.related_searches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pre_landing_config table
CREATE TABLE public.pre_landing_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  related_search_id UUID REFERENCES public.related_searches(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_position TEXT DEFAULT 'top-center',
  main_image_url TEXT,
  headline TEXT,
  description TEXT,
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  button_text TEXT DEFAULT 'Visit Now',
  destination_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(related_search_id)
);

-- Create analytics_events table
CREATE TABLE public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  related_search_id UUID REFERENCES public.related_searches(id) ON DELETE CASCADE,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_submissions table
CREATE TABLE public.email_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  related_search_id UUID REFERENCES public.related_searches(id),
  session_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_landing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_submissions ENABLE ROW LEVEL SECURITY;

-- Public read access for blogs and related data
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can read published blogs" ON public.blogs FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read related searches" ON public.related_searches FOR SELECT USING (true);
CREATE POLICY "Public can read web results" ON public.web_results FOR SELECT USING (true);
CREATE POLICY "Public can read pre landing config" ON public.pre_landing_config FOR SELECT USING (true);

-- Public can insert analytics and emails
CREATE POLICY "Public can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read analytics" ON public.analytics_events FOR SELECT USING (true);
CREATE POLICY "Public can insert emails" ON public.email_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read emails" ON public.email_submissions FOR SELECT USING (true);

-- Admin full access (for now, making it public for admin operations)
CREATE POLICY "Public can manage categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Public can manage blogs" ON public.blogs FOR ALL USING (true);
CREATE POLICY "Public can manage related searches" ON public.related_searches FOR ALL USING (true);
CREATE POLICY "Public can manage web results" ON public.web_results FOR ALL USING (true);
CREATE POLICY "Public can manage pre landing config" ON public.pre_landing_config FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_blogs_category ON public.blogs(category_id);
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_related_searches_blog ON public.related_searches(blog_id);
CREATE INDEX idx_web_results_search ON public.web_results(related_search_id);
CREATE INDEX idx_analytics_events_blog ON public.analytics_events(blog_id);
CREATE INDEX idx_analytics_events_search ON public.analytics_events(related_search_id);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);

-- Insert default categories
INSERT INTO public.categories (name, code_range) VALUES
  ('Lifestyle', '100-200'),
  ('Education', '201-300'),
  ('Wellness', '301-400'),
  ('Deals', '401-500'),
  ('Job Seeking', '501-600'),
  ('Alternative Learning', '601-700');