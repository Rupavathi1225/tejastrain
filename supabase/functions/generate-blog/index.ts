import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, category, imageOnly, generateWebResults, generatePreLanding, searchText, webResultTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate Web Results for a related search
    if (generateWebResults && searchText) {
      console.log("Generating web results for:", searchText);
      const webResultsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You generate realistic web search results. Return EXACTLY 6 web results in JSON format. Each result must have:
- title: A compelling headline (5-10 words)
- description: A brief description (15-25 words)
- url: A realistic looking URL (use real domain patterns like example.com, company-name.com)
- name: Brand/company name (1-3 words)

Return ONLY valid JSON array, no markdown, no explanation.`
            },
            {
              role: "user",
              content: `Generate 6 realistic web search results for the query: "${searchText}" in the ${category || 'general'} category. Return as JSON array.`
            }
          ],
        }),
      });

      if (!webResultsResponse.ok) {
        throw new Error("Failed to generate web results");
      }

      const webResultsData = await webResultsResponse.json();
      let webResultsText = webResultsData.choices?.[0]?.message?.content || "[]";
      
      // Clean up the response
      webResultsText = webResultsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let webResults = [];
      try {
        webResults = JSON.parse(webResultsText);
      } catch (e) {
        console.error("Failed to parse web results:", webResultsText);
        webResults = [];
      }

      return new Response(
        JSON.stringify({ webResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate Pre-Landing content
    if (generatePreLanding && webResultTitle) {
      console.log("Generating pre-landing for:", webResultTitle);
      
      // Generate pre-landing text content
      const preLandingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You generate landing page content. Return JSON with:
- headline: Compelling headline (5-8 words)
- description: Engaging description (20-30 words)
- buttonText: CTA button text (2-4 words)

Return ONLY valid JSON, no markdown.`
            },
            {
              role: "user",
              content: `Generate landing page content for: "${webResultTitle}" in the ${category || 'general'} category.`
            }
          ],
        }),
      });

      let preLandingContent = { headline: "", description: "", buttonText: "Visit Now" };
      
      if (preLandingResponse.ok) {
        const preLandingData = await preLandingResponse.json();
        let preLandingText = preLandingData.choices?.[0]?.message?.content || "{}";
        preLandingText = preLandingText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          preLandingContent = JSON.parse(preLandingText);
        } catch (e) {
          console.error("Failed to parse pre-landing content:", preLandingText);
        }
      }

      // Generate pre-landing image
      console.log("Generating pre-landing image for:", webResultTitle);
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Create a professional, high-quality landing page hero image for "${webResultTitle}". The image should be visually appealing, modern, and suitable for a ${category || 'general'} landing page. Make it look like a professional stock photo. 16:9 aspect ratio, clean and professional.`
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      let mainImageUrl = "";
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const images = imageData.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          mainImageUrl = images[0].image_url?.url || "";
        }
      }

      return new Response(
        JSON.stringify({ 
          preLanding: {
            ...preLandingContent,
            mainImageUrl
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = "";
    let imageUrl = "";
    let relatedSearches: string[] = [];
    
    // Only generate content and related searches if not imageOnly request
    if (!imageOnly) {
      console.log("Generating content for:", title);
      const contentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a professional blog content writer. Write concise, informative blog posts. Write in a conversational tone. Do not use markdown formatting, just plain text with proper paragraphs. You MUST write EXACTLY 100 words - no more, no less. Count your words carefully."
            },
            {
              role: "user",
              content: `Write a blog post about "${title}" in the ${category || 'general'} category. The blog MUST be EXACTLY 100 words - count carefully. Include a brief introduction and key points. Do not include the title in your response.`
            }
          ],
        }),
      });

      if (!contentResponse.ok) {
        const errorText = await contentResponse.text();
        console.error("Content generation error:", errorText);
        throw new Error("Failed to generate content");
      }

      const contentData = await contentResponse.json();
      content = contentData.choices?.[0]?.message?.content || "";

      // Generate related searches - EXACTLY 6
      console.log("Generating related searches for:", title);
      const searchesResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You generate related search queries. Each query must be EXACTLY 5 words. Return EXACTLY 6 queries, one per line, no numbering, no extra text."
            },
            {
              role: "user",
              content: `Generate EXACTLY 6 related search queries for a blog about "${title}" in the ${category || 'general'} category. Each query MUST be EXACTLY 5 words. Return only the queries, one per line.`
            }
          ],
        }),
      });

      if (searchesResponse.ok) {
        const searchesData = await searchesResponse.json();
        const searchesText = searchesData.choices?.[0]?.message?.content || "";
        relatedSearches = searchesText
          .split('\n')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .slice(0, 6);
        
        // Ensure we have exactly 6
        while (relatedSearches.length < 6) {
          relatedSearches.push(`Related search ${relatedSearches.length + 1} for topic`);
        }
      }
    }

    // Generate image
    console.log("Generating image for:", title);
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a professional, high-quality blog featured image for an article titled "${title}". The image should be visually appealing, modern, and suitable for a ${category || 'general'} blog post. Make it look like a professional stock photo or editorial image. 16:9 aspect ratio, clean and professional.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const images = imageData.choices?.[0]?.message?.images;
      if (images && images.length > 0) {
        imageUrl = images[0].image_url?.url || "";
      }
    } else {
      console.error("Image generation failed:", await imageResponse.text());
    }

    return new Response(
      JSON.stringify({ content, imageUrl, relatedSearches }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-blog function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
