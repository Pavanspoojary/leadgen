import {
  Lead,
  SearchCriteria,
  GroundingSource,
  LeadDetails,
  ServiceResponse,
  FollowUpRecommendation
} from "../types";

import {
  saveLeadToDb,
  saveAuditToDb,
  saveOutreachToDb
} from "./databaseService";

import { generateText } from "./aiProvider";

// =======================================================
// SAFE JSON CLEANER
// =======================================================

const cleanJsonString = (text: string): string => {
  if (!text) return "";

  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
};

// =======================================================
// LEAD GENERATION
// =======================================================

export const generateLeads = async (
  criteria: SearchCriteria
): Promise<ServiceResponse<{ leads: Lead[]; sources: GroundingSource[] }>> => {

  const SYSTEM_INSTRUCTION = `
You are an Elite Revenue Intelligence Agent.

Generate 15 high-value leads for:
${criteria.businessSize} ${criteria.industry} in ${criteria.location}.

Source Strategy: ${criteria.sourceStrategy}.

Return STRICT JSON only.
`;

  const prompt = `
Generate JSON in this exact format:

{
  "leads": [
    {
      "business_name": "Name",
      "industry": "Sub-niche",
      "location": "City",
      "website_url": "URL",
      "website_status": "Has Website",
      "source_platform": "${criteria.sourceStrategy}",
      "email": "Email",
      "notes": "Strategy Note",
      "contact_info": {
        "fullName": "Name",
        "phone": "Phone"
      },
      "market_scan": {
        "opportunityScore": 0,
        "digitalMaturityScore": 0,
        "estimatedDealValue": "$Value",
        "competitiveRisk": "Low",
        "priorityRank": 1
      }
    }
  ]
}
`;

  const result = await generateText(prompt, SYSTEM_INSTRUCTION, {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json"
  });

  // ---------- AI ERROR HANDLING ----------
  if (!result.success || !result.data) {
    return {
      status: "error",
      error: {
        code: result.error?.type || "API_ERROR",
        message: result.error?.message || "AI Generation Failed",
        retryable: result.error?.retryable ?? false
      }
    };
  }

  const text = result.data.text || "";

  // ---------- GROUNDING SOURCES ----------
  const groundingChunks =
    result.data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const sources: GroundingSource[] = groundingChunks
    .flatMap((chunk: any) =>
      chunk?.web
        ? [{ title: chunk.web.title, uri: chunk.web.uri }]
        : []
    )
    .filter((s: GroundingSource) => !!s.uri);

  // ---------- JSON PARSING ----------
  try {
    const jsonString = cleanJsonString(text);
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed.leads)) {
      throw new Error("Invalid AI JSON structure.");
    }

    const validLeads: Lead[] = parsed.leads.map((l: any) => ({
      id: crypto.randomUUID(),
      business_name: l.business_name || "Unknown",
      industry: l.industry || criteria.industry,
      location: l.location || criteria.location,
      website_url: l.website_url || "",
      website_status: l.website_status || "Unknown",
      source_platform: l.source_platform || criteria.sourceStrategy,
      email: l.email || "",
      notes: l.notes || "",
      contact_info: l.contact_info || {},
      market_scan: l.market_scan || {},
      status: "New"
    }));

    // ---------- SAFE DB PERSIST ----------
    for (const lead of validLeads) {
      await saveLeadToDb(lead);
    }

    return {
      status: "success",
      data: { leads: validLeads, sources }
    };

  } catch (e: any) {
    console.error("Lead Parsing Failed:", e);

    return {
      status: "error",
      error: {
        code: "PARSING_FAILED",
        message: "AI returned malformed JSON.",
        retryable: false
      }
    };
  }
};

// =======================================================
// LEAD DETAILS / AUDIT
// =======================================================

export const generateLeadDetails = async (
  lead: Lead,
  tone: "Soft" | "Direct" | "Bold" | "Analytical" | "Value-driven"
): Promise<ServiceResponse<LeadDetails>> => {

  const SYSTEM_INSTRUCTION = `
You are an advanced AI revenue consultant.

Audit ${lead.business_name}.
Tone: ${tone}.
Return strict JSON.
`;

  const prompt = `
Analyze:
Business: ${lead.business_name}
Website: ${lead.website_url}

Return JSON matching LeadDetails interface:

{
  digitalMaturity: {},
  revenueInsights: {},
  enrichment: {},
  competitors: [],
  proposal: {},
  outreach: {}
}
`;

  const result = await generateText(prompt, SYSTEM_INSTRUCTION, {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json"
  });

  if (!result.success || !result.data) {
    return {
      status: "error",
      error: {
        code: result.error?.type || "API_ERROR",
        message: result.error?.message || "Audit Failed",
        retryable: result.error?.retryable ?? false
      }
    };
  }

  try {
    const jsonString = cleanJsonString(result.data.text || "");
    const details = JSON.parse(jsonString) as LeadDetails;

    // Persist
    await saveAuditToDb(lead.id, details);
    await saveOutreachToDb(lead.id, details);

    return { status: "success", data: details };

  } catch (e) {
    console.error("Audit Parsing Failed:", e);

    return {
      status: "error",
      error: {
        code: "PARSING_FAILED",
        message: "Audit JSON malformed.",
        retryable: false
      }
    };
  }
};

// =======================================================
// FOLLOW-UP ANALYSIS (UPGRADED)
// =======================================================

export const analyzeFollowUpTiming = async (
  industry: string,
  context: string
): Promise<ServiceResponse<FollowUpRecommendation>> => {

  const SYSTEM_INSTRUCTION = `
You are a sales psychology strategist.
Provide optimal follow-up timing strategy.
Return strict JSON.
`;

  const prompt = `
Industry: ${industry}

Context:
${context}

Return JSON:

{
  recommendedDays: number,
  reasoning: "Why this timing",
  urgencyLevel: "Low | Medium | High"
}
`;

  const result = await generateText(prompt, SYSTEM_INSTRUCTION, {
    responseMimeType: "application/json"
  });

  if (!result.success || !result.data) {
    return {
      status: "error",
      error: {
        code: result.error?.type || "API_ERROR",
        message: result.error?.message || "Follow-up AI failed",
        retryable: result.error?.retryable ?? false
      }
    };
  }

  try {
    const json = JSON.parse(cleanJsonString(result.data.text || ""));
    return { status: "success", data: json };

  } catch {
    return {
      status: "error",
      error: {
        code: "PARSING_FAILED",
        message: "Follow-up JSON malformed.",
        retryable: false
      }
    };
  }
};
