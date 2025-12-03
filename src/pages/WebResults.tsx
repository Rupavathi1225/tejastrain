import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecentPosts from "@/components/RecentPosts";
import { trackPageView, trackVisitNowClick } from "@/utils/analytics";

interface WebResult {
  id: string;
  title: string;
  url: string;
  description: string | null;
  logo_url: string | null;
  order_index: number;
  is_sponsored: boolean;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  wr: number;
  blog_id: string;
  blogs?: {
    title: string;
    slug: string;
    category_id: number;
    categories?: {
      name: string;
    };
  };
}

const WebResults = () => {
  const { searchId } = useParams();
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [relatedSearch, setRelatedSearch] = useState<RelatedSearch | null>(null);

  useEffect(() => {
    if (searchId) {
      fetchWebResults();
      trackPageView();
    }
  }, [searchId]);

  const fetchWebResults = async () => {
    // Fetch related search info with blog details
    const { data: searchData } = await supabase
      .from('related_searches')
      .select(`
        *,
        blogs (
          title,
          slug,
          category_id,
          categories (
            name
          )
        )
      `)
      .eq('id', searchId)
      .single();
    
    if (searchData) {
      setRelatedSearch(searchData);
    }

    // Fetch web results
    const { data: resultsData } = await supabase
      .from('web_results')
      .select('*')
      .eq('related_search_id', searchId)
      .order('order_index');
    
    if (resultsData) {
      // Sort sponsored results to the top
      const sortedResults = resultsData.sort((a, b) => {
        if (a.is_sponsored && !b.is_sponsored) return -1;
        if (!a.is_sponsored && b.is_sponsored) return 1;
        return a.order_index - b.order_index;
      });
      setWebResults(sortedResults);
    }
  };

  const handleVisitClick = (resultId: string) => {
    if (searchId) {
      trackVisitNowClick(searchId);
    }
  };

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  // Get favicon URL
  const getFaviconUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {relatedSearch && (
            <div className="mb-6">
              {relatedSearch.blogs && (
                <div className="mb-3">
                  <Link
                    to={`/blog/${relatedSearch.blogs.categories?.name.toLowerCase().replace(/\s+/g, '-')}/${relatedSearch.blogs.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    ← Back to: {relatedSearch.blogs.title}
                  </Link>
                </div>
              )}
              <h1 className="text-2xl font-medium text-foreground">{relatedSearch.search_text}</h1>
            </div>
          )}

          <div className="space-y-8">
            {webResults.map((result) => (
              <Link
                key={result.id}
                to={`/pre-landing/${searchId}`}
                onClick={() => handleVisitClick(result.id)}
                className="block group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <img
                      src={result.logo_url || getFaviconUrl(result.url) || ''}
                      alt=""
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-foreground">{getDomain(result.url)}</span>
                      {result.is_sponsored && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium">
                          Sponsored
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">{result.url}</span>
                    <h2 className="text-xl text-primary group-hover:underline mt-1">
                      {result.title}
                    </h2>
                    {result.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{result.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WebResults;