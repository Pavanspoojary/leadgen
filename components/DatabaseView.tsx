import React, { useEffect, useState } from 'react';
import { Lead } from '../types';
import { fetchLeadsFromDb, exportLeadsToCSV } from '../services/databaseService';
import ResultsTable from './ResultsTable';
import { Database, Filter, Download } from 'lucide-react';

interface DatabaseViewProps {
  onLeadClick: (lead: Lead) => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ onLeadClick }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'audited' | 'outreach'>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    setLoading(true);
    // In a real app we would pass 'audited' or 'outreach' as filters to fetchLeadsFromDb
    // to perform server-side filtering. Here we fetch all and filter client-side for simplicity
    // in this specific file update context, but fetchLeadsFromDb supports basic filters.
    const allLeads = await fetchLeadsFromDb();
    
    let filtered = allLeads;
    if (activeTab === 'audited') {
        filtered = allLeads.filter(l => l.status !== 'New');
    } else if (activeTab === 'outreach') {
        filtered = allLeads.filter(l => ['Email Sent', 'Replied', 'Closed Won'].includes(l.status));
    }
    
    setLeads(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, [activeTab]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center mb-4 md:mb-0">
          <Database className="w-5 h-5 mr-2 text-purple-400" />
          Intelligence Database
        </h2>
        
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
             <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
             >
                 Saved Leads
             </button>
             <button 
                onClick={() => setActiveTab('audited')}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'audited' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
             >
                 Audit History
             </button>
             <button 
                onClick={() => setActiveTab('outreach')}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'outreach' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
             >
                 Outreach History
             </button>
        </div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex justify-end mb-4">
              <button 
                onClick={() => exportLeadsToCSV(leads)}
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors border border-slate-700"
              >
                  <Download className="w-4 h-4 mr-2" />
                  Export Current View
              </button>
          </div>

          {loading ? (
              <div className="text-center py-12 text-slate-500">
                  <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-white rounded-full mx-auto mb-2"></div>
                  Loading records...
              </div>
          ) : (
              <ResultsTable leads={leads} sources={[]} onLeadClick={onLeadClick} />
          )}
      </div>
    </div>
  );
};

export default DatabaseView;