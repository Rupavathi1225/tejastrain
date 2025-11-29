import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trackPageView, trackBlogClick } from "@/utils/analytics";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  category_id: number;
  content: string;
}

interface Category {
  id: number;
  name: string;
}

const Index = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Record<number, string>>({});

  useEffect(() => {
    trackPageView();
    fetchBlogs();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      const categoryMap: Record<number, string> = {};
      data.forEach((cat: Category) => {
        categoryMap[cat.id] = cat.name;
      });
      setCategories(categoryMap);
    }
  };

  const fetchBlogs = async () => {
    const { data } = await supabase
      .from('blogs')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (data) setBlogs(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategorySlug = (categoryId: number) => {
    return categories[categoryId]?.toLowerCase().replace(/\s+/g, '-') || '';
  };

  const handleBlogClick = (blogId: string) => {
    trackBlogClick(blogId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Latest Articles</h1>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, index) => (
              <Link
                key={blog.id}
                to={`/blog/${getCategorySlug(blog.category_id)}/${blog.slug}`}
                onClick={() => handleBlogClick(blog.id)}
                className="group"
              >
                <article className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={blog.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-3 py-1 bg-blog-category-badge rounded-full text-primary font-medium">
                        {categories[blog.category_id]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(blog.published_at)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition line-clamp-2">
                      {blog.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {blog.content.substring(0, 150)}...
                    </p>
                    <p className="text-sm text-muted-foreground">By {blog.author}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;