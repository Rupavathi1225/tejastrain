import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve session ID
export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

// Get device type
export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Get IP address (using a public API)
export const getIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
};

// Get country from IP
export const getCountry = async (ip: string): Promise<string> => {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return data.country_name || 'unknown';
  } catch (error) {
    return 'unknown';
  }
};

// Track event
export const trackEvent = async (
  eventType: string,
  blogId?: string,
  relatedSearchId?: string,
  source?: string
) => {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const ipAddress = await getIpAddress();
    const country = await getCountry(ipAddress);
    const userAgent = navigator.userAgent;

    const { error } = await supabase.from('analytics_events').insert({
      event_type: eventType,
      blog_id: blogId || null,
      related_search_id: relatedSearchId || null,
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      country: country,
      source: source || 'direct'
    });

    if (error) console.error('Analytics tracking error:', error);
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

// Track page view
export const trackPageView = (blogId?: string) => {
  trackEvent('page_view', blogId);
};

// Track blog click
export const trackBlogClick = (blogId: string) => {
  trackEvent('blog_click', blogId);
};

// Track related search click
export const trackRelatedSearchClick = (relatedSearchId: string) => {
  trackEvent('related_search_click', undefined, relatedSearchId);
};

// Track visit now click
export const trackVisitNowClick = (relatedSearchId: string) => {
  trackEvent('visit_now_click', undefined, relatedSearchId);
};

// Track email submission
export const trackEmailSubmission = async (email: string, relatedSearchId?: string) => {
  try {
    const sessionId = getSessionId();
    const ipAddress = await getIpAddress();

    const { error } = await supabase.from('email_submissions').insert({
      email,
      related_search_id: relatedSearchId || null,
      session_id: sessionId,
      ip_address: ipAddress
    });

    if (error) console.error('Email tracking error:', error);
  } catch (error) {
    console.error('Email tracking error:', error);
  }
};