import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

const RecentPosts = () => {
  const [recentPosts, setRecentPosts] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchRecentPosts();
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

  const fetchRecentPosts = async () => {
    const { data } = await supabase
      .from('blogs')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(4);
    if (data) setRecentPosts(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6">Recent posts</h3>
      <div className="space-y-4">
        {recentPosts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${categories[post.category_id]?.toLowerCase().replace(/\s+/g, '-')}/${post.slug}`}
            className="flex gap-4 group"
          >
            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden">
              <img
                src={post.featured_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                {categories[post.category_id]} • {formatDate(post.published_at)}
              </p>
              <h4 className="text-sm font-semibold group-hover:text-primary transition line-clamp-2">
                {post.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">By {post.author}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentPosts;