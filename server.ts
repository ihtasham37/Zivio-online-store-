import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Initialize Gemini client (safe check if key exists, but don't crash)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set. Gemini search will be disabled.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Set up Multer for temporary storage
const uploadDir = (process.env.VERCEL || process.env.NETLIFY) ? "/tmp" : path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// API Route for Cloudinary Upload
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype.split("/")[0]; // 'image' or 'video'

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: fileType === "video" ? "video" : "auto",
      folder: "atrya_shop",
    });

    // Clean up local file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Route for deleting files from Cloudinary
app.post("/api/delete", async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ success: false, error: "No fileUrl provided" });

    const publicIdMatch = fileUrl.match(/\/atrya_shop\/(.+)\./);
    const publicId = publicIdMatch ? `atrya_shop/${publicIdMatch[1]}` : null;

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Cloudinary Delete Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Route for Gemini AI Query Optimization
app.post("/api/gemini/optimize-query", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Missing query" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ success: false, error: "Gemini API is not configured." });
    }

    const prompt = `Aap ek e-commerce search query optimizer hain. User jo bhi product search karega, aapka kaam uske spelling mistakes (typos) ko theek karna, search term ke synonyms (milte-julte naam) nikalna, aur product category identify karta hai taake related products bhi show ho sakein.

Aapko hamesha JSON format mein response dena hai jisme yeh keys hon:
1. "corrected_query": Agar spelling galat hai toh uski sahi spelling, warna original query.
2. "synonyms": Related keywords ya milte-julte products ki list.
3. "category": Product kis category se belong karta hai.

Rules:
- Agar user bilkul ajeeb ya irrelevant cheez likhe, toh response empty ya generic rakhein.
- Koi extra text ya explanation nahi deni, sirf pure JSON return karna hai.

Input: "${query}"
Output:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            corrected_query: { type: Type.STRING },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            category: { type: Type.STRING }
          },
          required: ["corrected_query", "synonyms", "category"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const result = JSON.parse(responseText);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Gemini Optimize Query Error:", error?.message || error);
    if (error?.status === 429) {
       return res.json({ success: true, data: { corrected_query: req.body.query, synonyms: [], category: "" } });
    }
    res.status(500).json({ success: false, error: error?.message || "An error occurred." });
  }
});

// API Route for Gemini AI Search Suggestions
app.post("/api/gemini/search", async (req, res) => {
  try {
    const { query, products } = req.body;
    if (!query || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: "Missing query or products list" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ success: false, error: "Gemini API is not configured on the server." });
    }

    const simplifiedProducts = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description ? p.description.substring(0, 150) : '',
      shopName: p.shopName || 'Official Store'
    }));

    const productsJson = (() => {
        const cache = new WeakSet();
        return JSON.stringify(simplifiedProducts, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) return;
                cache.add(value);
            }
            return value;
        }, 2);
    })();

    const prompt = `
You are the Official AI shopping assistant for our e-commerce store. 
The customer is searching for: "${query}"

Here is the list of available products in our store:
${productsJson}

Instructions:
1. Analyze the customer query and find the products that match their intent best.
2. Provide a friendly, conversational, helpful response (max 2-3 sentences) in Urdu or English explaining what you found or suggesting options.
3. Extract an array of matching product ids, sorted by relevance. If no products match at all, return an empty array.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            productIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["message", "productIds"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const result = JSON.parse(responseText);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Gemini Search Error:", error?.message || error);
    if (error?.status === 429) {
      return res.json({ success: true, data: { message: "", productIds: [] } });
    }
    res.status(500).json({ success: false, error: error?.message || "An error occurred during AI search." });
  }
});

