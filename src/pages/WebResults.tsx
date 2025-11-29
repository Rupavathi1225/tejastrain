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
      setWebResults(resultsData);
    }
  };

  const handleVisitClick = (resultId: string) => {
    if (searchId) {
      trackVisitNowClick(searchId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-9">
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
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded text-sm font-bold">
                      WR-{relatedSearch.wr}
                    </span>
                    <h1 className="text-4xl font-bold">{relatedSearch.search_text}</h1>
                  </div>
                  <p className="text-muted-foreground">Sponsored results</p>
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
                          <h2 className="text-xl font-bold text-primary hover:underline">
                            {result.title}
                          </h2>
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

            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24">
                <RecentPosts />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WebResults;