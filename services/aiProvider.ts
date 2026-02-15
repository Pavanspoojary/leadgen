import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AiProviderStatus, AiError, AiResponse } from "../types";
import { logAiAction } from "./databaseService";

// Global State
let providerStatus: AiProviderStatus = 'not_configured';

export const getProviderStatus = (): AiProviderStatus => providerStatus;

const setProviderStatus = (status: AiProviderStatus) => {
  providerStatus = status;
};

// Error Parsing Logic
const parseGeminiError = (error: any): AiError => {
  const msg = error.message?.toLowerCase() || '';
  const status = error.status || 0;

  if (status === 401 || status === 403 || msg.includes('api key')) {
    setProviderStatus('invalid_key');
    return { type: 'invalid_key', message: 'Invalid API Key. Please check configuration.', retryable: false };
  }

  if (status === 429 || msg.includes('exhausted') || msg.includes('quota')) {
    if (msg.includes('quota')) {
       setProviderStatus('quota_exceeded');
       return { type: 'quota_exceeded', message: 'Gemini Quota Exceeded. Upgrade plan.', retryable: false };
    }
    setProviderStatus('rate_limit');
    return { type: 'rate_limit', message: 'Rate limit hit. Cooling down...', retryable: true };
  }

  if (msg.includes('fetch') || msg.includes('network')) {
     setProviderStatus('network_error');
     return { type: 'network_error', message: 'Network connection failed.', retryable: true };
  }

  return { type: 'network_error', message: msg || 'Unknown AI Error', retryable: true };
};

// Safe Env Access
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {}
  return '';
}

// Base Client
const getClient = (): GoogleGenAI => {
  const key = getApiKey();
  if (!key) {
    setProviderStatus('not_configured');
    throw new Error("API_KEY not configured in environment.");
  }
  setProviderStatus('connected');
  return new GoogleGenAI({ apiKey: key });
};

// Retry Wrapper
async function withStrictRetry<T>(
  operation: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<AiResponse<T>> {
  
  if (providerStatus === 'quota_exceeded' || providerStatus === 'invalid_key') {
      return { 
          success: false, 
          error: { type: providerStatus, message: `System blocked due to ${providerStatus}.`, retryable: false }
      };
  }

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const result = await operation();
      setProviderStatus('connected'); // Reset to connected on success
      return { success: true, data: result };
    } catch (e: any) {
      const parsedError = parseGeminiError(e);
      
      // Log failure
      await logAiAction('GENERATE', 'gemini-3-flash', parsedError.type);

      if (!parsedError.retryable || attempt === maxRetries - 1) {
        return { success: false, error: parsedError };
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`AI Error (${parsedError.type}). Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }

  return { success: false, error: { type: 'network_error', message: 'Max retries exceeded.', retryable: false } };
}

// Public API
export const validateConnection = async (): Promise<boolean> => {
  try {
    const ai = getClient();
    await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: 'Ping' }] }
    });
    setProviderStatus('connected');
    return true;
  } catch (e) {
    parseGeminiError(e);
    return false;
  }
};

export const generateText = async (
  prompt: string, 
  systemInstruction?: string,
  config?: any
): Promise<AiResponse<GenerateContentResponse>> => {
  return withStrictRetry(async () => {
    const ai = getClient();
    return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
            systemInstruction,
            ...config
        }
    });
  });
};