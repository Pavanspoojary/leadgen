import { supabase } from "../utils/supabaseClient";
import {
  Lead,
  Audit,
  Outreach,
  LeadDetails,
  LeadStatus
} from "../types";

// =======================================================
// HELPERS
// =======================================================

const mapLeadFromDb = (d: any): Lead => {
  return {
    id: d.id,
    created_at: d.created_at,
    business_name: d.business_name,
    industry: d.industry,
    location: d.location,
    website_url: d.website_url,
    website_status: d.website_status,
    source_platform: d.source_platform,
    email: d.email,
    notes: d.notes,
    contact_info: d.contact_info || {},
    market_scan: d.market_scan || {},
    status: "New"
  };
};

const safeThrow = (error: any, label: string) => {
  console.error(`${label}:`, error);
  throw new Error(label);
};

// =======================================================
// LEAD CRUD
// =======================================================

export const saveLeadToDb = async (lead: Lead): Promise<Lead | null> => {
  try {
    if (!lead.business_name) {
      throw new Error("Invalid lead payload.");
    }

    const { data, error } = await supabase
      .from("leads")
      .upsert(
        {
          id: lead.id,
          business_name: lead.business_name,
          industry: lead.industry,
          location: lead.location,
          website_url: lead.website_url,
          website_status: lead.website_status,
          source_platform: lead.source_platform,
          email: lead.email,
          notes: lead.notes,
          contact_info: lead.contact_info,
          market_scan: lead.market_scan,
          created_at: lead.created_at || new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) safeThrow(error, "DB_SAVE_LEAD_FAILED");

    return mapLeadFromDb(data);
  } catch (err) {
    console.error("DB Save Lead Fatal:", err);
    return null;
  }
};

// =======================================================
// AUDIT SAVE
// =======================================================

export const saveAuditToDb = async (
  leadId: string,
  details: LeadDetails
): Promise<boolean> => {
  try {
    if (!leadId || !details) throw new Error("Invalid audit payload");

    const { error } = await supabase.from("audits").insert({
      lead_id: leadId,
      performance_score: details.priorityScore,
      seo_score: details.digitalMaturity?.score || 0,
      conversion_score:
        details.revenueInsights?.responseProbability || 0,
      branding_score: 50,
      trust_score: 50,
      digital_maturity_index:
        details.digitalMaturity?.score || 0,
      primary_opportunity:
        details.digitalMaturity?.biggestGap || "",
      raw_data: details
    });

    if (error) safeThrow(error, "DB_SAVE_AUDIT_FAILED");

    return true;
  } catch (err) {
    console.error("Audit Save Error:", err);
    return false;
  }
};

// =======================================================
// OUTREACH SAVE
// =======================================================

export const saveOutreachToDb = async (
  leadId: string,
  details: LeadDetails
): Promise<boolean> => {
  try {
    if (!details?.outreach?.steps?.length)
      throw new Error("Invalid outreach data");

    const firstStep = details.outreach.steps[0];

    const { error } = await supabase.from("outreach").insert({
      lead_id: leadId,
      tone: "Direct",
      subject: firstStep.subject,
      body: firstStep.body,
      follow_up_stage: 1,
      next_follow_up_date: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
      response_received: false,
      sequence_data: details.outreach
    });

    if (error) safeThrow(error, "DB_SAVE_OUTREACH_FAILED");

    return true;
  } catch (err) {
    console.error("Outreach Save Error:", err);
    return false;
  }
};

// =======================================================
// FETCH LEADS
// =======================================================

export const fetchLeadsFromDb = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select(
        `
        *,
        outreach (
          id,
          follow_up_stage,
          next_follow_up_date,
          response_received
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) safeThrow(error, "DB_FETCH_FAILED");

    return data.map((d: any) => {
      const lead = mapLeadFromDb(d);

      if (d.outreach?.length) {
        const o = d.outreach[0];

        if (o.response_received) {
          lead.status = "Replied";
        } else if (
          o.next_follow_up_date &&
          new Date(o.next_follow_up_date) <= new Date()
        ) {
          lead.status = "Follow-Up Due";
        } else {
          lead.status = "Email Sent";
        }
      } else if (d.market_scan?.opportunityScore) {
        lead.status = "Analyzed";
      }

      return lead;
    });
  } catch (err) {
    console.warn("Fetch Leads Error:", err);
    return [];
  }
};

// =======================================================
// FOLLOW-UP QUEUE
// =======================================================

export const fetchFollowUpQueue = async () => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("outreach")
      .select(
        `
        *,
        leads (
          id,
          business_name,
          email,
          market_scan
        )
      `
      )
      .lte("next_follow_up_date", now)
      .eq("response_received", false);

    if (error) safeThrow(error, "QUEUE_FETCH_FAILED");

    return data || [];
  } catch (err) {
    console.error("Follow-Up Queue Error:", err);
    return [];
  }
};

// =======================================================
// FOLLOW-UP PROGRESSION
// =======================================================

export const generateReminder = async (
  outreachId: string,
  currentStage: number
): Promise<boolean> => {
  try {
    const nextStage = currentStage + 1;

    if (nextStage > 3) {
      await supabase
        .from("outreach")
        .update({ next_follow_up_date: null })
        .eq("id", outreachId);
      return true;
    }

    const daysToAdd = nextStage === 2 ? 4 : 5;
    const nextDate = new Date(
      Date.now() + daysToAdd * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase
      .from("outreach")
      .update({
        follow_up_stage: nextStage,
        next_follow_up_date: nextDate
      })
      .eq("id", outreachId);

    if (error) safeThrow(error, "REMINDER_UPDATE_FAILED");

    return true;
  } catch (err) {
    console.error("Reminder Error:", err);
    return false;
  }
};

// =======================================================
// AI LOGGING
// =======================================================

export const logAiAction = async (
  action: string,
  model: string,
  errorType?: string
) => {
  try {
    await supabase.from("ai_logs").insert({
      provider: "Gemini",
      action,
      model,
      token_usage: 0,
      status: errorType ? "ERROR" : "SUCCESS",
      error_type: errorType || null,
      created_at: new Date().toISOString()
    });
  } catch {
    // Never block main flow for logs
  }
};

// =======================================================
// CSV EXPORT (SAFE)
// =======================================================

export const exportLeadsToCSV = (leads: Lead[]) => {
  const headers = [
    "Business",
    "Email",
    "Status",
    "Opportunity Score",
    "Website",
    "Location"
  ];

  const rows = leads.map((l) =>
    [
      `"${l.business_name || ""}"`,
      `"${l.email || ""}"`,
      `"${l.status}"`,
      l.market_scan?.opportunityScore || 0,
      `"${l.website_url || ""}"`,
      `"${l.location || ""}"`
    ].join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `leadgen_export_${Date.now()}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
