import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

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
}

const PreLandingManager = () => {
  const [configs, setConfigs] = useState<PreLandingConfig[]>([]);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PreLandingConfig | null>(null);
  const [formData, setFormData] = useState({
    related_search_id: "",
    logo_url: "",
    logo_position: "top-center",
    main_image_url: "",
    headline: "",
    description: "",
    background_color: "#ffffff",
    background_image_url: "",
    button_text: "Visit Now",
    destination_url: ""
  });

  useEffect(() => {
    fetchConfigs();
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    const { data } = await supabase.from('related_searches').select('id, search_text');
    if (data) setSearches(data);
  };

  const fetchConfigs = async () => {
    const { data } = await supabase.from('pre_landing_config').select('*');
    if (data) setConfigs(data);
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
      background_color: "#ffffff",
      background_image_url: "",
      button_text: "Visit Now",
      destination_url: ""
    });
    setEditingConfig(null);
    setIsCreating(false);
  };

  const getSearchText = (searchId: string) => {
    return searches.find(s => s.id === searchId)?.search_text || searchId;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Pre-Landing Pages</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Config
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">{editingConfig ? "Edit Config" : "Create New Config"}</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <label className="block text-sm font-medium mb-2">Logo URL</label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Logo Position</label>
              <Select value={formData.logo_position} onValueChange={(value) => setFormData({ ...formData, logo_position: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-center">Top Center</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Main Image URL</label>
              <Input
                value={formData.main_image_url}
                onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Background Color</label>
              <Input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Background Image URL</label>
              <Input
                value={formData.background_image_url}
                onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Headline</label>
              <Input
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Button Text</label>
              <Input
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Destination URL</label>
              <Input
                value={formData.destination_url}
                onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit">{editingConfig ? "Update" : "Create"} Config</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left">Search</th>
              <th className="px-6 py-3 text-left">Headline</th>
              <th className="px-6 py-3 text-left">Button Text</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id} className="border-t border-border">
                <td className="px-6 py-4">{getSearchText(config.related_search_id)}</td>
                <td className="px-6 py-4">{config.headline}</td>
                <td className="px-6 py-4">{config.button_text}</td>
                <td className="px-6 py-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreLandingManager;