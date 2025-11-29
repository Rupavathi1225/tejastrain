import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: number;
  name: string;
}

const Header = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    if (data) setCategories(data);
  };

  return (
    <header className="bg-blog-nav-bg border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">TejasTarin</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-blog-nav-text hover:text-primary transition">
              Home
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-blog-nav-text hover:text-primary transition hidden md:block"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;