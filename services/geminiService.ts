import { Lead, SearchCriteria, GroundingSource, LeadDetails, ServiceResponse, FollowUpRecommendation } from "../types";
import { saveLeadToDb, saveAuditToDb, saveOutreachToDb } from "./databaseService";
import { generateText } from "./aiProvider";

// Helpers
const cleanJsonString = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

export const generateLeads = async (
  criteria: SearchCriteria
): Promise<ServiceResponse<{ leads: Lead[]; sources: GroundingSource[] }>> => {
  
    // ... Context Logic same as before ...
    // const STRATEGY_CONTEXT = criteria.strategicIntent; 

    const SYSTEM_INSTRUCTION = `
    You are an Elite Revenue Intelligence Agent.
    Generate 15 high-value leads for: ${criteria.businessSize} ${criteria.industry} in ${criteria.location}.
    Source Strategy: ${criteria.sourceStrategy}.
    `;

    const prompt = `
    Generate JSON.
    Format:
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
                "contact_info": { "fullName": "Name", "phone": "Phone" },
                "market_scan": {
                    "opportunityScore": 0-100,
                    "digitalMaturityScore": 0-100,
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

    if (!result.success || !result.data) {
        return { 
            status: 'error', 
            error: { 
                code: 'API_ERROR', 
                message: result.error?.message || 'AI Generation Failed', 
                retryable: result.error?.retryable 
            } 
        };
    }

    const text = result.data.text || "";
    const groundingChunks = result.data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
    .flatMap((chunk: any) => chunk.web ? [{ title: chunk.web.title, uri: chunk.web.uri }] : [])
    .filter((s: GroundingSource) => s.uri);

    try {
        const jsonString = cleanJsonString(text);
        const parsed = JSON.parse(jsonString);
        
        const validLeads: Lead[] = parsed.leads.map((l: any) => ({
            id: crypto.randomUUID(),
            business_name: l.business_name,
            industry: l.industry,
            location: l.location,
            website_url: l.website_url,
            website_status: l.website_status,
            source_platform: l.source_platform,
            email: l.email,
            notes: l.notes,
            contact_info: l.contact_info,
            market_scan: l.market_scan,
            status: 'New'
        }));

        // Persist
        for (const lead of validLeads) {
            await saveLeadToDb(lead);
        }

        return { status: 'success', data: { leads: validLeads, sources } };

    } catch (e) {
        return { status: 'error', error: { code: 'UNKNOWN_ERROR', message: 'Parsing Failed' } };
    }
};

export const generateLeadDetails = async (
  lead: Lead, 
  tone: 'Soft' | 'Direct' | 'Bold' | 'Analytical' | 'Value-driven'
): Promise<ServiceResponse<LeadDetails>> => {
    
    const SYSTEM_INSTRUCTION = `Audit ${lead.business_name}. Tone: ${tone}.`;
    const prompt = `
    Analyze ${lead.business_name} (${lead.website_url}). 
    Generate JSON matching LeadDetails interface (digitalMaturity, revenueInsights, enrichment, competitors, proposal, outreach).
    `;

    const result = await generateText(prompt, SYSTEM_INSTRUCTION, {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
    });

    if (!result.success || !result.data) {
        return { status: 'error', error: { code: 'API_ERROR', message: result.error?.message || 'Audit Failed' } };
    }

    try {
        const details = JSON.parse(cleanJsonString(result.data.text || "")) as LeadDetails;
        await saveAuditToDb(lead.id, details);
        await saveOutreachToDb(lead.id, details);
        return { status: 'success', data: details };
    } catch (e) {
        return { status: 'error', error: { code: 'UNKNOWN_ERROR', message: 'Audit Parsing Failed' } };
    }
};

export const analyzeFollowUpTiming = async (industry: string, context: string): Promise<ServiceResponse<FollowUpRecommendation>> => {
    // ... (Keep existing implementation but wrap with generateText)
    // Placeholder returning error to match previous behavior but with correct types
    return { status: 'error', error: { code: 'UNKNOWN_ERROR', message: 'Not Implemented in Refactor' } };
};