// API Route for RAG (Retrieval-Augmented Generation) AI Search Flow
app.post("/api/gemini/rag-search", async (req, res) => {
  try {
    const { query, products } = req.body;
    if (!query || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: "Missing query or products list" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ success: false, error: "Gemini API is not configured on the server." });
    }

    // RETRIEVAL STAGE: Candidate Document Retrieval & Multi-field Index Scoring
    const rawQuery = String(query).toLowerCase().trim();
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    const candidateDocs = products
      .map((p: any) => {
        const customId = (p.customId || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const description = (p.description || '').toLowerCase();

        let initialScore = 0;
        if (customId === rawQuery || id === rawQuery) initialScore += 1000;
        else if (customId.includes(rawQuery) || id.includes(rawQuery)) initialScore += 500;

        queryTokens.forEach((token) => {
          if (name.includes(token)) initialScore += 100;
          if (category.includes(token)) initialScore += 80;
          if (description.includes(token)) initialScore += 20;
        });

        return {
          id: p.id,
          customId: p.customId || '',
          name: p.name || '',
          category: p.category || '',
          price: p.price || 0,
          description: p.description ? p.description.substring(0, 150) : '',
          shopName: p.shopName || 'Official Store',
          initialScore,
        };
      })
      .sort((a, b) => b.initialScore - a.initialScore)
      .slice(0, 40);

    const retrievedContextJson = JSON.stringify(candidateDocs, null, 2);

    // AUGMENTATION & RE-RANKING STAGE (RAG Engine using Gemini 3.6 Flash)
    const ragPrompt = `
You are the RAG (Retrieval-Augmented Generation) Search Intelligence Engine for our e-commerce store.

CUSTOMER SEARCH QUERY: "${query}"

RETRIEVED PRODUCT CONTEXT DOCUMENTS (Top Matches from Catalog Retrieval):
${retrievedContextJson}

TASK INSTRUCTIONS:
1. Intent Analysis: Determine what the customer is looking for (product type, attributes, target gender/age, or specific Product ID).
2. Category Identification: Identify the best category for this query.
3. Re-Ranking & Scoring: Evaluate each product in the retrieved context against customer intent. Assign a matchScore (0 to 100) and matchReason (e.g. "Exact Title Match", "Matching Custom Product ID", "Semantic Category Fit").
4. AI Shopping Summary: Write a clear 2-3 sentence helpful recommendation in Roman Urdu / English for the shopper.
5. Suggested Keywords: Provide 3-4 related search keywords or tags to help user explore.

Return pure JSON matching the requested schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: ragPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedIntent: { type: Type.STRING },
            detectedCategory: { type: Type.STRING },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            aiSummary: { type: Type.STRING },
            rankedProductIds: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  matchReason: { type: Type.STRING }
                },
                required: ["id", "matchScore"]
              }
            }
          },
          required: ["detectedIntent", "detectedCategory", "suggestedKeywords", "aiSummary", "rankedProductIds"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini RAG engine");
    }

    const result = JSON.parse(responseText);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Gemini RAG Search Error:", error?.message || error);
    if (error?.status === 429) {
      return res.json({
        success: true,
        data: {
          detectedIntent: req.body.query,
          detectedCategory: "All Products",
          suggestedKeywords: [],
          aiSummary: "Displaying matching catalogue items...",
          rankedProductIds: []
        }
      });
    }
    res.status(500).json({ success: false, error: error?.message || "An error occurred during RAG search." });
  }
});

// Dynamic Sitemap Route
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = "https://ali-cart.com"; 
  const pages = ["", "/blog", "/categories", "/more", "/community"];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  pages.forEach(page => {
    xml += `<url><loc>${baseUrl}${page}</loc><changefreq>daily</changefreq><priority>${page === "" ? "1.0" : "0.8"}</priority></url>`;
  });
  xml += `</urlset>`;
  
  res.header("Content-Type", "application/xml");
  res.send(xml);
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not running in serverless environments (Vercel or Netlify)
  if (!process.env.VERCEL && !process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// In serverless environments, we export the app and the handler handles the rest.
// In standalone environments, we start the server normally.
if (!process.env.VERCEL && !process.env.NETLIFY) {
  startServer();
}

export default app;

