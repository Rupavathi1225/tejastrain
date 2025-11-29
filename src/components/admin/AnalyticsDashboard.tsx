import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsData {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  uniqueSessions: number;
  uniqueIPs: number;
  blogClicks: number;
  relatedSearchClicks: number;
  visitNowClicks: number;
  totalEmails: number;
}

interface EventDetail {
  event_type: string;
  session_id: string;
  ip_address: string;
  device_type: string;
  country: string;
  source: string;
  blog_id: string | null;
  created_at: string;
}

interface SessionAnalytics {
  session_id: string;
  ip_address: string;
  country: string;
  source: string;
  device_type: string;
  page_views: number;
  related_searches: number;
  blog_clicks: number;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSessions: 0,
    totalPageViews: 0,
    totalClicks: 0,
    uniqueSessions: 0,
    uniqueIPs: 0,
    blogClicks: 0,
    relatedSearchClicks: 0,
    visitNowClicks: 0,
    totalEmails: 0
  });
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchSessionAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*');

    const { data: emails } = await supabase
      .from('email_submissions')
      .select('*');

    if (events) {
      const uniqueSessions = new Set(events.map(e => e.session_id)).size;
      const uniqueIPs = new Set(events.map(e => e.ip_address)).size;
      
      setAnalytics({
        totalSessions: events.length,
        totalPageViews: events.filter(e => e.event_type === 'page_view').length,
        totalClicks: events.filter(e => e.event_type.includes('click')).length,
        uniqueSessions,
        uniqueIPs,
        blogClicks: events.filter(e => e.event_type === 'blog_click').length,
        relatedSearchClicks: events.filter(e => e.event_type === 'related_search_click').length,
        visitNowClicks: events.filter(e => e.event_type === 'visit_now_click').length,
        totalEmails: emails?.length || 0
      });
    }
  };

  const fetchSessionAnalytics = async () => {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (events) {
      // Group events by session
      const sessionMap = new Map<string, SessionAnalytics>();
      
      events.forEach((event) => {
        const sessionId = event.session_id || 'unknown';
        
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            ip_address: event.ip_address || 'unknown',
            country: event.country || 'unknown',
            source: event.source || 'direct',
            device_type: event.device_type || 'unknown',
            page_views: 0,
            related_searches: 0,
            blog_clicks: 0
          });
        }
        
        const session = sessionMap.get(sessionId)!;
        
        if (event.event_type === 'page_view') {
          session.page_views++;
        } else if (event.event_type === 'related_search_click') {
          session.related_searches++;
        } else if (event.event_type === 'blog_click') {
          session.blog_clicks++;
        }
      });
      
      setSessionAnalytics(Array.from(sessionMap.values()));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unique Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.uniqueSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unique IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.uniqueIPs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalEmails}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Page Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalPageViews}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Blog Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.blogClicks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Related Search Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.relatedSearchClicks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Visit Now Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.visitNowClicks}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Session Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Session ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">IP Address</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Country</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Device</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Page Views</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Clicks</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Related Searches</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Blog Clicks</th>
              </tr>
            </thead>
            <tbody>
              {sessionAnalytics.map((session, index) => (
                <tr key={index} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-4 text-sm font-mono text-xs">{session.session_id.substring(0, 15)}...</td>
                  <td className="px-4 py-4 text-sm">{session.ip_address}</td>
                  <td className="px-4 py-4 text-sm">{session.country}</td>
                  <td className="px-4 py-4 text-sm">{session.source}</td>
                  <td className="px-4 py-4 text-sm">{session.device_type}</td>
                  <td className="px-4 py-4 text-sm text-center font-semibold">{session.page_views}</td>
                  <td className="px-4 py-4 text-sm text-center">
                    <span className="px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded text-xs font-semibold">
                      Total: {session.related_searches}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-center">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                      Total: {session.related_searches}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-center">
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded text-xs font-semibold">
                      Total: {session.blog_clicks}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;