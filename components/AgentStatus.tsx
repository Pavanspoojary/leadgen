import React, { useEffect, useState } from 'react';
import { AgentState } from '../types';
import { Terminal } from 'lucide-react';

interface AgentStatusProps {
  state: AgentState;
}

const AgentStatus: React.FC<AgentStatusProps> = ({ state }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (state.status === 'searching' || state.status === 'analyzing') {
      const interval = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [state.status]);

  if (state.status === 'idle') return null;

  return (
    <div className="bg-black/50 border border-slate-700 rounded-lg p-6 font-mono text-sm shadow-2xl backdrop-blur-sm mb-8">
      <div className="flex items-center text-slate-400 border-b border-slate-800 pb-3 mb-3">
        <Terminal className="w-4 h-4 mr-2" />
        <span>Agent Terminal</span>
        <div className="ml-auto flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      
      <div className="space-y-2 h-48 overflow-y-auto flex flex-col-reverse">
        {state.status === 'searching' && (
           <div className="text-blue-400 animate-pulse">
             > Connecting to global search nodes{dots}
           </div>
        )}
        {state.status === 'analyzing' && (
           <div className="text-purple-400 animate-pulse">
             > Analyzing website structures and SEO metadata{dots}
           </div>
        )}
        
        {state.logs.map((log, i) => (
          <div key={i} className="text-slate-300">
            <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
            {log}
          </div>
        ))}
        <div className="text-green-500">> System Initialized.</div>
      </div>
    </div>
  );
};

export default AgentStatus;