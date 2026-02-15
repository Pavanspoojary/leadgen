import React, { useState, useMemo } from 'react';
import { Lead, GroundingSource, LeadStatus } from '../types';
import { Download, Globe, XCircle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Zap, Flame, Mail, Reply } from 'lucide-react';

interface ResultsTableProps {
  leads: Lead[];
  sources: GroundingSource[];
  onLeadClick: (lead: Lead) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ leads, sources, onLeadClick }) => {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'market_scan.opportunityScore',
    direction: 'desc'
  });

  const processedLeads = useMemo(() => {
    let result = [...leads];

    result = result.filter(lead => {
      const matchesText = (
        (lead.contact_info?.fullName || '').toLowerCase().includes(filterText.toLowerCase()) ||
        lead.business_name.toLowerCase().includes(filterText.toLowerCase()) ||
        lead.email.toLowerCase().includes(filterText.toLowerCase()) ||
        lead.industry.toLowerCase().includes(filterText.toLowerCase())
      );
      
      const matchesStatus = statusFilter === 'All' || lead.website_status === statusFilter;
      const matchesScore = (lead.market_scan?.opportunityScore || 0) >= minScore;

      return matchesText && matchesStatus && matchesScore;
    });

    result.sort((a, b) => {
      // Handle nested properties for sorting
      const getValue = (obj: any, path: string) => {
          return path.split('.').reduce((o, i) => o?.[i], obj);
      };

      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);
      
      if (aValue === bValue) return 0;
      
      // Handle missing values
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      const modifier = sortConfig.direction === 'asc' ? 1 : -1;
      
      // Parse deal value ranges for sorting (e.g. "$2k-$5k")
      if (sortConfig.key === 'market_scan.estimatedDealValue' && typeof aValue === 'string') {
          const parseVal = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
          return (parseVal(aValue) - parseVal(bValue)) * modifier;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') return aValue.localeCompare(bValue) * modifier;
      if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * modifier;
      return 0;
    });

    return result;
  }, [leads, filterText, statusFilter, minScore, sortConfig]);

  if (leads.length === 0) return null;

  const downloadCSV = () => {
    const headers = ["Rank", "Status", "Company", "Opp Score", "Digital Maturity", "Deal Size", "Risk", "Website"];
    const rows = processedLeads.map(lead => [
      lead.market_scan?.priorityRank || 0,
      lead.status,
      lead.business_name,
      lead.market_scan?.opportunityScore || 0,
      lead.market_scan?.digitalMaturityScore || 0,
      lead.market_scan?.estimatedDealValue || '-',
      lead.market_scan?.competitiveRisk || '-',
      lead.website_url
    ].map(field => `"${field}"`).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "market_scan_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

  const getOppScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-slate-400';
  };
  
  const getRiskBadge = (risk: string) => {
      const colors = {
          'Low': 'bg-emerald-900/30 text-emerald-300 border-emerald-900/50',
          'Medium': 'bg-yellow-900/30 text-yellow-300 border-yellow-900/50',
          'High': 'bg-red-900/30 text-red-300 border-red-900/50'
      };
      const cls = colors[risk as keyof typeof colors] || 'bg-slate-800 text-slate-400';
      return <span className={`text-[10px] px-2 py-0.5 rounded border ${cls}`}>{risk} Risk</span>;
  };

  const getStatusBadge = (status: LeadStatus) => {
      switch(status) {
          case 'New': return <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-900/50">New</span>;
          case 'Analyzed': return <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-900/50">Analyzed</span>;
          case 'Email Sent': return <span className="text-[10px] bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded border border-yellow-900/50 flex items-center w-fit"><Mail className="w-3 h-3 mr-1"/> Sent</span>;
          case 'Replied': return <span className="text-[10px] bg-green-900/30 text-green-300 px-2 py-0.5 rounded border border-green-900/50 flex items-center w-fit"><Reply className="w-3 h-3 mr-1"/> Replied</span>;
          case 'Closed Won': return <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-900/50">Won</span>;
          case 'Closed Lost': return <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Lost</span>;
          default: return <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">New</span>;
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Market Scan Results ({leads.length})
        </h2>
        <div className="flex gap-2">
            <button className="flex items-center px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 rounded-lg text-sm transition-colors border border-blue-500/30">
                <Zap className="w-4 h-4 mr-2" />
                Batch Outreach (Top 5)
            </button>
            <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors border border-slate-600">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
            </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search businesses..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none" value={filterText} onChange={e => setFilterText(e.target.value)} />
        </div>
        <div className="md:col-span-3 relative">
          <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <select className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Has Website">Has Website</option>
            <option value="No Website">No Website</option>
            <option value="Email Sent">Email Sent</option>
          </select>
        </div>
        <div className="md:col-span-4 flex items-center space-x-3 bg-slate-950 px-3 rounded-lg border border-slate-700">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap min-w-[70px]">Min Opp: <span className="text-blue-400">{minScore}</span></span>
          <input type="range" min="0" max="100" step="10" value={minScore} onChange={e => setMinScore(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-2xl">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-slate-700/50" onClick={() => handleSort('market_scan.priorityRank')}><div className="flex items-center">Rank <SortIcon columnKey="market_scan.priorityRank" /></div></th>
              <th className="px-4 py-3 cursor-pointer hover:bg-slate-700/50" onClick={() => handleSort('market_scan.opportunityScore')}><div className="flex items-center">Opp Score <SortIcon columnKey="market_scan.opportunityScore" /></div></th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3 cursor-pointer hover:bg-slate-700/50" onClick={() => handleSort('market_scan.digitalMaturityScore')}><div className="flex items-center">Digital Maturity <SortIcon columnKey="market_scan.digitalMaturityScore" /></div></th>
              <th className="px-4 py-3 cursor-pointer hover:bg-slate-700/50" onClick={() => handleSort('market_scan.estimatedDealValue')}><div className="flex items-center">Deal Size <SortIcon columnKey="market_scan.estimatedDealValue" /></div></th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 bg-slate-850">
            {processedLeads.map((lead) => {
                const oppScore = lead.market_scan?.opportunityScore || 0;
                const matScore = lead.market_scan?.digitalMaturityScore || 0;
                return (
              <tr key={lead.id} onClick={() => onLeadClick(lead)} className={`hover:bg-slate-800/80 transition-colors cursor-pointer group ${oppScore >= 80 ? 'bg-blue-900/5' : ''}`}>
                <td className="px-4 py-4 font-mono text-slate-500">
                    #{lead.market_scan?.priorityRank || 0}
                </td>
                <td className="px-4 py-4">
                  <div className={`flex items-center font-bold text-lg ${getOppScoreColor(oppScore)}`}>
                    {oppScore}
                    {oppScore > 80 && <Flame className="w-3 h-3 ml-1 fill-current" />}
                  </div>
                  <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${oppScore > 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{width: `${oppScore}%`}}></div>
                  </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-white text-base">{lead.business_name}</div>
                        {getStatusBadge(lead.status)}
                    </div>
                    <div className="text-slate-400 text-xs flex items-center gap-2">
                        {lead.website_url ? (
                            <a href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center text-blue-400 hover:underline">
                                <Globe className="w-3 h-3 mr-1" /> Website
                            </a>
                        ) : (
                            <span className="flex items-center text-red-400"><XCircle className="w-3 h-3 mr-1" /> No Site</span>
                        )}
                        <span className="text-slate-600">|</span>
                        <span>{lead.location}</span>
                    </div>
                </td>
                <td className="px-4 py-4">
                   <div className="flex items-center gap-2">
                       <div className="text-xs font-mono">{matScore}/100</div>
                       <div className="flex-1 w-20 h-1.5 bg-slate-800 rounded-full">
                           <div className="h-full bg-purple-500 rounded-full" style={{width: `${matScore}%`}}></div>
                       </div>
                   </div>
                   <div className="text-[10px] text-slate-500 mt-1">{lead.techStackPreview}</div>
                </td>
                <td className="px-4 py-4 font-mono text-emerald-400 font-medium">
                    {lead.market_scan?.estimatedDealValue || '-'}
                </td>
                <td className="px-4 py-4">
                    {getRiskBadge(lead.market_scan?.competitiveRisk || 'Medium')}
                </td>
                <td className="px-4 py-4"><ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" /></td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {sources.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Intelligence Sources</h3>
           <div className="flex flex-wrap gap-2">
             {sources.map((source, idx) => (
               <a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline bg-blue-900/10 px-2 py-1 rounded">
                {source.title.substring(0, 30)}...
              </a>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;