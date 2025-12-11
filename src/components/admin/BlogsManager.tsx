import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles, Loader2, Copy } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  category_id: number;
  author: string;
  content: string;
  featured_image: string | null;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

const BlogsManager = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category_id: "",
    author: "",
    content: "",
    featured_image: "",
    status: "published"
  });
  const [generatedSearches, setGeneratedSearches] = useState<string[]>([]);
  const [selectedSearches, setSelectedSearches] = useState<number[]>([]); // indices of selected searches

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const fetchBlogs = async () => {
    const { data } = await supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBlogs(data);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const generateContentOnly = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingContent(true);
    const selectedCategory = categories.find(c => c.id.toString() === formData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            category: selectedCategory?.name || "general",
            imageOnly: false
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      
      if (data.content) {
        setFormData(prev => ({
          ...prev,
          content: data.content
        }));
        
        if (data.relatedSearches && data.relatedSearches.length > 0) {
          setGeneratedSearches(data.relatedSearches);
          toast.success(`Content and ${data.relatedSearches.length} related searches generated!`);
        } else {
          toast.success("Content generated successfully!");
        }
      } else {
        toast.error("No content was generated");
      }
    } catch (error) {
      console.error("Content generation error:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const generateImageOnly = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    const selectedCategory = categories.find(c => c.id.toString() === formData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            category: selectedCategory?.name || "general",
            imageOnly: true
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setFormData(prev => ({
          ...prev,
          featured_image: data.imageUrl
        }));
        toast.success("Image generated successfully!");
      } else {
        toast.error("No image was generated");
      }
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const blogData = {
      ...formData,
      category_id: parseInt(formData.category_id),
      slug: formData.slug || generateSlug(formData.title)
    };

    if (editingBlog) {
      const { error } = await supabase
        .from('blogs')
        .update(blogData)
        .eq('id', editingBlog.id);
      
      if (error) {
        toast.error("Error updating blog");
      } else {
        toast.success("Blog updated successfully");
      }
    } else {
      const { data: newBlog, error } = await supabase
        .from('blogs')
        .insert([blogData])
        .select()
        .single();
      
      if (error) {
        toast.error("Error creating blog");
      } else {
        // Insert selected related searches (exactly 4 with WR 1-4)
        if (selectedSearches.length === 4 && newBlog) {
          const searchesToInsert = selectedSearches.map((searchIndex, wrIndex) => ({
            blog_id: newBlog.id,
            search_text: generatedSearches[searchIndex],
            order_index: wrIndex,
            wr: wrIndex + 1 // WR 1-4
          }));
          
          const { error: searchError } = await supabase
            .from('related_searches')
            .insert(searchesToInsert);
          
          if (searchError) {
            console.error("Error inserting related searches:", searchError);
          }
        }
        toast.success("Blog created successfully");
      }
    }

    resetForm();
    fetchBlogs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog? This will also delete all related searches, web results, pre-landing configs, analytics, and email submissions.")) return;
    
    try {
      // Get all related searches for this blog
      const { data: relatedSearches } = await supabase
        .from('related_searches')
        .select('id')
        .eq('blog_id', id);
      
      if (relatedSearches && relatedSearches.length > 0) {
        const relatedSearchIds = relatedSearches.map(rs => rs.id);
        
        // Delete email submissions linked to related searches
        await supabase
          .from('email_submissions')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete analytics events linked to related searches
        await supabase
          .from('analytics_events')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete pre-landing configs linked to related searches
        await supabase
          .from('pre_landing_config')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete web results linked to related searches
        await supabase
          .from('web_results')
          .delete()
          .in('related_search_id', relatedSearchIds);
        
        // Delete related searches
        await supabase
          .from('related_searches')
          .delete()
          .eq('blog_id', id);
      }
      
      // Delete analytics events linked directly to blog
      await supabase
        .from('analytics_events')
        .delete()
        .eq('blog_id', id);
      
      // Finally delete the blog
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error("Error deleting blog: " + error.message);
      } else {
        toast.success("Blog deleted successfully");
        fetchBlogs();
      }
    } catch (err) {
      toast.error("Error deleting blog");
      console.error(err);
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      category_id: blog.category_id.toString(),
      author: blog.author,
      content: blog.content,
      featured_image: blog.featured_image || "",
      status: blog.status
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      category_id: "",
      author: "",
      content: "",
      featured_image: "",
      status: "published"
    });
    setGeneratedSearches([]);
    setSelectedSearches([]);
    setEditingBlog(null);
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Blogs</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Blog
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">{editingBlog ? "Edit Blog" : "Create New Blog"}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (!editingBlog) {
                    setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) });
                  }
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Author</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content *</label>
              <Button 
                type="button" 
                onClick={generateContentOnly}
                disabled={isGeneratingContent || !formData.title.trim()}
                variant="outline"
                size="sm"
                className="mb-2"
              >
                {isGeneratingContent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Content
                  </>
                )}
              </Button>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
                placeholder="Enter blog content or generate with AI..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Featured Image</label>
              <Button 
                type="button" 
                onClick={generateImageOnly}
                disabled={isGeneratingImage || !formData.title.trim()}
                variant="outline"
                size="sm"
                className="mb-2"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Image
                  </>
                )}
              </Button>
              <Input
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="Or paste image URL here..."
              />
              {formData.featured_image && (
                <img 
                  src={formData.featured_image} 
                  alt="Featured preview" 
                  className="mt-2 max-h-40 rounded-lg object-cover"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generatedSearches.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Select 4 Related Searches (WR 1-4) - Selected: {selectedSearches.length}/4
                </label>
                <div className="space-y-2">
                  {generatedSearches.map((search, index) => {
                    const selectionIndex = selectedSearches.indexOf(index);
                    const isSelected = selectionIndex !== -1;
                    const wrNumber = isSelected ? selectionIndex + 1 : null;
                    
                    return (
                      <div 
                        key={index} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSearches(prev => prev.filter(i => i !== index));
                          } else if (selectedSearches.length < 4) {
                            setSelectedSearches(prev => [...prev, index]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : selectedSearches.length >= 4 
                              ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' 
                              : 'bg-card border border-border hover:bg-muted'
                        }`}
                      >
                        <span className="text-sm">{search}</span>
                        {wrNumber && (
                          <span className="px-2 py-1 bg-primary-foreground text-primary rounded text-xs font-bold">
                            WR-{wrNumber}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to select/deselect. Selection order determines WR number (1st click = WR-1, etc.)
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingBlog ? "Update" : "Create"} Blog</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">Author</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((blog) => (
              <tr key={blog.id} className="border-t border-border">
                <td className="px-6 py-4">{blog.title}</td>
                <td className="px-6 py-4">{blog.author}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    blog.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {blog.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const category = categories.find(c => c.id === blog.category_id);
                        const categorySlug = category?.name.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
                        const blogUrl = `${window.location.origin}/blog/${categorySlug}/${blog.slug}`;
                        navigator.clipboard.writeText(blogUrl);
                        toast.success("Blog link copied!");
                      }}
                      title="Copy blog link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(blog)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(blog.id)}>
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

export default BlogsManager;