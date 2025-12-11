import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecentPosts from "@/components/RecentPosts";
import { trackPageView, trackRelatedSearchClick } from "@/utils/analytics";
import { ChevronRight } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  content: string;
  category_id: number;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  order_index: number;
  wr: number;
}

const BlogPost = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    const { data: blogData } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (blogData) {
      setBlog(blogData);
      trackPageView(blogData.id);

      // Fetch category name
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('id', blogData.category_id)
        .single();
      
      if (categoryData) {
        setCategoryName(categoryData.name);
      }

      // Fetch related searches
      const { data: searchesData } = await supabase
        .from('related_searches')
        .select('*')
        .eq('blog_id', blogData.id)
        .order('order_index');
      
      if (searchesData) {
        setRelatedSearches(searchesData);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRelatedSearchClick = (searchId: string) => {
    trackRelatedSearchClick(searchId);
  };

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {blog.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold">{blog.author}</h3>
                      <p className="text-sm text-muted-foreground">Author</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Published on {formatDate(blog.published_at)}
                  </p>
                </div>
                
                <RecentPosts />
              </div>
            </aside>

            {/* Main Content */}
            <article className="lg:col-span-9">
              <div className="mb-6">
                <span className="text-sm px-3 py-1 bg-blog-category-badge rounded-full text-primary font-medium">
                  {categoryName}
                </span>
                <span className="text-sm text-muted-foreground ml-3">
                  • {formatDate(blog.published_at)}
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {blog.title}
              </h1>

              <div className="aspect-video mb-8 rounded-lg overflow-hidden">
                <img
                  src={blog.featured_image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b'}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="prose prose-lg max-w-none mb-12">
                {blog.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 leading-relaxed text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Related Searches */}
              {relatedSearches.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-6">Related searches</h3>
                  <div className="grid gap-4">
                    {relatedSearches.map((search) => (
                      <Link
                        key={search.id}
                        to={`/web-results/${search.id}?wr=${search.wr}`}
                        onClick={() => handleRelatedSearchClick(search.id)}
                        className="flex items-center justify-between p-4 bg-search-box-bg text-search-box-text rounded-lg hover:bg-black hover:text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group cursor-pointer"
                      >
                        <span className="font-medium">{search.search_text}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;