import { Lead, LeadStatus } from '../types';

const STORAGE_KEY = 'revenue_engine_leads';

export const loadMemory = (): Lead[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to parse lead memory", e);
    return [];
  }
};

export const saveLeadsToMemory = (leads: Lead[]) => {
  const current = loadMemory();
  // Filter out any that are already in current to prevent duplication
  const uniqueNew = leads.filter(l => !isDuplicate(l, current));
  
  if (uniqueNew.length > 0) {
    const updated = [...current, ...uniqueNew];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};

export const updateLeadInMemory = (updatedLead: Lead) => {
  const current = loadMemory();
  const index = current.findIndex(l => l.id === updatedLead.id || l.email === updatedLead.email);
  
  if (index !== -1) {
    current[index] = updatedLead;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
};

export const isDuplicate = (lead: Lead, memory: Lead[]): boolean => {
  // Check against Email (Primary Key)
  if (lead.email && memory.some(m => m.email.toLowerCase() === lead.email.toLowerCase())) return true;

  // Check against Website Domain (Secondary Key)
  if (lead.website_url) {
    const leadDomain = getDomain(lead.website_url);
    if (leadDomain) {
      if (memory.some(m => m.website_url && getDomain(m.website_url) === leadDomain)) return true;
    }
  }

  // Check against Company Name + City (Fuzzy)
  if (memory.some(m => m.business_name.toLowerCase() === lead.business_name.toLowerCase() && m.location.toLowerCase() === lead.location.toLowerCase())) {
      return true;
  }

  return false;
};

const getDomain = (url: string): string | null => {
  try {
    const normalize = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalize).hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
};