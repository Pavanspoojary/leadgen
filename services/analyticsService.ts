import { Lead } from '../types';

export interface KPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export const calculateKPIs = (leads: Lead[]): KPI[] => {
  const totalLeads = leads.length;
  const emailsSent = leads.filter(l => l.status === 'Email Sent' || l.status === 'Replied' || l.status === 'Closed Won').length;
  const replies = leads.filter(l => l.status === 'Replied' || l.status === 'Closed Won').length;
  
  const responseRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;
  
  // Estimate Pipeline Value
  const pipelineValue = leads.reduce((acc, lead) => {
    // Only count if Analyzed or beyond
    if (lead.dealValue && lead.status !== 'Closed Lost') {
      return acc + lead.dealValue;
    }
    return acc;
  }, 0);

  return [
    { label: 'Total Leads Found', value: totalLeads, change: 12, trend: 'up' },
    { label: 'Emails Sent', value: emailsSent, change: 5, trend: 'up' },
    { label: 'Replies Received', value: replies, change: 2, trend: 'up' },
    { label: 'Response Rate', value: `${responseRate}%`, change: 0, trend: 'neutral' },
    { label: 'Avg Response Time', value: '4.2h', change: -10, trend: 'up' }, // Mocked for demo
    { label: 'Est. Pipeline Value', value: `$${(pipelineValue / 1000).toFixed(1)}k`, change: 8, trend: 'up' },
  ];
};

export const getFunnelData = (leads: Lead[]) => {
  const total = leads.length;
  const analyzed = leads.filter(l => l.status !== 'New').length;
  const contacted = leads.filter(l => ['Email Sent', 'Follow-Up Due', 'Replied', 'Closed Won', 'Closed Lost'].includes(l.status)).length;
  const replied = leads.filter(l => ['Replied', 'Closed Won'].includes(l.status)).length;
  const closed = leads.filter(l => l.status === 'Closed Won').length;

  return [
    { name: 'Leads Found', value: total, fill: '#3b82f6' },
    { name: 'Audited', value: analyzed, fill: '#8b5cf6' },
    { name: 'Contacted', value: contacted, fill: '#eab308' },
    { name: 'Replied', value: replied, fill: '#22c55e' },
    { name: 'Closed', value: closed, fill: '#10b981' },
  ];
};

export const getHookPerformance = (leads: Lead[]) => {
  const hookStats: Record<string, { sent: number; replied: number }> = {};

  leads.forEach(lead => {
    if (lead.hookType) {
      if (!hookStats[lead.hookType]) hookStats[lead.hookType] = { sent: 0, replied: 0 };
      hookStats[lead.hookType].sent++;
      if (['Replied', 'Closed Won'].includes(lead.status)) {
        hookStats[lead.hookType].replied++;
      }
    }
  });

  return Object.keys(hookStats).map(hook => ({
    name: hook,
    sent: hookStats[hook].sent,
    replies: hookStats[hook].replied,
    rate: hookStats[hook].sent > 0 ? Math.round((hookStats[hook].replied / hookStats[hook].sent) * 100) : 0
  })).sort((a, b) => b.rate - a.rate);
};

export const getTonePerformance = (leads: Lead[]) => {
    const toneStats: Record<string, { sent: number; replied: number }> = {};
  
    leads.forEach(lead => {
      if (lead.tone) {
        if (!toneStats[lead.tone]) toneStats[lead.tone] = { sent: 0, replied: 0 };
        toneStats[lead.tone].sent++;
        if (['Replied', 'Closed Won'].includes(lead.status)) {
          toneStats[lead.tone].replied++;
        }
      }
    });
  
    return Object.keys(toneStats).map(tone => ({
      name: tone,
      rate: toneStats[tone].sent > 0 ? Math.round((toneStats[tone].replied / toneStats[tone].sent) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);
};

export const parseDealSize = (rangeStr: string): number => {
    if (!rangeStr) return 0;
    // Extract numbers from string like "$10,000 - $20,000"
    const numbers = rangeStr.match(/(\d+(?:,\d+)*)/g);
    if (!numbers || numbers.length === 0) return 0;
    
    const val1 = parseInt(numbers[0].replace(/,/g, ''), 10);
    const val2 = numbers.length > 1 ? parseInt(numbers[1].replace(/,/g, ''), 10) : val1;
    
    return Math.round((val1 + val2) / 2);
};