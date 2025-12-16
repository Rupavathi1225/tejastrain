import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Sparkles, Loader2, Eye, Trash2 } from "lucide-react";

interface PreLandingConfig {
  id: string;
  related_search_id: string;
  logo_url: string | null;
  logo_position: string;
  main_image_url: string | null;
  headline: string | null;
  description: string | null;
  background_color: string;
  background_image_url: string | null;
  button_text: string;
  destination_url: string | null;
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

interface WebResult {
  id: string;
  title: string;
  related_search_id: string;
}

const PreLandingManager = () => {
  const [configs, setConfigs] = useState<PreLandingConfig[]>([]);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PreLandingConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWebResult, setSelectedWebResult] = useState("");
  const [formData, setFormData] = useState({
    related_search_id: "",
    logo_url: "",
    logo_position: "top-center",
    main_image_url: "",
    headline: "",
    description: "",
    background_color: "#1a1a2e",
    background_image_url: "",
    button_text: "Get Started",
    destination_url: ""
  });

  useEffect(() => {
    fetchConfigs();
    fetchSearches();
    fetchWebResults();
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase
      .from('related_searches')
      .select('id, search_text, wr, blog_id, blogs(title)')
      .order('blog_id, wr');
    if (data) setSearches(data);
  };

  const fetchWebResults = async () => {
    const { data } = await supabase
      .from('web_results')
      .select('id, title, related_search_id')
      .order('related_search_id, order_index');
    if (data) setWebResults(data);
  };

  const fetchConfigs = async () => {
    const { data } = await supabase.from('pre_landing_config').select('*');
    if (data) setConfigs(data);
  };

  const generateWithAI = async () => {
    if (!selectedWebResult) {
      toast.error("Please select a web result first");
      return;
    }

    const webResult = webResults.find(w => w.id === selectedWebResult);
    if (!webResult) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatePreLanding: true,
            webResultTitle: webResult.title,
            category: "general"
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate pre-landing content");

      const data = await response.json();
      if (data.preLanding) {
        setFormData(prev => ({
          ...prev,
          related_search_id: webResult.related_search_id,
          headline: data.preLanding.headline || "",
          description: data.preLanding.description || "",
          button_text: data.preLanding.buttonText || "Get Started",
          main_image_url: data.preLanding.mainImageUrl || ""
        }));
        toast.success("Pre-landing content generated!");
      }
    } catch (error) {
      console.error("Error generating pre-landing:", error);
      toast.error("Failed to generate pre-landing content");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this pre-landing page?")) return;

    const { error } = await supabase
      .from('pre_landing_config')
      .delete()
      .eq('id', configId);

    if (error) {
      toast.error("Error deleting pre-landing");
    } else {
      toast.success("Pre-landing deleted successfully");
      fetchConfigs();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingConfig) {
      const { error } = await supabase
        .from('pre_landing_config')
        .update(formData)
        .eq('id', editingConfig.id);
      
      if (error) {
        toast.error("Error updating config");
      } else {
        toast.success("Config updated successfully");
      }
    } else {
      const { error } = await supabase
        .from('pre_landing_config')
        .insert([formData]);
      
      if (error) {
        toast.error("Error creating config");
      } else {
        toast.success("Config created successfully");
      }
    }

    resetForm();
    fetchConfigs();
  };

  const handleEdit = (config: PreLandingConfig) => {
    setEditingConfig(config);
    setFormData({
      related_search_id: config.related_search_id,
      logo_url: config.logo_url || "",
      logo_position: config.logo_position,
      main_image_url: config.main_image_url || "",
      headline: config.headline || "",
      description: config.description || "",
      background_color: config.background_color,
      background_image_url: config.background_image_url || "",
      button_text: config.button_text,
      destination_url: config.destination_url || ""
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({
      related_search_id: "",
      logo_url: "",
      logo_position: "top-center",
      main_image_url: "",
      headline: "",
      description: "",
      background_color: "#1a1a2e",
      background_image_url: "",
      button_text: "Get Started",
      destination_url: ""
    });
    setSelectedWebResult("");
    setEditingConfig(null);
    setIsCreating(false);
  };

  const getSearchText = (searchId: string) => {
    const search = searches.find(s => s.id === searchId);
    if (!search) return searchId;
    return `${search.blogs?.title || 'Unknown'} ››› ${search.search_text}`;
  };

  // When web result is selected, auto-set the related_search_id
  const handleWebResultSelect = (webResultId: string) => {
    setSelectedWebResult(webResultId);
    const webResult = webResults.find(w => w.id === webResultId);
    if (webResult) {
      setFormData(prev => ({ ...prev, related_search_id: webResult.related_search_id }));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Pre-Landing Pages</h2>
          <p className="text-sm text-muted-foreground">Create and manage pre-landing pages with email capture</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Pre-Landing
        </Button>
      </div>

      {/* Existing Pre-Landings Grid */}
      {!isCreating && configs.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Existing Pre-Landings ({configs.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <div key={config.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm truncate flex-1">{config.headline || "Untitled"}</h4>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{config.description || "No description"}</p>
                <p className="text-xs text-muted-foreground mb-3">{getSearchText(config.related_search_id)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="w-3 h-3 mr-1" />Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(config.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">{editingConfig ? "Edit Pre-Landing" : "Create Pre-Landing"}</h3>
            <p className="text-sm text-muted-foreground mb-6">Configure your pre-landing page settings</p>
            
            {/* Web Result Selection & AI Generation */}
            {!editingConfig && (
              <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium mb-2">Select Web Result *</label>
                <div className="flex gap-2">
                  <Select value={selectedWebResult} onValueChange={handleWebResultSelect}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a web result" />
                    </SelectTrigger>
                    <SelectContent>
                      {webResults.map((wr) => {
                        const search = searches.find(s => s.id === wr.related_search_id);
                        return (
                          <SelectItem key={wr.id} value={wr.id}>
                            {search?.blogs?.title} ››› {search?.search_text} ››› {wr.title}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button"
                    onClick={generateWithAI} 
                    disabled={isGenerating || !selectedWebResult}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>
                    )}
                  </Button>
                </div>
                {selectedWebResult && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Pre-landing will be linked to: {searches.find(s => s.id === formData.related_search_id)?.search_text}
                  </p>
                )}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Logo URL</label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Main Image URL</label>
                  <Input
                    value={formData.main_image_url}
                    onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-155674..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Headline *</label>
                <Input
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Get Exclusive Access!"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe what users will get..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Placeholder</label>
                  <Input
                    value="Enter your email"
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">CTA Button Text</label>
                  <Input
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    placeholder="Get Started"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      placeholder="#1a1a2e"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Background Image URL (optional)</label>
                  <Input
                    value={formData.background_image_url}
                    onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                    placeholder="https://example.com/background.jpg"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="bg-primary">
                  {editingConfig ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isCreating && configs.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No pre-landing pages yet</p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Pre-Landing
          </Button>
        </div>
      )}
    </div>
  );
};

export default PreLandingManager;
