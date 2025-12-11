import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Copy, Download } from "lucide-react";

interface RelatedSearch {
  id: string;
  blog_id: string;
  search_text: string;
  order_index: number;
  wr: number;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    blog_id: "",
    search_text: "",
    order_index: "0",
    wr: "1"
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
      order_index: parseInt(formData.order_index),
      wr: parseInt(formData.wr)
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
    if (!confirm("Are you sure you want to delete this search? This will also delete all web results, pre-landing configs, analytics, and email submissions.")) return;
    
    try {
      await supabase.from('email_submissions').delete().eq('related_search_id', id);
      await supabase.from('analytics_events').delete().eq('related_search_id', id);
      await supabase.from('pre_landing_config').delete().eq('related_search_id', id);
      await supabase.from('web_results').delete().eq('related_search_id', id);
      
      const { error } = await supabase
        .from('related_searches')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error("Error deleting search: " + error.message);
      } else {
        toast.success("Search deleted successfully");
        fetchSearches();
      }
    } catch (err) {
      toast.error("Error deleting search");
      console.error(err);
    }
  };

  const handleEdit = (search: RelatedSearch) => {
    setEditingSearch(search);
    setFormData({
      blog_id: search.blog_id,
      search_text: search.search_text,
      order_index: search.order_index.toString(),
      wr: search.wr.toString()
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({ blog_id: "", search_text: "", order_index: "0", wr: "1" });
    setEditingSearch(null);
    setIsCreating(false);
  };

  const getBlogTitle = (blogId: string) => {
    return blogs.find(b => b.id === blogId)?.title || blogId;
  };

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === searches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searches.map(s => s.id)));
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

  const exportToCSV = (data: RelatedSearch[], filename: string) => {
    const headers = ['ID', 'Blog', 'Search Text', 'WR', 'Order Index'];
    const csvContent = [
      headers.join(','),
      ...data.map(search => [
        search.id,
        `"${getBlogTitle(search.blog_id).replace(/"/g, '""')}"`,
        `"${search.search_text.replace(/"/g, '""')}"`,
        search.wr,
        search.order_index
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} searches`);
  };

  const handleExportAll = () => {
    exportToCSV(searches, 'all-related-searches.csv');
  };

  const handleExportSelected = () => {
    const selected = searches.filter(s => selectedIds.has(s.id));
    exportToCSV(selected, 'selected-related-searches.csv');
  };

  const handleCopySelected = () => {
    const selected = searches.filter(s => selectedIds.has(s.id));
    const links = selected.map(s => `${window.location.origin}/web-results/${s.id}?wr=${s.wr}`).join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`Copied ${selected.length} search links to clipboard`);
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} searches? This will also delete all related data.`)) return;
    
    for (const id of selectedIds) {
      try {
        await supabase.from('email_submissions').delete().eq('related_search_id', id);
        await supabase.from('analytics_events').delete().eq('related_search_id', id);
        await supabase.from('pre_landing_config').delete().eq('related_search_id', id);
        await supabase.from('web_results').delete().eq('related_search_id', id);
        await supabase.from('related_searches').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    
    toast.success(`Deleted ${selectedIds.size} searches`);
    setSelectedIds(new Set());
    fetchSearches();
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

            <div>
              <label className="block text-sm font-medium mb-2">WR (Web Result Set)</label>
              <Select value={formData.wr} onValueChange={(value) => setFormData({ ...formData, wr: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select WR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">WR-1</SelectItem>
                  <SelectItem value="2">WR-2</SelectItem>
                  <SelectItem value="3">WR-3</SelectItem>
                  <SelectItem value="4">WR-4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingSearch ? "Update" : "Create"} Search</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Bulk Actions Bar */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedIds.size === searches.length && searches.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{selectedIds.size} of {searches.length} selected</span>
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
                  checked={selectedIds.size === searches.length && searches.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left">Blog</th>
              <th className="px-6 py-3 text-left">Search Text</th>
              <th className="px-6 py-3 text-left">WR</th>
              <th className="px-6 py-3 text-left">Order</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((search) => (
              <tr key={search.id} className="border-t border-border">
                <td className="px-4 py-4">
                  <Checkbox 
                    checked={selectedIds.has(search.id)}
                    onCheckedChange={() => toggleSelect(search.id)}
                  />
                </td>
                <td className="px-6 py-4">{getBlogTitle(search.blog_id)}</td>
                <td className="px-6 py-4">{search.search_text}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                    WR-{search.wr}
                  </span>
                </td>
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
