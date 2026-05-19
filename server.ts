import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/recommend-spaces", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Load spaces.json directly in the backend to supply as context
      const spacesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/spaces.json'), 'utf8'));
      
      const prompt = `
You are an AI assistant for the MODI Hub urban regeneration facility in Bonghwa County.
Given the user's natural language request, recommend the most suitable spaces from the following JSON data.
Only recommend spaces that actually exist in the data.

Rules:
1. Explain WHY the space is recommended based on the user's query.
2. Recommend the top 3 best matching spaces (or at least 2 if not enough data).
3. Return the result strictly as a JSON object with this schema:
{
  "recommendedSpaces": [
    {
      "id": "HA01", // The exact ID from spaces.json
      "matchScore": 95, // 0 to 100 representing how well it matches
      "reasoning": "Explain why this space is recommended."
    }
  ],
  "suggestedFollowUps": [
    "String suggestion 1",
    "String suggestion 2"
  ]
}

Data Context:
${JSON.stringify(spacesData, null, 2)}

User Request: "${query}"
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const responseText = response.text || "{}";
      const result = JSON.parse(responseText);

      res.json(result);
    } catch (error) {
      console.error("Error generating recommendation:", error);
      res.status(500).json({ error: "Failed to generate recommendation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
