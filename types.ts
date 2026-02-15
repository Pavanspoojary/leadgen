export type SourceStrategy = 'Hybrid' | 'Google Maps' | 'Instagram' | 'LinkedIn' | 'Directories';

export interface SearchCriteria {
  industry: string;
  location: string;
  sourceStrategy: SourceStrategy;
  businessSize: 'Small' | 'Medium' | 'Large' | 'Any';
  websiteFilter: 'With Website' | 'Without Website' | 'All';
  strategicIntent: 'General Discovery' | 'High-Value Fixer Uppers' | 'Digital Laggards' | 'Market Leaders' | 'Quick Wins';
}

export type LeadStatus = 'New' | 'Analyzed' | 'Email Sent' | 'Follow-Up Due' | 'Replied' | 'Closed Won' | 'Closed Lost';

// AI Provider Types
export type AiProviderStatus = 'connected' | 'rate_limit' | 'quota_exceeded' | 'invalid_key' | 'network_error' | 'not_configured';

export interface AiError {
  type: AiProviderStatus;
  message: string;
  retryable: boolean;
}

export interface AiResponse<T> {
  success: boolean;
  data?: T;
  error?: AiError;
}

// Service Types
export interface ServiceError {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface ServiceResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: ServiceError;
}

// Database Entities
export interface Lead {
  id: string;
  created_at?: string;
  business_name: string; // Mapped from companyName
  industry: string; // Mapped from profession
  location: string; // Mapped from city
  website_url: string; // Mapped from website
  website_status: string;
  source_platform: string;
  email: string;
  notes: string;
  
  // JSONB Fields
  contact_info: {
    fullName: string;
    phone: string;
  };
  market_scan: {
    opportunityScore: number;
    digitalMaturityScore: number;
    estimatedDealValue: string;
    competitiveRisk: string;
    priorityRank: number;
    opportunityType?: string;
  };

  // Frontend Computed
  status: LeadStatus; 

  // Optional Frontend Fields (Analytics/State)
  dealValue?: number;
  hookType?: string;
  tone?: string;
  lastEmailSentAt?: string;
  emailThreadId?: string;
  lastContacted?: string;
  techStackPreview?: string;
}

export interface Audit {
  id: string;
  lead_id: string;
  created_at: string;
  performance_score: number;
  seo_score: number;
  conversion_score: number;
  branding_score: number;
  trust_score: number;
  digital_maturity_index: number;
  primary_opportunity: string;
  raw_data: LeadDetails;
}

export interface Outreach {
  id: string;
  lead_id: string;
  created_at: string;
  tone: string;
  subject: string;
  body: string;
  follow_up_stage: number;
  next_follow_up_date: string;
  response_received: boolean;
  sequence_data: EmailSequence;
}

// Legacy Frontend Interfaces (kept for UI compatibility)
export interface LeadDetails {
  digitalMaturity: {
    score: number;
    level: string;
    techStack: string[];
    biggestGap: string;
  };
  revenueInsights: {
    estimatedTier: string;
    dealSizeEstimate: string;
    responseProbability: number;
    urgencyScore: number;
  };
  competitors: {
    name: string;
    advantage: string;
    vulnerability: string;
  }[];
  enrichment: EnrichmentData;
  outreach: EmailSequence;
  proposal: Proposal;
  auditSummary: string;
  strategicRecommendations: string[];
  priorityScore: number; 
}

export interface EnrichmentData {
  cms: string;
  analytics: string[];
  ssl: boolean;
  mobileResponsive: boolean;
  pageSpeedObservation: string;
  socialPresence: string[];
}

export interface Proposal {
  problemSummary: string;
  solution: string;
  scopeOfWork: string[];
  outcome: string;
  timeline: string;
  pricingRange: string;
  roiReasoning: string;
}

export interface EmailStep {
  step: number;
  subject: string;
  body: string;
  type: 'Introduction' | 'Value Add' | 'Break-up';
  hook_used?: string;
}

export interface EmailSequence {
  steps: EmailStep[];
  hook_type: string;
  angle: string;
}

export interface FollowUpRecommendation {
  recommendedDay: string;
  recommendedTime: string;
  confidenceScore: number;
  reasoning: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AgentState {
  status: 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
  logs: string[];
}