import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEmailSubmission } from "@/utils/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PreLandingConfig {
  id: string;
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

const PreLanding = () => {
  const { searchId } = useParams();
  const location = useLocation();
  const [config, setConfig] = useState<PreLandingConfig | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Get destination URL from route state (passed from WebResults) or fallback to config
  const destinationUrl = (location.state as { destinationUrl?: string })?.destinationUrl;

  useEffect(() => {
    if (searchId) {
      fetchConfig();
    }
  }, [searchId]);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from('pre_landing_config')
      .select('*')
      .eq('related_search_id', searchId)
      .single();
    
    if (data) {
      setConfig(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !searchId) return;

    setLoading(true);
    try {
      await trackEmailSubmission(email, searchId);
      toast.success("Thank you! Redirecting...");
      setEmail("");
      
      // Redirect after submission - use route state destinationUrl first, then config destination_url
      const redirectUrl = destinationUrl || config?.destination_url;
      if (redirectUrl) {
        setTimeout(() => {
          // Redirect to the destination URL in the same window
          window.location.href = redirectUrl;
        }, 1500);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const backgroundStyle = config.background_image_url
    ? { backgroundImage: `url(${config.background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: config.background_color };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={backgroundStyle}>
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {config.logo_url && (
          <div className={`flex ${config.logo_position === 'top-left' ? 'justify-start' : 'justify-center'} mb-8`}>
            <img src={config.logo_url} alt="Logo" className="h-16 object-contain" />
          </div>
        )}

        {config.main_image_url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img src={config.main_image_url} alt="Main" className="w-full object-cover" />
          </div>
        )}

        {config.headline && (
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-gray-900">
            {config.headline}
          </h1>
        )}

        {config.description && (
          <p className="text-lg text-gray-600 mb-8 text-center">
            {config.description}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 focus:border-primary"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 text-lg font-semibold"
          >
            {loading ? "Submitting..." : config.button_text}
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
};

export default PreLanding;