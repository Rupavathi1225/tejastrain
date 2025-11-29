import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

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

interface BlogBreakdown {
  blog_id: string;
  blog_title: string;
  total_clicks: number;
  unique_clicks: number;
}

interface RelatedSearchBreakdown {
  related_search_id: string;
  search_text: string;
  blog_title: string;
  total_clicks: number;
  unique_clicks: number;
}

const AnalyticsDashboard = () => {
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [blogBreakdown, setBlogBreakdown] = useState<BlogBreakdown[]>([]);
  const [relatedSearchBreakdown, setRelatedSearchBreakdown] = useState<RelatedSearchBreakdown[]>([]);

  useEffect(() => {
    fetchSessionAnalytics();
    fetchBreakdown();
  }, []);

  const fetchBreakdown = async () => {
    // Fetch blog clicks breakdown
    const { data: blogEvents } = await supabase
      .from('analytics_events')
      .select('blog_id, session_id, blogs(title)')
      .eq('event_type', 'blog_click')
      .not('blog_id', 'is', null);

    if (blogEvents) {
      const blogMap = new Map<string, { title: string; sessions: Set<string>; total: number }>();
      
      blogEvents.forEach((event: any) => {
        const blogId = event.blog_id;
        const blogTitle = event.blogs?.title || 'Unknown';
        
        if (!blogMap.has(blogId)) {
          blogMap.set(blogId, { title: blogTitle, sessions: new Set(), total: 0 });
        }
        
        const blog = blogMap.get(blogId)!;
        blog.sessions.add(event.session_id);
        blog.total++;
      });
      
      const breakdown: BlogBreakdown[] = Array.from(blogMap.entries()).map(([blog_id, data]) => ({
        blog_id,
        blog_title: data.title,
        total_clicks: data.total,
        unique_clicks: data.sessions.size
      }));
      
      setBlogBreakdown(breakdown);
    }

    // Fetch related search clicks breakdown
    const { data: searchEvents } = await supabase
      .from('analytics_events')
      .select('related_search_id, session_id, related_searches(search_text, blogs(title))')
      .eq('event_type', 'related_search_click')
      .not('related_search_id', 'is', null);

    if (searchEvents) {
      const searchMap = new Map<string, { searchText: string; blogTitle: string; sessions: Set<string>; total: number }>();
      
      searchEvents.forEach((event: any) => {
        const searchId = event.related_search_id;
        const searchText = event.related_searches?.search_text || 'Unknown';
        const blogTitle = event.related_searches?.blogs?.title || 'Unknown';
        
        if (!searchMap.has(searchId)) {
          searchMap.set(searchId, { searchText, blogTitle, sessions: new Set(), total: 0 });
        }
        
        const search = searchMap.get(searchId)!;
        search.sessions.add(event.session_id);
        search.total++;
      });
      
      const breakdown: RelatedSearchBreakdown[] = Array.from(searchMap.entries()).map(([related_search_id, data]) => ({
        related_search_id,
        search_text: data.searchText,
        blog_title: data.blogTitle,
        total_clicks: data.total,
        unique_clicks: data.sessions.size
      }));
      
      setRelatedSearchBreakdown(breakdown);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Button 
          onClick={() => setShowBreakdown(!showBreakdown)}
          variant="outline"
          className="flex items-center gap-2"
        >
          {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          View Breakdown
        </Button>
      </div>

      {showBreakdown && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blog Clicks Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Blog Clicks Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blogBreakdown.map((blog) => (
                  <div key={blog.blog_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{blog.blog_title}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-primary">{blog.total_clicks}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-secondary">{blog.unique_clicks}</p>
                        <p className="text-xs text-muted-foreground">Unique</p>
                      </div>
                    </div>
                  </div>
                ))}
                {blogBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No blog clicks yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Search Clicks Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Related Search Clicks Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatedSearchBreakdown.map((search) => (
                  <div key={search.related_search_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{search.search_text}</p>
                      <p className="text-xs text-muted-foreground">From: {search.blog_title}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-primary">{search.total_clicks}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-secondary">{search.unique_clicks}</p>
                        <p className="text-xs text-muted-foreground">Unique</p>
                      </div>
                    </div>
                  </div>
                ))}
                {relatedSearchBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No related search clicks yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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