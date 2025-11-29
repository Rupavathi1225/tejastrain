import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface RelatedSearch {
  id: string;
  blog_id: string;
  search_text: string;
  order_index: number;
}

interface Blog {
  id: string;
  title: string;
}

const RelatedSearchesManager = () => {
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSearch, setEditingSearch] = useState<RelatedSearch | null>(null);
  const [formData, setFormData] = useState({
    blog_id: "",
    search_text: "",
    order_index: "0"
  });

  useEffect(() => {
    fetchSearches();
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    const { data } = await supabase
      .from('blogs')
      .select('id, title')
      .eq('status', 'published');
    if (data) setBlogs(data);
  };

  const fetchSearches = async () => {
    const { data } = await supabase
      .from('related_searches')
      .select('*')
      .order('blog_id, order_index');
    if (data) setSearches(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchData = {
      ...formData,
      order_index: parseInt(formData.order_index)
    };

    if (editingSearch) {
      const { error } = await supabase
        .from('related_searches')
        .update(searchData)
        .eq('id', editingSearch.id);
      
      if (error) {
        toast.error("Error updating search");
      } else {
        toast.success("Search updated successfully");
      }
    } else {
      const { error } = await supabase
        .from('related_searches')
        .insert([searchData]);
      
      if (error) {
        toast.error("Error creating search");
      } else {
        toast.success("Search created successfully");
      }
    }

    resetForm();
    fetchSearches();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this search?")) return;
    
    const { error } = await supabase
      .from('related_searches')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error("Error deleting search");
    } else {
      toast.success("Search deleted successfully");
      fetchSearches();
    }
  };

  const handleEdit = (search: RelatedSearch) => {
    setEditingSearch(search);
    setFormData({
      blog_id: search.blog_id,
      search_text: search.search_text,
      order_index: search.order_index.toString()
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({ blog_id: "", search_text: "", order_index: "0" });
    setEditingSearch(null);
    setIsCreating(false);
  };

  const getBlogTitle = (blogId: string) => {
    return blogs.find(b => b.id === blogId)?.title || blogId;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Related Searches</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Search
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">{editingSearch ? "Edit Search" : "Create New Search"}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Blog</label>
              <Select value={formData.blog_id} onValueChange={(value) => setFormData({ ...formData, blog_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blog" />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search Text</label>
              <Input
                value={formData.search_text}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Order Index</label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingSearch ? "Update" : "Create"} Search</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left">Blog</th>
              <th className="px-6 py-3 text-left">Search Text</th>
              <th className="px-6 py-3 text-left">Order</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((search) => (
              <tr key={search.id} className="border-t border-border">
                <td className="px-6 py-4">{getBlogTitle(search.blog_id)}</td>
                <td className="px-6 py-4">{search.search_text}</td>
                <td className="px-6 py-4">{search.order_index}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(search)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(search.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RelatedSearchesManager;