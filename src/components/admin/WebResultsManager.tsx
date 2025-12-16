import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Copy, Download, CheckCircle, XCircle, Sparkles, Loader2 } from "lucide-react";

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

interface GeneratedWebResult {
  name: string;
  title: string;
  description: string;
  url: string;
  is_sponsored: boolean;
  selected: boolean;
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

  // AI Generation state
  const [selectedSearchForAI, setSelectedSearchForAI] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedWebResult[]>([]);

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

  const generateWebResults = async () => {
    if (!selectedSearchForAI) {
      toast.error("Please select a related search first");
      return;
    }

    const search = searches.find(s => s.id === selectedSearchForAI);
    if (!search) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generateWebResults: true,
            searchText: search.search_text,
            category: "general"
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate web results");

      const data = await response.json();
      if (data.webResults && data.webResults.length > 0) {
        const resultsWithSelection = data.webResults.map((r: any) => ({
          ...r,
          is_sponsored: false,
          selected: false
        }));
        setGeneratedResults(resultsWithSelection);
        toast.success(`Generated ${data.webResults.length} web results!`);
      }
    } catch (error) {
      console.error("Error generating web results:", error);
      toast.error("Failed to generate web results");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGeneratedResultSelection = (index: number) => {
    const selectedCount = generatedResults.filter(r => r.selected).length;
    setGeneratedResults(prev => prev.map((r, i) => {
      if (i === index) {
        if (r.selected) return { ...r, selected: false };
        if (selectedCount < 4) return { ...r, selected: true };
      }
      return r;
    }));
  };

  const updateGeneratedResult = (index: number, field: keyof GeneratedWebResult, value: string | boolean) => {
    setGeneratedResults(prev => prev.map((r, i) => 
      i === index ? { ...r, [field]: value } : r
    ));
  };

  const saveSelectedResults = async () => {
    const selectedResultsToSave = generatedResults.filter(r => r.selected);
    if (selectedResultsToSave.length === 0) {
      toast.error("Please select at least one result to save");
      return;
    }

    try {
      for (let i = 0; i < selectedResultsToSave.length; i++) {
        const result = selectedResultsToSave[i];
        const { error } = await supabase
          .from('web_results')
          .insert([{
            related_search_id: selectedSearchForAI,
            title: result.title,
            url: result.url,
            description: result.description,
            logo_url: null,
            is_sponsored: result.is_sponsored,
            order_index: i
          }]);
        
        if (error) throw error;
      }
      
      toast.success(`Saved ${selectedResultsToSave.length} web results!`);
      setGeneratedResults([]);
      setSelectedSearchForAI("");
      fetchResults();
    } catch (error) {
      console.error("Error saving web results:", error);
      toast.error("Failed to save web results");
    }
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

  // Bulk actions
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
    const headers = ['ID', 'Related Search', 'Title', 'URL', 'Description', 'Is Sponsored'];
    const csvContent = [
      headers.join(','),
      ...data.map(result => [
        result.id,
        `"${getSearchText(result.related_search_id).replace(/"/g, '""')}"`,
        `"${result.title.replace(/"/g, '""')}"`,
        result.url,
        `"${(result.description || '').replace(/"/g, '""')}"`,
        result.is_sponsored
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

  const handleCopySelected = () => {
    const selected = results.filter(r => selectedIds.has(r.id));
    const links = selected.map(r => r.url).join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`Copied ${selected.length} URLs`);
  };

  const handleMarkSponsored = async () => {
    const { error } = await supabase
      .from('web_results')
      .update({ is_sponsored: true })
      .in('id', Array.from(selectedIds));
    
    if (!error) {
      toast.success(`Marked ${selectedIds.size} as sponsored`);
      fetchResults();
      setSelectedIds(new Set());
    }
  };

  const handleRemoveSponsored = async () => {
    const { error } = await supabase
      .from('web_results')
      .update({ is_sponsored: false })
      .in('id', Array.from(selectedIds));
    
    if (!error) {
      toast.success(`Removed sponsored from ${selectedIds.size}`);
      fetchResults();
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} results?`)) return;
    
    const { error } = await supabase
      .from('web_results')
      .delete()
      .in('id', Array.from(selectedIds));
    
    if (!error) {
      toast.success(`Deleted ${selectedIds.size} results`);
      setSelectedIds(new Set());
      fetchResults();
    }
  };

  const selectedCount = generatedResults.filter(r => r.selected).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Web Results</h2>
          <p className="text-sm text-muted-foreground">Manage web results for each page</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Result
        </Button>
      </div>

      {/* AI Web Results Generator */}
      <div className="bg-card border border-primary/30 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Web Results Generator</h3>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Related Search</label>
          <div className="flex gap-2">
            <Select value={selectedSearchForAI} onValueChange={setSelectedSearchForAI}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a related search" />
              </SelectTrigger>
              <SelectContent>
                {searches.map((search) => (
                  <SelectItem key={search.id} value={search.id}>
                    {search.blogs?.title} ››› {search.search_text} (wr={search.wr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={generateWebResults} 
              disabled={isGenerating || !selectedSearchForAI}
              className="bg-primary hover:bg-primary/90"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate 6 Web Results</>
              )}
            </Button>
          </div>
        </div>

        {generatedResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Edit & Select Web Results (max 4) - You can edit before saving</h4>
              <span className="text-sm text-muted-foreground">{selectedCount}/4 selected</span>
            </div>
            <p className="text-xs text-muted-foreground">Selected results will be added to wr={searches.find(s => s.id === selectedSearchForAI)?.wr}</p>
            
            {generatedResults.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${result.selected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={result.selected}
                    onCheckedChange={() => toggleGeneratedResultSelection(index)}
                    disabled={!result.selected && selectedCount >= 4}
                    className="mt-1"
                  />
                  <div className="flex-1 grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Name</label>
                      <Input
                        value={result.name}
                        onChange={(e) => updateGeneratedResult(index, 'name', e.target.value)}
                        placeholder="Brand/Company name"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground">Title</label>
                        <Input
                          value={result.title}
                          onChange={(e) => updateGeneratedResult(index, 'title', e.target.value)}
                          placeholder="Result title"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap pb-2">
                        <input
                          type="checkbox"
                          checked={result.is_sponsored}
                          onChange={(e) => updateGeneratedResult(index, 'is_sponsored', e.target.checked)}
                          className="w-4 h-4"
                        />
                        Sponsored
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea
                        value={result.description}
                        onChange={(e) => updateGeneratedResult(index, 'description', e.target.value)}
                        rows={2}
                        placeholder="Description"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Link</label>
                      <Input
                        value={result.url}
                        onChange={(e) => updateGeneratedResult(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button onClick={saveSelectedResults} disabled={selectedCount === 0} className="bg-primary">
                Save {selectedCount} Selected Results
              </Button>
              <Button variant="outline" onClick={() => setGeneratedResults([])}>
                Cancel
              </Button>
            </div>
          </div>
        )}
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_sponsored}
                onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Mark as Sponsored</label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingResult ? "Update" : "Create"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Bulk Actions */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedIds.size === results.length && results.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm">{selectedIds.size} of {results.length} selected</span>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(results, 'all-web-results.csv')}>
            <Download className="w-4 h-4 mr-1" />Export All
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopySelected} disabled={selectedIds.size === 0}>
            <Copy className="w-4 h-4 mr-1" />Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkSponsored} disabled={selectedIds.size === 0}>
            <CheckCircle className="w-4 h-4 mr-1" />Mark Sponsored
          </Button>
          <Button variant="outline" size="sm" onClick={handleRemoveSponsored} disabled={selectedIds.size === 0}>
            <XCircle className="w-4 h-4 mr-1" />Remove Sponsored
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
                <td className="px-6 py-4 text-sm">{getSearchText(result.related_search_id)}</td>
                <td className="px-6 py-4">{result.title}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">{result.url}</td>
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
