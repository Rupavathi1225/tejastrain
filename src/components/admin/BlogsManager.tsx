import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles, Loader2, Copy, Download, ExternalLink } from "lucide-react";

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
  const [selectedSearchIndices, setSelectedSearchIndices] = useState<number[]>([]);

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

  const generateContentAndSearches = async () => {
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            category: selectedCategory?.name || "general",
            imageOnly: false
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        content: data.content || prev.content
      }));
      
      if (data.relatedSearches && data.relatedSearches.length > 0) {
        setGeneratedSearches(data.relatedSearches);
        setSelectedSearchIndices([]);
        toast.success(`Generated content and ${data.relatedSearches.length} related searches!`);
      } else {
        toast.success("Content generated successfully!");
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            category: selectedCategory?.name || "general",
            imageOnly: true
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate image");

      const data = await response.json();
      
      if (data.imageUrl) {
        setFormData(prev => ({ ...prev, featured_image: data.imageUrl }));
        toast.success("Featured image generated!");
      }
    } catch (error) {
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSearchSelect = (index: number) => {
    setSelectedSearchIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else if (prev.length < 4) {
        return [...prev, index];
      }
      return prev;
    });
  };

  const handleSearchEdit = (index: number, newValue: string) => {
    setGeneratedSearches(prev => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
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
        // Save selected related searches with WR assignments
        if (selectedSearchIndices.length > 0 && newBlog) {
          const searchesToInsert = selectedSearchIndices.map((searchIndex, wrIndex) => ({
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
            toast.success(`Blog and ${selectedSearchIndices.length} related searches created successfully!`);
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
    if (!confirm("Are you sure you want to delete this blog? This will also delete all related data.")) return;
    await handleDeleteSingle(id);
    toast.success("Blog deleted successfully");
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
    setGeneratedSearches([]);
    setSelectedSearchIndices([]);
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
    setSelectedSearchIndices([]);
    setEditingBlog(null);
    setIsCreating(false);
  };

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

  const toggleBlogStatus = async (blog: Blog) => {
    const newStatus = blog.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('blogs')
      .update({ status: newStatus })
      .eq('id', blog.id);
    
    if (error) {
      toast.error("Error updating status");
    } else {
      fetchBlogs();
    }
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

  const handleExportAll = () => exportToCSV(blogs, 'all-blogs.csv');
  
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
    toast.success(`Copied ${selected.length} blog links`);
  };

  const handleActivateSelected = async () => {
    const { error } = await supabase
      .from('blogs')
      .update({ status: 'published' })
      .in('id', Array.from(selectedIds));
    
    if (!error) {
      toast.success(`Activated ${selectedIds.size} blogs`);
      fetchBlogs();
      setSelectedIds(new Set());
    }
  };

  const handleDeactivateSelected = async () => {
    const { error } = await supabase
      .from('blogs')
      .update({ status: 'draft' })
      .in('id', Array.from(selectedIds));
    
    if (!error) {
      toast.success(`Deactivated ${selectedIds.size} blogs`);
      fetchBlogs();
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} blogs?`)) return;
    for (const id of selectedIds) {
      await handleDeleteSingle(id);
    }
    toast.success(`Deleted ${selectedIds.size} blogs`);
    setSelectedIds(new Set());
    fetchBlogs();
  };

  const copySingleLink = (blog: Blog) => {
    const category = categories.find(c => c.id === blog.category_id);
    const categorySlug = category?.name.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
    const link = `${window.location.origin}/blog/${categorySlug}/${blog.slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  const openBlog = (blog: Blog) => {
    const category = categories.find(c => c.id === blog.category_id);
    const categorySlug = category?.name.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
    window.open(`/blog/${categorySlug}/${blog.slug}`, '_blank');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Blogs</h2>
        <Button onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Blog
        </Button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingBlog ? "Edit Blog" : "Create New Blog"}</h3>
            <p className="text-sm text-muted-foreground mb-6">Fill in the details to create a new blog post.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    title: e.target.value, 
                    slug: !editingBlog ? generateSlug(e.target.value) : formData.slug 
                  })}
                  placeholder="Enter blog title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slug *</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="blog-url-slug"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Author</label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
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
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    className="bg-primary/10 border-primary/30 hover:bg-primary/20"
                  >
                    {isGeneratingImage ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate AI Image</>
                    )}
                  </Button>
                </div>
                <Input
                  value={formData.featured_image}
                  onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                  placeholder="Or paste image URL here..."
                />
                {formData.featured_image && (
                  <img src={formData.featured_image} alt="Preview" className="mt-2 max-w-xs rounded-lg max-h-40 object-cover" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <div className="flex gap-2 mb-2">
                  <Button 
                    type="button" 
                    onClick={generateContentAndSearches} 
                    disabled={isGeneratingContent || !formData.title.trim()} 
                    variant="outline" 
                    size="sm"
                    className="bg-primary/10 border-primary/30 hover:bg-primary/20"
                  >
                    {isGeneratingContent ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate AI Content</>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  placeholder="Blog content..."
                />
              </div>

              {generatedSearches.length > 0 && (
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Edit & Select Related Searches for Landing Page (max 4)</h4>
                  <p className="text-xs text-muted-foreground mb-4">You can edit the search text before saving. Selected searches will appear on landing page.</p>
                  <div className="space-y-2">
                    {generatedSearches.map((search, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedSearchIndices.includes(index)}
                          onCheckedChange={() => handleSearchSelect(index)}
                          disabled={!selectedSearchIndices.includes(index) && selectedSearchIndices.length >= 4}
                        />
                        <Input
                          value={search}
                          onChange={(e) => handleSearchEdit(index, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{selectedSearchIndices.length}/4 selected</p>
                </div>
              )}

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

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingBlog ? "Update Blog" : "Create Blog"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedIds.size === blogs.length && blogs.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm">{selectedIds.size} of {blogs.length} selected</span>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="w-4 h-4 mr-1" />Export All CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportSelected} disabled={selectedIds.size === 0}>
            Export Selected
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopySelected} disabled={selectedIds.size === 0}>
            <Copy className="w-4 h-4 mr-1" />Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleActivateSelected} disabled={selectedIds.size === 0}>
            Activate
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeactivateSelected} disabled={selectedIds.size === 0}>
            Deactivate
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
            <Trash2 className="w-4 h-4 mr-1" />Delete
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
              <th className="px-6 py-3 text-left">Slug</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Active</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((blog) => {
              const category = categories.find(c => c.id === blog.category_id);
              return (
                <tr key={blog.id} className="border-t border-border">
                  <td className="px-4 py-4">
                    <Checkbox 
                      checked={selectedIds.has(blog.id)}
                      onCheckedChange={() => toggleSelect(blog.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{blog.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{blog.slug}</td>
                  <td className="px-6 py-4">{category?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      blog.status === 'published' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {blog.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Switch
                      checked={blog.status === 'published'}
                      onCheckedChange={() => toggleBlogStatus(blog)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copySingleLink(blog)} title="Copy link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openBlog(blog)} title="Open">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(blog)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(blog.id)} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlogsManager;
