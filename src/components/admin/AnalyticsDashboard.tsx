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
  created_at: string;
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
  const [recentEvents, setRecentEvents] = useState<EventDetail[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchRecentEvents();
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

  const fetchRecentEvents = async () => {
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setRecentEvents(data as EventDetail[]);
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
          <h3 className="text-xl font-bold mb-4">Recent Events</h3>
        </div>
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm">Event Type</th>
              <th className="px-6 py-3 text-left text-sm">Session ID</th>
              <th className="px-6 py-3 text-left text-sm">IP Address</th>
              <th className="px-6 py-3 text-left text-sm">Device</th>
              <th className="px-6 py-3 text-left text-sm">Country</th>
              <th className="px-6 py-3 text-left text-sm">Time</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((event, index) => (
              <tr key={index} className="border-t border-border">
                <td className="px-6 py-4 text-sm">{event.event_type}</td>
                <td className="px-6 py-4 text-sm font-mono text-xs">{event.session_id?.substring(0, 12)}...</td>
                <td className="px-6 py-4 text-sm">{event.ip_address}</td>
                <td className="px-6 py-4 text-sm">{event.device_type}</td>
                <td className="px-6 py-4 text-sm">{event.country}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(event.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;