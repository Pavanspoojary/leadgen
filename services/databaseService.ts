import { supabase } from '../utils/supabaseClient';
import { Lead, Audit, Outreach, LeadDetails, LeadStatus, AiProviderStatus } from '../types';

// --- Mappers ---

const mapLeadFromDb = (d: any): Lead => {
  // Determine status based on outreach existence or explicitly stored field
  // For simplicity, we assume the DB 'website_status' is just that, but real "CRM Status" 
  // is derived from outreach records or a 'status' column if added to schema.
  // The schema has specific fields, let's map them.
  
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
    status: 'New' // Default, should be hydrated by joining outreach status
  };
};

// --- CRUD ---

export const saveLeadToDb = async (lead: Lead) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .upsert({
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
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return mapLeadFromDb(data);
  } catch (error) {
    console.error('DB Save Lead Error:', error);
    return null;
  }
};

export const saveAuditToDb = async (leadId: string, details: LeadDetails) => {
  try {
    const { error } = await supabase
      .from('audits')
      .insert({
        lead_id: leadId,
        performance_score: details.priorityScore, // Simplified mapping
        seo_score: details.digitalMaturity.score,
        conversion_score: details.revenueInsights.responseProbability,
        branding_score: 50, // Placeholder or AI derived
        trust_score: 50, // Placeholder
        digital_maturity_index: details.digitalMaturity.score,
        primary_opportunity: details.digitalMaturity.biggestGap,
        raw_data: details
      });
    if (error) throw error;
  } catch (error) {
    console.error('DB Save Audit Error:', error);
  }
};

export const saveOutreachToDb = async (leadId: string, details: LeadDetails) => {
  try {
    // Initial outreach creation
    const { error } = await supabase
      .from('outreach')
      .insert({
        lead_id: leadId,
        tone: 'Direct',
        subject: details.outreach.steps[0].subject,
        body: details.outreach.steps[0].body,
        follow_up_stage: 1,
        // Set first follow-up due in 3 days
        next_follow_up_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        response_received: false,
        sequence_data: details.outreach
      });

    if (error) throw error;
  } catch (error) {
    console.error('DB Save Outreach Error:', error);
  }
};

export const fetchLeadsFromDb = async (filter?: string) => {
  try {
    let query = supabase.from('leads').select(`
      *,
      outreach (
        follow_up_stage,
        next_follow_up_date,
        response_received
      )
    `).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data.map((d: any) => {
        const l = mapLeadFromDb(d);
        // Derive Status
        if (d.outreach && d.outreach.length > 0) {
            const o = d.outreach[0];
            if (o.response_received) l.status = 'Replied';
            else if (new Date(o.next_follow_up_date) <= new Date()) l.status = 'Follow-Up Due';
            else l.status = 'Email Sent';
        } else if (d.market_scan?.opportunityScore) {
             l.status = 'Analyzed'; // If we have scan data but no outreach
        }
        return l;
    });
  } catch (error) {
    console.warn('DB Fetch Error:', error);
    return [];
  }
};

// --- Follow-Up System ---

export const fetchFollowUpQueue = async () => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('outreach')
            .select(`
                *,
                leads (
                    id,
                    business_name,
                    email,
                    market_scan
                )
            `)
            .lte('next_follow_up_date', now)
            .eq('response_received', false);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Fetch Queue Error", error);
        return [];
    }
};

export const generateReminder = async (outreachId: string, currentStage: number) => {
    try {
        const nextStage = currentStage + 1;
        const daysToAdd = nextStage === 2 ? 4 : 5; // Strategic spacing
        const nextDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

        if (nextStage > 3) {
            // Stop sequence
             await supabase.from('outreach').update({ next_follow_up_date: null }).eq('id', outreachId);
             return;
        }

        await supabase
            .from('outreach')
            .update({
                follow_up_stage: nextStage,
                next_follow_up_date: nextDate
            })
            .eq('id', outreachId);
            
    } catch (e) {
        console.error(e);
    }
};

export const logAiAction = async (action: string, model: string, errorType?: string) => {
  try {
    await supabase.from('ai_logs').insert({
        provider: 'Gemini',
        token_usage: 0, // Mock for now
        status: errorType ? 'ERROR' : 'SUCCESS',
        error_type: errorType || null
    });
  } catch (e) {
    // Silent fail for logs
  }
};

export const exportLeadsToCSV = async (leads: Lead[]) => {
    // ... Existing implementation adapted for new fields ...
    const headers = ["Business", "Email", "Status", "Priority Score", "Follow Up Due"];
    const rows = leads.map(l => [
        l.business_name,
        l.email,
        l.status,
        l.market_scan?.opportunityScore || 0,
        l.status === 'Follow-Up Due' ? 'YES' : 'NO'
    ].join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `private_saas_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
