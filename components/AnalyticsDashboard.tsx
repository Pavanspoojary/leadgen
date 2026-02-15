import React, { useMemo } from 'react';
import { Lead, LeadStatus } from '../types';
import { calculateKPIs, getFunnelData, getHookPerformance, getTonePerformance } from '../services/analyticsService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, Mail, MessageSquare, DollarSign, Activity, Filter, Clock } from 'lucide-react';

interface AnalyticsDashboardProps {
  leads: Lead[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ leads }) => {
  const kpis = useMemo(() => calculateKPIs(leads), [leads]);
  const funnelData = useMemo(() => getFunnelData(leads), [leads]);
  const hookData = useMemo(() => getHookPerformance(leads), [leads]);
  const toneData = useMemo(() => getTonePerformance(leads), [leads]);

  // Derived Pipeline Data for Kanban Board
  const pipeline = {
    'Email Sent': leads.filter(l => l.status === 'Email Sent'),
    'Follow-Up Due': leads.filter(l => l.status === 'Follow-Up Due'),
    'Replied': leads.filter(l => l.status === 'Replied'),
    'Closed Won': leads.filter(l => l.status === 'Closed Won')
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-1.5 rounded-full ${kpi.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
              {kpi.value}
            </div>
            <div className={`text-xs ${kpi.change >= 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
              {kpi.change >= 0 ? '+' : ''}{kpi.change}% vs last 7 days
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-xl group-hover:from-blue-600/20 transition-all"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Response Funnel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
            <Filter className="w-4 h-4 mr-2 text-blue-500" /> Conversion Funnel
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#93c5fd' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Deal Velocity / Pipeline Snapshot */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-emerald-500" /> Pipeline Health
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                 <div>
                     <span className="text-xs text-slate-500 block">Avg. Response Time</span>
                     <span className="text-lg font-bold text-white">4.2 Hours</span>
                 </div>
                 <Clock className="w-6 h-6 text-blue-400 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                 <div>
                     <span className="text-xs text-slate-500 block">Close Rate (Est)</span>
                     <span className="text-lg font-bold text-emerald-400">12.5%</span>
                 </div>
                 <TrendingUp className="w-6 h-6 text-emerald-400 opacity-50" />
            </div>
            <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                 <h4 className="text-xs font-bold text-blue-400 mb-2">AI Insight</h4>
                 <p className="text-xs text-slate-400 leading-relaxed">
                     Leads contacted on <strong>Tuesdays</strong> with <strong>Direct</strong> tone show a 22% higher response rate. Consider scheduling follow-ups for tomorrow morning.
                 </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 4. Hook Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-500" /> Hook Strategy Performance
            </h3>
            <div className="h-64 w-full">
                {hookData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={hookData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={10} />
                        <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Bar dataKey="rate" name="Reply Rate %" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No outreach data available yet.
                    </div>
                )}
            </div>
          </div>

          {/* 5. Tone Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-yellow-500" /> Tone Resonance
            </h3>
            <div className="h-64 w-full">
                {toneData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toneData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Bar dataKey="rate" name="Positive Reply %" fill="#eab308" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No tone data recorded.
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* 6. Active Deal Pipeline (Kanban-lite) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-green-500" /> Active Opportunities
        </h3>
        <div className="flex gap-4 min-w-[800px]">
            {Object.entries(pipeline).map(([stage, stageLeads]) => (
                <div key={stage} className="flex-1 bg-slate-950/50 rounded-lg p-3 border border-slate-800 min-h-[200px]">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-300 uppercase">{stage}</span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-2">
                        {stageLeads.length === 0 && (
                            <div className="text-center text-[10px] text-slate-600 italic py-4">Empty</div>
                        )}
                        {stageLeads.map(lead => (
                            <div key={lead.id} className="bg-slate-900 p-2 rounded border border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer group">
                                <div className="font-medium text-xs text-white truncate">{lead.business_name}</div>
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-[10px] text-slate-500">{lead.location}</span>
                                    {lead.dealValue && (
                                        <span className="text-[10px] text-emerald-400 font-mono">${(lead.dealValue/1000).toFixed(0)}k</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;