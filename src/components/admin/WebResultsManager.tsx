import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Copy, Download, CheckCircle, XCircle } from "lucide-react";

interface WebResult {
  id: string;
  related_search_id: string;
  title: string;
  url: string;
  description: string | null;
  logo_url: string | null;
  order_index: number;
  is_sponsored: boolean;
}

interface RelatedSearch {
  id: string;
  search_text: string;
  wr: number;
  blog_id: string;
  blogs?: {
    title: string;
  };
}

const WebResultsManager = () => {
  const [results, setResults] = useState<WebResult[]>([]);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    related_search_id: "",
    title: "",
    url: "",
    description: "",
    logo_url: "",
    order_index: "0",
    is_sponsored: false
  });

  useEffect(() => {
    fetchResults();
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase
      .from('related_searches')
      .select('id, search_text, wr, blog_id, blogs(title)')
      .order('blog_id, wr');
    if (data) setSearches(data);
  };

  const fetchResults = async () => {
    const { data } = await supabase
      .from('web_results')
      .select('*')
      .order('related_search_id, order_index');
    if (data) setResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const resultData = {
      ...formData,
      order_index: parseInt(formData.order_index),
      is_sponsored: formData.is_sponsored
    };

    if (editingResult) {
      const { error } = await supabase
        .from('web_results')
        .update(resultData)
        .eq('id', editingResult.id);
      
      if (error) {
        toast.error("Error updating result");
      } else {
        toast.success("Result updated successfully");
      }
    } else {
      const { error } = await supabase
        .from('web_results')
        .insert([resultData]);
      
      if (error) {
        toast.error("Error creating result");
      } else {
        toast.success("Result created successfully");
      }
    }

    resetForm();
    fetchResults();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    
    const { error } = await supabase
      .from('web_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error("Error deleting result");
    } else {
      toast.success("Result deleted successfully");
      fetchResults();
    }
  };

  const handleEdit = (result: WebResult) => {
    setEditingResult(result);
    setFormData({
      related_search_id: result.related_search_id,
      title: result.title,
      url: result.url,
      description: result.description || "",
      logo_url: result.logo_url || "",
      order_index: result.order_index.toString(),
      is_sponsored: result.is_sponsored
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({
      related_search_id: "",
      title: "",
      url: "",
      description: "",
      logo_url: "",
      order_index: "0",
      is_sponsored: false
    });
    setEditingResult(null);
    setIsCreating(false);
  };

  const getSearchText = (searchId: string) => {
    const search = searches.find(s => s.id === searchId);
    if (!search) return searchId;
    const blogTitle = search.blogs?.title || 'Unknown Blog';
    return `${blogTitle} ››› ${search.search_text} ››› WR-${search.wr}`;
  };

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
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

  const exportToCSV = (data: WebResult[], filename: string) => {
    const headers = ['ID', 'Related Search', 'Title', 'URL', 'Description', 'Is Sponsored', 'Order Index'];
    const csvContent = [
      headers.join(','),
      ...data.map(result => [
        result.id,
        `"${getSearchText(result.related_search_id).replace(/"/g, '""')}"`,
        `"${result.title.replace(/"/g, '""')}"`,
        result.url,
        `"${(result.description || '').replace(/"/g, '""')}"`,
        result.is_sponsored,
        result.order_index
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} results`);
  };

  const handleExportAll = () => {
    exportToCSV(results, 'all-web-results.csv');
  };

  const handleExportSelected = () => {
    const selected = results.filter(r => selectedIds.has(r.id));
    exportToCSV(selected, 'selected-web-results.csv');
  };

  const handleCopySelected = () => {
    const selected = results.filter(r => selectedIds.has(r.id));
    const links = selected.map(r => r.url).join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`Copied ${selected.length} result URLs to clipboard`);
  };

  const handleActivateSelected = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('web_results')
      .update({ is_sponsored: true })
      .in('id', ids);
    
    if (error) {
      toast.error("Error marking as sponsored");
    } else {
      toast.success(`Marked ${ids.length} results as sponsored`);
      fetchResults();
      setSelectedIds(new Set());
    }
  };

  const handleDeactivateSelected = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('web_results')
      .update({ is_sponsored: false })
      .in('id', ids);
    
    if (error) {
      toast.error("Error removing sponsored status");
    } else {
      toast.success(`Removed sponsored status from ${ids.length} results`);
      fetchResults();
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} results?`)) return;
    
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('web_results')
      .delete()
      .in('id', ids);
    
    if (error) {
      toast.error("Error deleting results");
    } else {
      toast.success(`Deleted ${ids.length} results`);
      setSelectedIds(new Set());
      fetchResults();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Web Results</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Result
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">{editingResult ? "Edit Result" : "Create New Result"}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Related Search</label>
              <Select value={formData.related_search_id} onValueChange={(value) => setFormData({ ...formData, related_search_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select search" />
                </SelectTrigger>
                <SelectContent>
                  {searches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.blogs?.title} ››› {search.search_text} ››› WR-{search.wr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL</label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Logo URL</label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
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

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_sponsored}
                  onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Mark as Sponsored</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingResult ? "Update" : "Create"} Result</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Bulk Actions Bar */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedIds.size === results.length && results.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{selectedIds.size} of {results.length} selected</span>
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
            Mark Sponsored
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeactivateSelected} disabled={selectedIds.size === 0}>
            <XCircle className="w-4 h-4 mr-1" />
            Remove Sponsored
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
                  checked={selectedIds.size === results.length && results.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left">Blog › Related Search</th>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">URL</th>
              <th className="px-6 py-3 text-left">Sponsored</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t border-border">
                <td className="px-4 py-4">
                  <Checkbox 
                    checked={selectedIds.has(result.id)}
                    onCheckedChange={() => toggleSelect(result.id)}
                  />
                </td>
                <td className="px-6 py-4">{getSearchText(result.related_search_id)}</td>
                <td className="px-6 py-4">{result.title}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{result.url}</td>
                <td className="px-6 py-4">
                  {result.is_sponsored && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Sponsored
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(result)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(result.id)}>
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

export default WebResultsManager;
