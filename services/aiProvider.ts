import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AiProviderStatus, AiError, AiResponse } from "../types";
import { logAiAction } from "./databaseService";

// =======================================================
// PROVIDER STATE
// =======================================================

let providerStatus: AiProviderStatus = "not_configured";

export const getProviderStatus = (): AiProviderStatus => {
  return providerStatus;
};

const setProviderStatus = (status: AiProviderStatus) => {
  providerStatus = status;
};

// =======================================================
// ENV ACCESS (VITE SAFE)
// =======================================================

const getApiKey = (): string => {
  try {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    return key || "";
  } catch {
    return "";
  }
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

  // Invalid Key
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
      retryable: false,
    };
  }

  // Quota Exceeded
  if (
    status === 429 &&
    (message.includes("quota") || message.includes("resource_exhausted"))
  ) {
    setProviderStatus("quota_exceeded");

    return {
      type: "quota_exceeded",
      message: "Gemini quota exhausted.",
      retryable: false,
    };
  }

  // Rate Limit
  if (status === 429) {
    setProviderStatus("rate_limit");

    return {
      type: "rate_limit",
      message: "Rate limit reached.",
      retryable: true,
    };
  }

  // Network
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    setProviderStatus("network_error");

    return {
      type: "network_error",
      message: "Network error occurred.",
      retryable: true,
    };
  }

  setProviderStatus("network_error");

  return {
    type: "network_error",
    message: message || "Unknown AI error.",
    retryable: true,
  };
};

// =======================================================
// RETRY WRAPPER
// =======================================================

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<AiResponse<T>> {
  if (providerStatus === "quota_exceeded" || providerStatus === "invalid_key") {
    return {
      success: false,
      error: {
        type: providerStatus,
        message: `Blocked due to ${providerStatus}.`,
        retryable: false,
      },
    };
  }

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await operation();

      setProviderStatus("connected");

      await logAiAction("GENERATE", "gemini-3-flash");

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      const parsed = parseGeminiError(err);

      await logAiAction("GENERATE", "gemini-3-flash", parsed.type);

      if (!parsed.retryable || attempt === maxRetries - 1) {
        return { success: false, error: parsed };
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));

      attempt++;
    }
  }

  return {
    success: false,
    error: {
      type: "network_error",
      message: "Max retries exceeded.",
      retryable: false,
    },
  };
}

// =======================================================
// VALIDATE CONNECTION
// =======================================================

export const validateConnection = async (): Promise<boolean> => {
  try {
    const ai = getClient();

    await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: { parts: [{ text: "Ping" }] },
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
  config?: any,
): Promise<AiResponse<GenerateContentResponse>> => {
  return withRetry(async () => {
    const ai = getClient();

    return await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      ...config,
    });
  });
};
