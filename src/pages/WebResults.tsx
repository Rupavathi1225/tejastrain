import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecentPosts from "@/components/RecentPosts";
import { trackPageView, trackVisitNowClick } from "@/utils/analytics";
import { ExternalLink } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {relatedSearch && (
            <div className="mb-8">
              {relatedSearch.blogs && (
                <div className="mb-4">
                  <Link
                    to={`/blog/${relatedSearch.blogs.categories?.name.toLowerCase().replace(/\s+/g, '-')}/${relatedSearch.blogs.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    ← Back to: {relatedSearch.blogs.title}
                  </Link>
                </div>
              )}
              <h1 className="text-4xl font-bold">{relatedSearch.search_text}</h1>
            </div>
          )}

          <div className="space-y-6">
            {webResults.map((result) => (
              <div key={result.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  {result.logo_url && (
                    <div className="w-12 h-12 flex-shrink-0">
                      <img
                        src={result.logo_url}
                        alt={result.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-primary hover:underline">
                          {result.title}
                        </h2>
                        {result.is_sponsored && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded text-xs font-semibold">
                            Sponsored
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{result.url}</p>
                    {result.description && (
                      <p className="text-foreground mb-4">{result.description}</p>
                    )}
                    <Link
                      to={`/pre-landing/${searchId}`}
                      onClick={() => handleVisitClick(result.id)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WebResults;