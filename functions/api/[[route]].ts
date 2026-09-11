// Cloudflare Pages Function: /api/* Universal Edge API Route Handler

type PagesFunction<Env = Record<string, any>> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response> | Response;

interface Env {
  GEMINI_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  BACKEND_URL?: string;
  [key: string]: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

// Generate SHA-1 Hex for Cloudinary Signed Upload
async function generateSha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Health check
    if (pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        platform: "cloudflare-pages-edge",
        time: new Date().toISOString(),
      });
    }

    // 2. Image & File Upload Handler (/api/upload)
    if (pathname === "/api/upload" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return jsonResponse({ success: false, error: "No file provided in form data" }, 400);
        }

        const cloudName = env.CLOUDINARY_CLOUD_NAME || "daafqfrqh";
        const apiKey = env.CLOUDINARY_API_KEY || "551261625733394";
        const apiSecret = env.CLOUDINARY_API_SECRET || "7k8Cn1_vuMPuD3wv8KY79AJcxCw";

        // Try signed Cloudinary upload if credentials are present
        if (cloudName && apiKey && apiSecret) {
          const timestamp = Math.round(Date.now() / 1000);
          const folder = "atrya_shop";
          const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
          const signature = await generateSha1(stringToSign);

          const cldFormData = new FormData();
          cldFormData.append("file", file);
          cldFormData.append("api_key", apiKey);
          cldFormData.append("timestamp", String(timestamp));
          cldFormData.append("folder", folder);
          cldFormData.append("signature", signature);

          const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: cldFormData,
          });

          if (cldRes.ok) {
            const cldData = (await cldRes.json()) as any;
            return jsonResponse({
              success: true,
              url: cldData.secure_url,
              public_id: cldData.public_id,
              resource_type: cldData.resource_type || "image",
            });
          } else {
            const errText = await cldRes.text().catch(() => "");
            console.warn("Cloudinary upload failed on edge, falling back to compressed base64:", errText);
          }
        }

        // Lightweight Fallback: Read file as Base64 Data URI (<20KB is lightweight and fast)
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const dataUri = `data:${file.type || "image/webp"};base64,${base64}`;

        return jsonResponse({
          success: true,
          url: dataUri,
          public_id: null,
          resource_type: "image",
        });
      } catch (uploadError: any) {
        console.error("Upload error on edge:", uploadError);
        return jsonResponse(
          { success: false, error: uploadError?.message || "File upload failed" },
          500
        );
      }
    }

    // 3. File Deletion Handler (/api/delete & /api/delete-file)
    if ((pathname === "/api/delete" || pathname === "/api/delete-file") && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const fileUrl = body?.fileUrl;

        const cloudName = env.CLOUDINARY_CLOUD_NAME || "daafqfrqh";
        const apiKey = env.CLOUDINARY_API_KEY || "551261625733394";
        const apiSecret = env.CLOUDINARY_API_SECRET || "7k8Cn1_vuMPuD3wv8KY79AJcxCw";

        if (fileUrl && fileUrl.includes("cloudinary") && cloudName && apiKey && apiSecret) {
          const publicIdMatch = fileUrl.match(/\/atrya_shop\/(.+)\./);
          const publicId = publicIdMatch ? `atrya_shop/${publicIdMatch[1]}` : null;

          if (publicId) {
            const timestamp = Math.round(Date.now() / 1000);
            const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
            const signature = await generateSha1(stringToSign);

            const cldFormData = new FormData();
            cldFormData.append("public_id", publicId);
            cldFormData.append("api_key", apiKey);
            cldFormData.append("timestamp", String(timestamp));
            cldFormData.append("signature", signature);

            await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
              method: "POST",
              body: cldFormData,
            }).catch(() => {});
          }
        }

        return jsonResponse({ success: true });
      } catch (err: any) {
        return jsonResponse({ success: true }); // Graceful resolution
      }
    }

    // 4. Gemini: Optimize Search Query
    if (pathname === "/api/gemini/optimize-query" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const query = body?.query;

      if (!query) {
        return jsonResponse({ success: false, error: "Missing query" }, 400);
      }

      const apiKey = env.GEMINI_API_KEY || "AIzaSyDlLGz_GjqXXlQ7o8333ZqDgSmdcxKO_HA";
      if (!apiKey) {
        return jsonResponse({
          success: true,
          data: { corrected_query: query, synonyms: [], category: "General" },
        });
      }

      const prompt = `Aap ek e-commerce search query optimizer hain. User query: "${query}". Return valid JSON with keys: "corrected_query", "synonyms" (array of strings), "category" (string).`;

      try {
        const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let geminiData: any = null;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

            if (geminiRes.ok) {
              geminiData = await geminiRes.json();
              if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`Error calling model ${model}:`, modelErr);
          }
        }

        if (!geminiData) {
          return jsonResponse({
            success: true,
            data: { corrected_query: query, synonyms: [], category: "" },
          });
        }

        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = text ? JSON.parse(text) : { corrected_query: query, synonyms: [], category: "" };
        return jsonResponse({ success: true, data: parsed });
      } catch (e) {
        return jsonResponse({
          success: true,
          data: { corrected_query: query, synonyms: [], category: "" },
        });
      }
    }

    // 5. Gemini: RAG & Search
    if ((pathname === "/api/gemini/rag-search" || pathname === "/api/gemini/search") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const { query, products } = body;

      if (!query || !products || !Array.isArray(products)) {
        return jsonResponse({ success: false, error: "Missing query or products list" }, 400);
      }

      const rawQuery = String(query).toLowerCase().trim();
      const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

      // Local retrieval scoring on edge
      const candidateDocs = products
        .map((p: any) => {
          const customId = (p.customId || "").toLowerCase();
          const id = (p.id || "").toLowerCase();
          const name = (p.name || "").toLowerCase();
          const category = (p.category || "").toLowerCase();
          const description = (p.description || "").toLowerCase();

          let initialScore = 0;
          if (customId === rawQuery || id === rawQuery) initialScore += 1000;
          else if (customId.includes(rawQuery) || id.includes(rawQuery)) initialScore += 500;

          queryTokens.forEach((token: string) => {
            if (name.includes(token)) initialScore += 100;
            if (category.includes(token)) initialScore += 80;
            if (description.includes(token)) initialScore += 20;
          });

          return {
            id: p.id,
            customId: p.customId || "",
            name: p.name || "",
            category: p.category || "",
            price: p.price || 0,
            description: p.description ? p.description.substring(0, 150) : "",
            shopName: p.shopName || "Official Store",
            initialScore,
          };
        })
        .sort((a: any, b: any) => b.initialScore - a.initialScore)
        .slice(0, 30);

      const apiKey = env.GEMINI_API_KEY || "AIzaSyDlLGz_GjqXXlQ7o8333ZqDgSmdcxKO_HA";
      if (!apiKey) {
        return jsonResponse({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: candidateDocs[0]?.category || "All Products",
            suggestedKeywords: queryTokens,
            aiSummary: `Found ${candidateDocs.length} matching products for "${query}".`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: Math.min(100, Math.round(p.initialScore / 10)),
              matchReason: "Catalog match",
            })),
          },
        });
      }

      // Call Gemini for intelligent re-ranking
      const prompt = `You are an e-commerce search ranker. Query: "${query}". Candidate Products: ${JSON.stringify(candidateDocs)}. Return JSON matching keys: detectedIntent (string), detectedCategory (string), suggestedKeywords (array of strings), aiSummary (string in Roman Urdu / English), rankedProductIds (array of objects with id and matchScore).`;

      try {
        const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let geminiData: any = null;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: "application/json" },
                }),
              }
            );

            if (geminiRes.ok) {
              geminiData = await geminiRes.json();
              if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`Error calling model ${model}:`, modelErr);
          }
        }

        if (!geminiData) {
          return jsonResponse({
            success: true,
            data: {
              detectedIntent: query,
              detectedCategory: candidateDocs[0]?.category || "All Products",
              suggestedKeywords: queryTokens,
              aiSummary: `Matching products for "${query}"`,
              rankedProductIds: candidateDocs.map((p: any) => ({
                id: p.id,
                matchScore: 80,
                matchReason: "Catalog match",
              })),
            },
          });
        }

        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = text ? JSON.parse(text) : null;

        return jsonResponse({
          success: true,
          data: parsed || {
            detectedIntent: query,
            detectedCategory: "All",
            suggestedKeywords: [],
            aiSummary: "",
            rankedProductIds: candidateDocs.map((p: any) => ({ id: p.id, matchScore: 70 })),
          },
        });
      } catch (err: any) {
        return jsonResponse({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: candidateDocs[0]?.category || "All Products",
            suggestedKeywords: queryTokens,
            aiSummary: `Matching products for "${query}"`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: 80,
              matchReason: "Keyword match",
            })),
          },
        });
      }
    }

    // 6. Proxy fallback if BACKEND_URL is configured
    if (env.BACKEND_URL) {
      const targetUrl = new URL(pathname + url.search, env.BACKEND_URL);
      const proxyReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "follow",
      });
      return await fetch(proxyReq);
    }

    // Default response for unmatched endpoints
    return jsonResponse({ success: false, error: `Route ${pathname} not found on edge function` }, 404);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message || "Internal server error" }, 500);
  }
};
