import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Check, Edit2, X } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

interface WebResult {
  title: string;
  description: string;
  url: string;
  name: string;
  is_sponsored?: boolean;
}

interface PreLanding {
  headline: string;
  description: string;
  buttonText: string;
  mainImageUrl: string;
}

interface BlogCreationWizardProps {
  categories: Category[];
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'blog' | 'related-searches' | 'web-results' | 'pre-landing' | 'review';

const BlogCreationWizard = ({ categories, onComplete, onCancel }: BlogCreationWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('blog');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Blog data
  const [blogData, setBlogData] = useState({
    title: "",
    slug: "",
    category_id: "",
    author: "",
    content: "",
    featured_image: "",
    status: "published"
  });
  
  // Related searches
  const [generatedSearches, setGeneratedSearches] = useState<string[]>([]);
  const [selectedSearches, setSelectedSearches] = useState<number[]>([]);
  const [editingSearchIndex, setEditingSearchIndex] = useState<number | null>(null);
  const [editSearchValue, setEditSearchValue] = useState("");
  
  // Web results for each selected search
  const [webResultsMap, setWebResultsMap] = useState<Record<number, WebResult[]>>({});
  const [selectedWebResultsMap, setSelectedWebResultsMap] = useState<Record<number, number[]>>({});
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [editingWebResult, setEditingWebResult] = useState<{searchIdx: number, resultIdx: number} | null>(null);
  const [editWebResultValue, setEditWebResultValue] = useState<WebResult | null>(null);
  
  // Pre-landing configs
  const [preLandingMap, setPreLandingMap] = useState<Record<string, PreLanding>>({});
  const [currentPreLandingKey, setCurrentPreLandingKey] = useState("");
  const [editingPreLanding, setEditingPreLanding] = useState(false);
  const [editPreLandingValue, setEditPreLandingValue] = useState<PreLanding | null>(null);

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const generateBlogContent = async () => {
    if (!blogData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGenerating(true);
    const selectedCategory = categories.find(c => c.id.toString() === blogData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: blogData.title,
            category: selectedCategory?.name || "general",
            imageOnly: false
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();
      
      setBlogData(prev => ({
        ...prev,
        content: data.content || prev.content,
        featured_image: data.imageUrl || prev.featured_image
      }));
      
      if (data.relatedSearches && data.relatedSearches.length > 0) {
        setGeneratedSearches(data.relatedSearches);
        toast.success(`Generated content and ${data.relatedSearches.length} related searches!`);
      } else {
        toast.success("Content generated successfully!");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImageOnly = async () => {
    if (!blogData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    const selectedCategory = categories.find(c => c.id.toString() === blogData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: blogData.title,
            category: selectedCategory?.name || "general",
            imageOnly: true
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate image");

      const data = await response.json();
      if (data.imageUrl) {
        setBlogData(prev => ({ ...prev, featured_image: data.imageUrl }));
        toast.success("Image generated!");
      }
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateWebResultsForSearch = async (searchText: string, searchIndex: number) => {
    setIsGenerating(true);
    const selectedCategory = categories.find(c => c.id.toString() === blogData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generateWebResults: true,
            searchText,
            category: selectedCategory?.name || "general"
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate web results");

      const data = await response.json();
      if (data.webResults && data.webResults.length > 0) {
        setWebResultsMap(prev => ({ ...prev, [searchIndex]: data.webResults }));
        toast.success(`Generated ${data.webResults.length} web results!`);
      }
    } catch (error) {
      toast.error("Failed to generate web results");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreLandingForWebResult = async (webResult: WebResult, key: string) => {
    setIsGenerating(true);
    const selectedCategory = categories.find(c => c.id.toString() === blogData.category_id);
    
    try {
      const response = await fetch(
        `https://sbfdyvzkmdbezivmppbm.supabase.co/functions/v1/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatePreLanding: true,
            webResultTitle: webResult.title,
            category: selectedCategory?.name || "general"
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate pre-landing");

      const data = await response.json();
      if (data.preLanding) {
        setPreLandingMap(prev => ({ ...prev, [key]: data.preLanding }));
        toast.success("Pre-landing content generated!");
      }
    } catch (error) {
      toast.error("Failed to generate pre-landing");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchSelect = (index: number) => {
    if (selectedSearches.includes(index)) {
      setSelectedSearches(prev => prev.filter(i => i !== index));
    } else if (selectedSearches.length < 4) {
      setSelectedSearches(prev => [...prev, index]);
    }
  };

  const handleWebResultSelect = (searchIdx: number, resultIdx: number) => {
    const current = selectedWebResultsMap[searchIdx] || [];
    if (current.includes(resultIdx)) {
      setSelectedWebResultsMap(prev => ({
        ...prev,
        [searchIdx]: current.filter(i => i !== resultIdx)
      }));
    } else if (current.length < 4) {
      setSelectedWebResultsMap(prev => ({
        ...prev,
        [searchIdx]: [...current, resultIdx]
      }));
    }
  };

  const saveSearchEdit = (index: number) => {
    const updated = [...generatedSearches];
    updated[index] = editSearchValue;
    setGeneratedSearches(updated);
    setEditingSearchIndex(null);
    setEditSearchValue("");
  };

  const saveWebResultEdit = () => {
    if (!editingWebResult || !editWebResultValue) return;
    const { searchIdx, resultIdx } = editingWebResult;
    const updated = [...(webResultsMap[searchIdx] || [])];
    updated[resultIdx] = editWebResultValue;
    setWebResultsMap(prev => ({ ...prev, [searchIdx]: updated }));
    setEditingWebResult(null);
    setEditWebResultValue(null);
  };

  const savePreLandingEdit = () => {
    if (!editPreLandingValue || !currentPreLandingKey) return;
    setPreLandingMap(prev => ({ ...prev, [currentPreLandingKey]: editPreLandingValue }));
    setEditingPreLanding(false);
    setEditPreLandingValue(null);
  };

  const canProceedFromBlog = blogData.title && blogData.content && blogData.category_id && blogData.author;
  const canProceedFromSearches = selectedSearches.length === 4;
  
  const canProceedFromWebResults = () => {
    for (let i = 0; i < selectedSearches.length; i++) {
      const searchIdx = selectedSearches[i];
      const selected = selectedWebResultsMap[searchIdx] || [];
      if (selected.length !== 4) return false;
    }
    return true;
  };

  const handleSaveAll = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Create blog
      const { data: newBlog, error: blogError } = await supabase
        .from('blogs')
        .insert([{
          ...blogData,
          category_id: parseInt(blogData.category_id)
        }])
        .select()
        .single();

      if (blogError || !newBlog) throw new Error("Failed to create blog");

      // 2. Create related searches with WR assignments
      for (let wrIndex = 0; wrIndex < selectedSearches.length; wrIndex++) {
        const searchIdx = selectedSearches[wrIndex];
        const searchText = generatedSearches[searchIdx];
        
        const { data: newSearch, error: searchError } = await supabase
          .from('related_searches')
          .insert([{
            blog_id: newBlog.id,
            search_text: searchText,
            order_index: wrIndex,
            wr: wrIndex + 1
          }])
          .select()
          .single();

        if (searchError || !newSearch) {
          console.error("Failed to create search:", searchError);
          continue;
        }

        // 3. Create web results for this search
        const selectedResults = selectedWebResultsMap[searchIdx] || [];
        const webResults = webResultsMap[searchIdx] || [];
        
        for (let resultOrder = 0; resultOrder < selectedResults.length; resultOrder++) {
          const resultIdx = selectedResults[resultOrder];
          const webResult = webResults[resultIdx];
          
          const { data: newWebResult, error: wrError } = await supabase
            .from('web_results')
            .insert([{
              related_search_id: newSearch.id,
              title: webResult.title,
              description: webResult.description,
              url: webResult.url,
              logo_url: null,
              is_sponsored: webResult.is_sponsored || false,
              order_index: resultOrder
            }])
            .select()
            .single();

          if (wrError) {
            console.error("Failed to create web result:", wrError);
          }
        }

        // 4. Create pre-landing config if exists
        const preLandingKey = `${searchIdx}`;
        const preLanding = preLandingMap[preLandingKey];
        
        if (preLanding) {
          const { error: plError } = await supabase
            .from('pre_landing_config')
            .insert([{
              related_search_id: newSearch.id,
              headline: preLanding.headline,
              description: preLanding.description,
              button_text: preLanding.buttonText,
              main_image_url: preLanding.mainImageUrl,
              background_color: "#ffffff"
            }]);

          if (plError) {
            console.error("Failed to create pre-landing:", plError);
          }
        }
      }

      toast.success("Blog with all related content created successfully!");
      onComplete();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'blog', label: 'Blog' },
      { key: 'related-searches', label: 'Related Searches' },
      { key: 'web-results', label: 'Web Results' },
      { key: 'pre-landing', label: 'Pre-Landing' },
      { key: 'review', label: 'Review' }
    ];
    
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    
    return (
      <div className="flex items-center justify-center mb-6 gap-2">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              idx < currentIndex ? 'bg-primary text-primary-foreground' :
              idx === currentIndex ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' :
              'bg-muted text-muted-foreground'
            }`}>
              {idx < currentIndex ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${idx < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBlogStep = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Step 1: Blog Details</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <Input
          value={blogData.title}
          onChange={(e) => setBlogData({ ...blogData, title: e.target.value, slug: generateSlug(e.target.value) })}
          placeholder="Enter blog title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Slug</label>
        <Input
          value={blogData.slug}
          onChange={(e) => setBlogData({ ...blogData, slug: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <Select value={blogData.category_id} onValueChange={(value) => setBlogData({ ...blogData, category_id: value })}>
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
        <label className="block text-sm font-medium mb-2">Author *</label>
        <Input
          value={blogData.author}
          onChange={(e) => setBlogData({ ...blogData, author: e.target.value })}
          placeholder="Author name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Content *</label>
        <div className="flex gap-2 mb-2">
          <Button type="button" onClick={generateBlogContent} disabled={isGenerating || !blogData.title.trim()} variant="outline" size="sm">
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Content</>}
          </Button>
        </div>
        <Textarea
          value={blogData.content}
          onChange={(e) => setBlogData({ ...blogData, content: e.target.value })}
          rows={6}
          placeholder="Blog content..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Featured Image</label>
        <div className="flex gap-2 mb-2">
          <Button type="button" onClick={generateImageOnly} disabled={isGeneratingImage || !blogData.title.trim()} variant="outline" size="sm">
            {isGeneratingImage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Image</>}
          </Button>
        </div>
        <Input
          value={blogData.featured_image}
          onChange={(e) => setBlogData({ ...blogData, featured_image: e.target.value })}
          placeholder="Image URL"
        />
        {blogData.featured_image && (
          <img src={blogData.featured_image} alt="Preview" className="mt-2 max-w-xs rounded-lg" />
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => setCurrentStep('related-searches')} disabled={!canProceedFromBlog}>
          Next: Related Searches <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderRelatedSearchesStep = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Step 2: Select Related Searches</h3>
      <p className="text-muted-foreground">Select exactly 4 related searches. Selection order determines WR number.</p>
      
      {generatedSearches.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">No related searches generated yet.</p>
          <Button onClick={generateBlogContent} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Related Searches</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {generatedSearches.map((search, index) => {
            const selectionIndex = selectedSearches.indexOf(index);
            const isSelected = selectionIndex !== -1;
            const wrNumber = isSelected ? selectionIndex + 1 : null;
            
            return (
              <div key={index} className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted'
              }`}>
                {editingSearchIndex === index ? (
                  <>
                    <Input
                      value={editSearchValue}
                      onChange={(e) => setEditSearchValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => saveSearchEdit(index)}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSearchIndex(null)}><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    <div 
                      onClick={() => handleSearchSelect(index)}
                      className={`flex-1 cursor-pointer ${selectedSearches.length >= 4 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm">{search}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSearchIndex(index); setEditSearchValue(search); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {wrNumber && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold">WR-{wrNumber}</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground">Selected: {selectedSearches.length}/4</p>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('blog')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button onClick={() => { setCurrentStep('web-results'); setCurrentSearchIndex(0); }} disabled={!canProceedFromSearches}>
          Next: Web Results <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderWebResultsStep = () => {
    const searchIdx = selectedSearches[currentSearchIndex];
    const searchText = generatedSearches[searchIdx];
    const webResults = webResultsMap[searchIdx] || [];
    const selectedResults = selectedWebResultsMap[searchIdx] || [];

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Step 3: Web Results for WR-{currentSearchIndex + 1}</h3>
        <p className="text-muted-foreground">Search: "{searchText}"</p>
        <p className="text-sm">Select 4 web results. ({currentSearchIndex + 1} of {selectedSearches.length} searches)</p>

        {webResults.length === 0 ? (
          <div className="text-center py-8">
            <Button onClick={() => generateWebResultsForSearch(searchText, searchIdx)} disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Web Results</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {webResults.map((result, resultIdx) => {
              const isSelected = selectedResults.includes(resultIdx);
              const selOrder = selectedResults.indexOf(resultIdx);

              return (
                <div key={resultIdx} className={`p-3 rounded-lg border transition-all ${
                  isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                }`}>
                  {editingWebResult?.searchIdx === searchIdx && editingWebResult?.resultIdx === resultIdx ? (
                    <div className="space-y-2">
                      <Input placeholder="Title" value={editWebResultValue?.title || ''} onChange={(e) => setEditWebResultValue(prev => prev ? {...prev, title: e.target.value} : null)} />
                      <Input placeholder="URL" value={editWebResultValue?.url || ''} onChange={(e) => setEditWebResultValue(prev => prev ? {...prev, url: e.target.value} : null)} />
                      <Input placeholder="Name" value={editWebResultValue?.name || ''} onChange={(e) => setEditWebResultValue(prev => prev ? {...prev, name: e.target.value} : null)} />
                      <Textarea placeholder="Description" value={editWebResultValue?.description || ''} onChange={(e) => setEditWebResultValue(prev => prev ? {...prev, description: e.target.value} : null)} rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveWebResultEdit}><Check className="w-4 h-4 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingWebResult(null); setEditWebResultValue(null); }}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div 
                        onClick={() => handleWebResultSelect(searchIdx, resultIdx)}
                        className={`flex-1 cursor-pointer ${selectedResults.length >= 4 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.url}</div>
                        <div className="text-xs mt-1">{result.description}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingWebResult({searchIdx, resultIdx}); setEditWebResultValue(result); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {isSelected && <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold">#{selOrder + 1}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground">Selected: {selectedResults.length}/4</p>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => {
            if (currentSearchIndex > 0) setCurrentSearchIndex(currentSearchIndex - 1);
            else setCurrentStep('related-searches');
          }}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          
          {currentSearchIndex < selectedSearches.length - 1 ? (
            <Button onClick={() => setCurrentSearchIndex(currentSearchIndex + 1)} disabled={selectedResults.length !== 4}>
              Next Search <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => { setCurrentStep('pre-landing'); setCurrentSearchIndex(0); }} disabled={!canProceedFromWebResults()}>
              Next: Pre-Landing <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderPreLandingStep = () => {
    const searchIdx = selectedSearches[currentSearchIndex];
    const searchText = generatedSearches[searchIdx];
    const selectedResults = selectedWebResultsMap[searchIdx] || [];
    const webResults = webResultsMap[searchIdx] || [];
    const preLandingKey = `${searchIdx}`;
    const preLanding = preLandingMap[preLandingKey];

    // Get the first selected web result for this search
    const firstSelectedResultIdx = selectedResults[0];
    const firstWebResult = webResults[firstSelectedResultIdx];

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Step 4: Pre-Landing for WR-{currentSearchIndex + 1}</h3>
        <p className="text-muted-foreground">Search: "{searchText}"</p>
        <p className="text-sm">({currentSearchIndex + 1} of {selectedSearches.length} searches)</p>

        {!preLanding ? (
          <div className="text-center py-8">
            <Button onClick={() => { setCurrentPreLandingKey(preLandingKey); generatePreLandingForWebResult(firstWebResult, preLandingKey); }} disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Pre-Landing</>}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Or skip to use defaults</p>
          </div>
        ) : editingPreLanding && currentPreLandingKey === preLandingKey ? (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Input placeholder="Headline" value={editPreLandingValue?.headline || ''} onChange={(e) => setEditPreLandingValue(prev => prev ? {...prev, headline: e.target.value} : null)} />
            <Textarea placeholder="Description" value={editPreLandingValue?.description || ''} onChange={(e) => setEditPreLandingValue(prev => prev ? {...prev, description: e.target.value} : null)} rows={3} />
            <Input placeholder="Button Text" value={editPreLandingValue?.buttonText || ''} onChange={(e) => setEditPreLandingValue(prev => prev ? {...prev, buttonText: e.target.value} : null)} />
            <Input placeholder="Main Image URL" value={editPreLandingValue?.mainImageUrl || ''} onChange={(e) => setEditPreLandingValue(prev => prev ? {...prev, mainImageUrl: e.target.value} : null)} />
            {editPreLandingValue?.mainImageUrl && <img src={editPreLandingValue.mainImageUrl} alt="Preview" className="max-w-xs rounded-lg" />}
            <div className="flex gap-2">
              <Button size="sm" onClick={savePreLandingEdit}><Check className="w-4 h-4 mr-1" />Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingPreLanding(false); setEditPreLandingValue(null); }}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{preLanding.headline}</h4>
                <p className="text-sm text-muted-foreground">{preLanding.description}</p>
                <p className="text-xs mt-1">Button: {preLanding.buttonText}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setCurrentPreLandingKey(preLandingKey); setEditingPreLanding(true); setEditPreLandingValue(preLanding); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            {preLanding.mainImageUrl && <img src={preLanding.mainImageUrl} alt="Pre-landing" className="max-w-xs rounded-lg mt-2" />}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => {
            if (currentSearchIndex > 0) setCurrentSearchIndex(currentSearchIndex - 1);
            else { setCurrentStep('web-results'); setCurrentSearchIndex(selectedSearches.length - 1); }
          }}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          
          {currentSearchIndex < selectedSearches.length - 1 ? (
            <Button onClick={() => setCurrentSearchIndex(currentSearchIndex + 1)}>
              Next Search <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep('review')}>
              Review & Save <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Step 5: Review & Save</h3>
      
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <h4 className="font-bold">Blog</h4>
        <p><strong>Title:</strong> {blogData.title}</p>
        <p><strong>Author:</strong> {blogData.author}</p>
        <p><strong>Category:</strong> {categories.find(c => c.id.toString() === blogData.category_id)?.name}</p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <h4 className="font-bold">Related Searches & Web Results</h4>
        {selectedSearches.map((searchIdx, wrIndex) => {
          const selectedResults = selectedWebResultsMap[searchIdx] || [];
          const webResults = webResultsMap[searchIdx] || [];
          const preLanding = preLandingMap[`${searchIdx}`];
          
          return (
            <div key={wrIndex} className="border-l-2 border-primary pl-3">
              <p className="font-medium">WR-{wrIndex + 1}: {generatedSearches[searchIdx]}</p>
              <p className="text-xs text-muted-foreground">{selectedResults.length} web results selected</p>
              {preLanding && <p className="text-xs text-green-600">Pre-landing configured</p>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => { setCurrentStep('pre-landing'); setCurrentSearchIndex(selectedSearches.length - 1); }}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <Button onClick={handleSaveAll} disabled={isGenerating}>
          {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Save All</>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {renderStepIndicator()}
      
      {currentStep === 'blog' && renderBlogStep()}
      {currentStep === 'related-searches' && renderRelatedSearchesStep()}
      {currentStep === 'web-results' && renderWebResultsStep()}
      {currentStep === 'pre-landing' && renderPreLandingStep()}
      {currentStep === 'review' && renderReviewStep()}
    </div>
  );
};

export default BlogCreationWizard;
