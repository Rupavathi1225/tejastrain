import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trackPageView } from "@/utils/analytics";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
}

const CategoryPage = () => {
  const { category: categorySlug } = useParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categorySlug) {
      fetchCategoryAndBlogs();
    }
  }, [categorySlug]);

  const fetchCategoryAndBlogs = async () => {
    setLoading(true);
    
    // Convert slug back to category name
    const categoryName = categorySlug?.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Fetch category
    const { data: categoryData } = await supabase
      .from('categories')
      .select('*')
      .ilike('name', categoryName || '')
      .single();

    if (categoryData) {
      setCategory(categoryData);

      // Fetch blogs for this category
      const { data: blogsData } = await supabase
        .from('blogs')
        .select('*')
        .eq('category_id', categoryData.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (blogsData) {
        setBlogs(blogsData);
      }
    }
    
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategorySlug = (categoryId: number) => {
    return category?.name.toLowerCase().replace(/\s+/g, '-') || '';
  };

  if (loading) {
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
          <h1 className="text-4xl font-bold mb-8">{category?.name}</h1>
          
          {blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">No blogs found in this category yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  to={`/blog/${getCategorySlug(blog.category_id)}/${blog.slug}`}
                  className="group"
                >
                  <article className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={blog.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        <span>{blog.author}</span>
                        <span>•</span>
                        <span>{formatDate(blog.published_at)}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition">
                        {blog.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryPage;
