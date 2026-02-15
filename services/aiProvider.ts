import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AiProviderStatus, AiError, AiResponse } from "../types";
import { logAiAction } from "./databaseService";

// =======================================================
// GLOBAL PROVIDER STATE
// =======================================================

let providerStatus: AiProviderStatus = "not_configured";

export const getProviderStatus = (): AiProviderStatus => providerStatus;

const setProviderStatus = (status: AiProviderStatus) => {
  providerStatus = status;
};

// =======================================================
// ENV ACCESS
// =======================================================

const getApiKey = (): string => {
  try {
    // Vite-style
    // @ts-ignore
    const viteKey = import.meta?.env?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;

    // Node-style fallback
    // @ts-ignore
    if (typeof process !== "undefined" && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch {}

  return "";
};

// =======================================================
// CLIENT FACTORY (SINGLE SOURCE)
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
// STRICT ERROR PARSER
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

  // ---------- INVALID KEY ----------
  if (
    status === 401 ||
    status === 403 ||
    message.includes("api key") ||
    message.includes("unauthorized")
  ) {
    setProviderStatus("invalid_key");

    return {
      type: "invalid_key",
      message: "Invalid API Key. Please verify configuration.",
      retryable: false
    };
  }

  // ---------- QUOTA EXCEEDED ----------
  if (
    status === 429 &&
    (message.includes("quota") ||
      message.includes("exceeded your current quota") ||
      message.includes("resource_exhausted"))
  ) {
    setProviderStatus("quota_exceeded");

    return {
      type: "quota_exceeded",
      message: "Gemini quota exhausted. Upgrade plan or replace API key.",
      retryable: false
    };
  }

  // ---------- RATE LIMIT ----------
  if (status === 429) {
    setProviderStatus("rate_limit");

    return {
      type: "rate_limit",
      message: "Rate limit reached. Retrying shortly...",
      retryable: true
    };
  }

  // ---------- NETWORK ----------
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    setProviderStatus("network_error");

    return {
      type: "network_error",
      message: "Network connection failed.",
      retryable: true
    };
  }

  // ---------- DEFAULT ----------
  setProviderStatus("network_error");

  return {
    type: "network_error",
    message: message || "Unknown AI error occurred.",
    retryable: true
  };
};

// =======================================================
// RETRY WRAPPER
// =======================================================

async function withStrictRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<AiResponse<T>> {
  // Hard block on fatal states
  if (
    providerStatus === "quota_exceeded" ||
    providerStatus === "invalid_key"
  ) {
    return {
      success: false,
      error: {
        type: providerStatus,
        message: `System blocked due to ${providerStatus}.`,
        retryable: false
      }
    };
  }

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await operation();

      setProviderStatus("connected");

      await logAiAction("GENERATE", "gemini-3-flash-preview");

      return {
        success: true,
        data: result
      };
    } catch (err: any) {
      const parsedError = parseGeminiError(err);

      await logAiAction(
        "GENERATE",
        "gemini-3-flash-preview",
        parsedError.type
      );

      // Stop immediately if not retryable
      if (!parsedError.retryable) {
        return { success: false, error: parsedError };
      }

      // Stop if max retries reached
      if (attempt === maxRetries - 1) {
        return { success: false, error: parsedError };
      }

      const delay = baseDelay * Math.pow(2, attempt);

      console.warn(
        `[AI RETRY] Attempt ${attempt + 1} | ${parsedError.type} | ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
    }
  }

  return {
    success: false,
    error: {
      type: "network_error",
      message: "Max retries exceeded.",
      retryable: false
    }
  };
}

// =======================================================
// VALIDATE CONNECTION
// =======================================================

export const validateConnection = async (): Promise<boolean> => {
  try {
    const ai = getClient();

    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: "Ping" }] }
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
  return withStrictRetry(async () => {
    const ai = getClient();

    return await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction,
        ...config
      }
    });
  });
};
