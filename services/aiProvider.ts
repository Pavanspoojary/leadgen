import { AiProviderStatus, AiError, AiResponse } from "../types";
import { logAiAction } from "./databaseService";

// =========================================
// GLOBAL STATE
// =========================================

let providerStatus: AiProviderStatus = "not_configured";

export const getProviderStatus = (): AiProviderStatus => providerStatus;

const setProviderStatus = (status: AiProviderStatus) => {
  providerStatus = status;
};

// =========================================
// ENV ACCESS
// =========================================

const getApiKey = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (key && key.length > 10) return key;
  }
  return "";
};

// =========================================
// ERROR HANDLER
// =========================================

const parseGroqError = (error: any): AiError => {
  const status = error?.status || error?.response?.status || 0;

  if (status === 401 || status === 403) {
    setProviderStatus("invalid_key");
    return {
      type: "invalid_key",
      message: "Invalid Groq API Key",
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

// =========================================
// VALIDATE CONNECTION
// =========================================

export const validateConnection = async (): Promise<boolean> => {
  try {
    const key = getApiKey();

    if (!key) {
      setProviderStatus("not_configured");
      return false;
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: "Ping" }]
      })
    });

    if (!res.ok) {
      throw { status: res.status };
    }

    setProviderStatus("connected");
    return true;

  } catch (err: any) {
    parseGroqError(err);
    return false;
  }
};

// =========================================
// GENERATE TEXT
// =========================================

export const generateText = async (
  prompt: string,
  systemInstruction?: string,
  config?: any
): Promise<AiResponse<any>> => {

  try {
    const key = getApiKey();

    if (!key) {
      setProviderStatus("not_configured");
      return {
        success: false,
        error: {
          type: "invalid_key",
          message: "Groq API Key not configured",
          retryable: false
        }
      };
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            ...(systemInstruction
              ? [{ role: "system", content: systemInstruction }]
              : []),
            { role: "user", content: prompt }
          ],
          temperature: config?.temperature ?? 0.7
        })
      }
    );

    if (!response.ok) {
      throw { status: response.status };
    }

    const data = await response.json();

    setProviderStatus("connected");

    await logAiAction("GENERATE", "llama3-8b-8192");

    return {
      success: true,
      data: {
        text: data.choices?.[0]?.message?.content || ""
      }
    };

  } catch (err: any) {

    const parsed = parseGroqError(err);

    await logAiAction("GENERATE", "llama3-8b-8192", parsed.type);

    return {
      success: false,
      error: parsed
    };
  }
};
