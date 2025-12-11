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
    const { title, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate blog content
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
            content: "You are a professional blog content writer. Write engaging, informative, and SEO-friendly blog posts. Write in a conversational tone. Do not use markdown formatting, just plain text with proper paragraphs."
          },
          {
            role: "user",
            content: `Write a comprehensive blog post about "${title}" in the ${category || 'general'} category. The blog should be around 400-600 words, informative, and engaging. Include an introduction, main points, and a conclusion. Do not include the title in your response.`
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
    const content = contentData.choices?.[0]?.message?.content || "";

    // Generate image using the image model
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

    let imageUrl = "";
    
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
      JSON.stringify({ content, imageUrl }),
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
