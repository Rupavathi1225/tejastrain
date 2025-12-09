import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  const navigate = useNavigate();
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [relatedSearch, setRelatedSearch] = useState<RelatedSearch | null>(null);
  const [hasPreLanding, setHasPreLanding] = useState(false);

  useEffect(() => {
    if (searchId) {
      fetchWebResults();
      checkPreLanding();
      trackPageView();
    }
  }, [searchId]);

  const checkPreLanding = async () => {
    const { data, error } = await supabase
      .from('pre_landing_config')
      .select('id')
      .eq('related_search_id', searchId)
      .maybeSingle();
    
    setHasPreLanding(!!data && !error);
  };

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

  const handleVisitClick = (e: React.MouseEvent, resultId: string, resultUrl: string) => {
    if (searchId) {
      trackVisitNowClick(searchId);
    }
    
    // If pre-landing exists, prevent default and navigate to pre-landing with destination URL
    if (hasPreLanding) {
      e.preventDefault();
      navigate(`/pre-landing/${searchId}`, { state: { destinationUrl: resultUrl } });
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

  // Generate masked URL for sponsored results
  const getMaskedUrl = (index: number) => {
    return `datacreditzone.lid${index + 1}`;
  };

  const sponsoredResults = webResults.filter(r => r.is_sponsored);
  const normalResults = webResults.filter(r => !r.is_sponsored);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Sponsored Results Section - Black Theme */}
        {sponsoredResults.length > 0 && (
          <div className="bg-[#1e2231] py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto space-y-10">
                {sponsoredResults.map((result, index) => (
                  <div key={result.id} className="space-y-2">
                    <h2 className="text-[#8ab4f8] text-lg font-medium underline decoration-1 underline-offset-4 uppercase tracking-wide">
                      {result.title}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Sponsored</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-400">{getMaskedUrl(index)}</span>
                      <span className="text-gray-500 ml-1">⋮</span>
                    </div>
                    {result.description && (
                      <p className="text-[#9aa0a6] text-sm italic">{result.description}</p>
                    )}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleVisitClick(e, result.id, result.url)}
                      className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold px-6 py-3 rounded transition-colors mt-2"
                    >
                      <span className="text-lg">➤</span>
                      <span>Visit Website</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Normal Results Section - White Theme */}
        {normalResults.length > 0 && (
          <div className="bg-white py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <p className="text-gray-500 text-sm mb-4">Web Results</p>
                <div className="space-y-6">
                  {normalResults.map((result, index) => (
                    <a
                      key={result.id}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleVisitClick(e, result.id, result.url)}
                      className="block group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                          <span className="text-sm text-gray-800 font-medium">datacreditzone.lid{sponsoredResults.length + index + 1}</span>
                          <span className="text-xs text-gray-500 block truncate">https://datacreditzone.lid{sponsoredResults.length + index + 1}</span>
                          <h2 className="text-xl text-[#1a0dab] group-hover:underline mt-1">
                            {result.title}
                          </h2>
                          {result.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{result.description}</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back link */}
        {relatedSearch?.blogs && (
          <div className="bg-white py-4 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <Link
                  to={`/blog/${relatedSearch.blogs.categories?.name.toLowerCase().replace(/\s+/g, '-')}/${relatedSearch.blogs.slug}`}
                  className="text-sm text-gray-500 hover:text-[#1a0dab]"
                >
                  ← Back to: {relatedSearch.blogs.title}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WebResults;