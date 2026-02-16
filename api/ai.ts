// /api/ai.ts

import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, systemInstruction, config } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key not configured on server"
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction,
        ...config
      }
    });

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "AI generation failed"
    });
  }
}
