import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface WebResult {
  id: string;
  related_search_id: string;
  title: string;
  url: string;
  description: string | null;
  logo_url: string | null;
  order_index: number;
}

interface RelatedSearch {
  id: string;
  search_text: string;
}

const WebResultsManager = () => {
  const [results, setResults] = useState<WebResult[]>([]);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [formData, setFormData] = useState({
    related_search_id: "",
    title: "",
    url: "",
    description: "",
    logo_url: "",
    order_index: "0"
  });

  useEffect(() => {
    fetchResults();
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase.from('related_searches').select('id, search_text');
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
      order_index: parseInt(formData.order_index)
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
      order_index: result.order_index.toString()
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
      order_index: "0"
    });
    setEditingResult(null);
    setIsCreating(false);
  };

  const getSearchText = (searchId: string) => {
    return searches.find(s => s.id === searchId)?.search_text || searchId;
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
                      {search.search_text}
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
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingResult ? "Update" : "Create"} Result</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left">Search</th>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">URL</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t border-border">
                <td className="px-6 py-4">{getSearchText(result.related_search_id)}</td>
                <td className="px-6 py-4">{result.title}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{result.url}</td>
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