import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles, Loader2, Copy, Download, CheckCircle, XCircle } from "lucide-react";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const [selectedSearches, setSelectedSearches] = useState<number[]>([]);

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
        toast.success("Featured image generated successfully!");
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
      category_id: parseInt(formData.category_id)
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
        if (selectedSearches.length === 4 && newBlog) {
          const searchesToInsert = selectedSearches.map((searchIndex, wrIndex) => ({
            blog_id: newBlog.id,
            search_text: generatedSearches[searchIndex],
            order_index: wrIndex,
            wr: wrIndex + 1
          }));
          
          const { error: searchError } = await supabase
            .from('related_searches')
            .insert(searchesToInsert);
          
          if (searchError) {
            console.error("Error saving related searches:", searchError);
            toast.error("Blog created but failed to save related searches");
          } else {
            toast.success("Blog and related searches created successfully!");
          }
        } else {
          toast.success("Blog created successfully");
        }
      }
    }

    resetForm();
    fetchBlogs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog? This will also delete all related searches, web results, analytics, and email submissions.")) return;
    
    try {
      const { data: relatedSearches } = await supabase
        .from('related_searches')
        .select('id')
        .eq('blog_id', id);
      
      if (relatedSearches && relatedSearches.length > 0) {
        const searchIds = relatedSearches.map(s => s.id);
        
        await supabase
          .from('email_submissions')
          .delete()
          .in('related_search_id', searchIds);
        
        await supabase
          .from('analytics_events')
          .delete()
          .in('related_search_id', searchIds);
        
        await supabase
          .from('pre_landing_config')
          .delete()
          .in('related_search_id', searchIds);
        
        await supabase
          .from('web_results')
          .delete()
          .in('related_search_id', searchIds);
      }
      
      await supabase
        .from('analytics_events')
        .delete()
        .eq('blog_id', id);
      
      await supabase
        .from('related_searches')
        .delete()
        .eq('blog_id', id);
      
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

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === blogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(blogs.map(b => b.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const exportToCSV = (data: Blog[], filename: string) => {
    const headers = ['ID', 'Title', 'Slug', 'Author', 'Status', 'Content'];
    const csvContent = [
      headers.join(','),
      ...data.map(blog => [
        blog.id,
        `"${blog.title.replace(/"/g, '""')}"`,
        blog.slug,
        blog.author,
        blog.status,
        `"${blog.content.replace(/"/g, '""').substring(0, 100)}..."`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} blogs`);
  };

  const handleExportAll = () => {
    exportToCSV(blogs, 'all-blogs.csv');
  };

  const handleExportSelected = () => {
    const selected = blogs.filter(b => selectedIds.has(b.id));
    exportToCSV(selected, 'selected-blogs.csv');
  };

  const handleCopySelected = () => {
    const selected = blogs.filter(b => selectedIds.has(b.id));
    const links = selected.map(b => {
      const category = categories.find(c => c.id === b.category_id);
      const categorySlug = category?.name.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
      return `${window.location.origin}/blog/${categorySlug}/${b.slug}`;
    }).join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`Copied ${selected.length} blog links to clipboard`);
  };

  const handleActivateSelected = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('blogs')
      .update({ status: 'published' })
      .in('id', ids);
    
    if (error) {
      toast.error("Error activating blogs");
    } else {
      toast.success(`Activated ${ids.length} blogs`);
      fetchBlogs();
      setSelectedIds(new Set());
    }
  };

  const handleDeactivateSelected = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('blogs')
      .update({ status: 'draft' })
      .in('id', ids);
    
    if (error) {
      toast.error("Error deactivating blogs");
    } else {
      toast.success(`Deactivated ${ids.length} blogs`);
      fetchBlogs();
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} blogs? This will also delete all related data.`)) return;
    
    for (const id of selectedIds) {
      await handleDeleteSingle(id);
    }
    
    toast.success(`Deleted ${selectedIds.size} blogs`);
    setSelectedIds(new Set());
    fetchBlogs();
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      const { data: relatedSearches } = await supabase
        .from('related_searches')
        .select('id')
        .eq('blog_id', id);
      
      if (relatedSearches && relatedSearches.length > 0) {
        const searchIds = relatedSearches.map(s => s.id);
        await supabase.from('email_submissions').delete().in('related_search_id', searchIds);
        await supabase.from('analytics_events').delete().in('related_search_id', searchIds);
        await supabase.from('pre_landing_config').delete().in('related_search_id', searchIds);
        await supabase.from('web_results').delete().in('related_search_id', searchIds);
      }
      
      await supabase.from('analytics_events').delete().eq('blog_id', id);
      await supabase.from('related_searches').delete().eq('blog_id', id);
      await supabase.from('blogs').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
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
                rows={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Featured Image</label>
              <div className="flex gap-2 mb-2">
                <Button 
                  type="button" 
                  onClick={generateImageOnly}
                  disabled={isGeneratingImage || !formData.title.trim()}
                  variant="outline"
                  size="sm"
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
              </div>
              <Input
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="Image URL"
              />
              {formData.featured_image && (
                <img src={formData.featured_image} alt="Preview" className="mt-2 max-w-xs rounded-lg" />
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

      {/* Bulk Actions Bar */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedIds.size === blogs.length && blogs.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{selectedIds.size} of {blogs.length} selected</span>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="w-4 h-4 mr-1" />
            Export All CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportSelected} disabled={selectedIds.size === 0}>
            <Download className="w-4 h-4 mr-1" />
            Export Selected ({selectedIds.size})
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopySelected} disabled={selectedIds.size === 0}>
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleActivateSelected} disabled={selectedIds.size === 0}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Activate
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeactivateSelected} disabled={selectedIds.size === 0}>
            <XCircle className="w-4 h-4 mr-1" />
            Deactivate
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete ({selectedIds.size})
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <Checkbox 
                  checked={selectedIds.size === blogs.length && blogs.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">Author</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((blog) => (
              <tr key={blog.id} className="border-t border-border">
                <td className="px-4 py-4">
                  <Checkbox 
                    checked={selectedIds.has(blog.id)}
                    onCheckedChange={() => toggleSelect(blog.id)}
                  />
                </td>
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
