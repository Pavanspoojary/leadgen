import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AiProviderStatus, AiError, AiResponse } from "../types";
import { logAiAction } from "./databaseService";

// =======================================================
// GLOBAL STATE
// =======================================================

let providerStatus: AiProviderStatus = "not_configured";

export const getProviderStatus = (): AiProviderStatus => providerStatus;

const setProviderStatus = (status: AiProviderStatus) => {
  providerStatus = status;
};

// =======================================================
// ENV ACCESS (VERCEL SAFE)
// =======================================================

const getApiKey = (): string => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      if (key && key.length > 10) {
        return key;
      }
    }
  } catch (err) {
    console.error("ENV READ ERROR:", err);
  }

  return "";
};

// =======================================================
// CLIENT FACTORY
// =======================================================

let cachedClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  const key = getApiKey();

  if (!key) {
    setProviderStatus("not_configured");
    throw new Error("Gemini API key not configured.");
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: key });
  }

  return cachedClient;
};

// =======================================================
// ERROR PARSER
// =======================================================

const parseGeminiError = (error: any): AiError => {
  const message =
    error?.message?.toLowerCase() ||
    error?.response?.data?.error?.message?.toLowerCase() ||
    "";

  const status =
    error?.status ||
    error?.response?.status ||
    error?.response?.data?.error?.code ||
    0;

  if (status === 401 || status === 403) {
    setProviderStatus("invalid_key");
    return {
      type: "invalid_key",
      message: "Invalid API Key",
      retryable: false
    };
  }

  if (status === 429 && message.includes("quota")) {
    setProviderStatus("quota_exceeded");
    return {
      type: "quota_exceeded",
      message: "Quota exceeded",
      retryable: false
    };
  }

  if (status === 429) {
    setProviderStatus("rate_limit");
    return {
      type: "rate_limit",
      message: "Rate limit reached",
      retryable: true
    };
  }

  setProviderStatus("network_error");
  return {
    type: "network_error",
    message: "Network or unknown error",
    retryable: true
  };
};

// =======================================================
// VALIDATE CONNECTION (AUTO SET STATUS)
// =======================================================

export const validateConnection = async (): Promise<boolean> => {
  try {
    const ai = getClient();

    await ai.models.generateContent({
      model: "gemini-1.5-flash", // SAFER MODEL
      contents: [{ role: "user", parts: [{ text: "Ping" }] }]
    });

    setProviderStatus("connected");
    return true;

  } catch (err) {
    parseGeminiError(err);
    return false;
  }
};

// =======================================================
// GENERATE TEXT
// =======================================================

export const generateText = async (
  prompt: string,
  systemInstruction?: string,
  config?: any
): Promise<AiResponse<GenerateContentResponse>> => {
  try {
    const ai = getClient();

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        ...config
      }
    });

    setProviderStatus("connected");

    await logAiAction("GENERATE", "gemini-1.5-flash");

    return {
      success: true,
      data: result
    };

  } catch (err: any) {
    const parsed = parseGeminiError(err);

    await logAiAction("GENERATE", "gemini-1.5-flash", parsed.type);

    return {
      success: false,
      error: parsed
    };
  }
};
