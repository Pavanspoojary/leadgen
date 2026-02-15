import React, { useState } from 'react';
import { SearchCriteria, SourceStrategy } from '../types';
import { Search, MapPin, Briefcase, Target, Globe, Instagram, Linkedin, BookOpen, Sparkles, Layout } from 'lucide-react';

interface SearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  disabled: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, disabled }) => {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    industry: '',
    location: '',
    sourceStrategy: 'Hybrid',
    businessSize: 'Any',
    websiteFilter: 'All',
    strategicIntent: 'General Discovery'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (criteria.industry && criteria.location) {
      onSearch(criteria);
    }
  };

  const StrategyButton = ({ strategy, icon, label, description }: { strategy: SourceStrategy, icon: React.ReactNode, label: string, description: string }) => {
      const isActive = criteria.sourceStrategy === strategy;
      return (
          <button
            type="button"
            onClick={() => setCriteria({...criteria, sourceStrategy: strategy})}
            disabled={disabled}
            className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group h-full ${
                isActive 
                ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20' 
                : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
              <div className={`mb-2 p-2 rounded-full ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'}`}>
                  {icon}
              </div>
              <span className={`text-xs font-bold mb-1 ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{label}</span>
              <span className="text-[10px] text-slate-500 text-center leading-tight hidden md:block">{description}</span>
          </button>
      )
  }

  return (
    <form onSubmit={handleSubmit} className={`bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-xl mb-8 transition-all ${disabled ? 'opacity-80' : ''}`}>
      
      {/* 1. Core Targeting */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-slate-300">
            <Briefcase className="w-4 h-4 mr-2 text-blue-400" />
            Target Industry
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Cosmetic Surgeons"
            value={criteria.industry}
            onChange={(e) => setCriteria({ ...criteria, industry: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 disabled:opacity-50"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-slate-300">
            <MapPin className="w-4 h-4 mr-2 text-red-400" />
            Location
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Miami, FL"
            value={criteria.location}
            onChange={(e) => setCriteria({ ...criteria, location: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 disabled:opacity-50"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-slate-300">
            <Target className="w-4 h-4 mr-2 text-emerald-400" />
            Strategic Intent
          </label>
          <div className="relative">
            <select
              value={criteria.strategicIntent}
              onChange={(e) => setCriteria({ ...criteria, strategicIntent: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
              disabled={disabled}
            >
              <option value="General Discovery">General Discovery</option>
              <option value="High-Value Fixer Uppers">High-Value Fixer Uppers</option>
              <option value="Digital Laggards">Digital Laggards (No Site)</option>
              <option value="Market Leaders">Market Leaders (Optimization)</option>
              <option value="Quick Wins">Quick Wins (SSL/Speed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Lead Source Strategy */}
      <div className="mb-8">
          <label className="flex items-center text-sm font-medium text-slate-300 mb-3">
              <Globe className="w-4 h-4 mr-2 text-purple-400" />
              Lead Source Strategy
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StrategyButton 
                strategy="Hybrid" 
                icon={<Sparkles className="w-4 h-4" />} 
                label="Hybrid Scan" 
                description="AI selects best mix" 
              />
              <StrategyButton 
                strategy="Google Maps" 
                icon={<MapPin className="w-4 h-4" />} 
                label="Google Maps" 
                description="Local presence focus" 
              />
              <StrategyButton 
                strategy="Instagram" 
                icon={<Instagram className="w-4 h-4" />} 
                label="Instagram" 
                description="Social-first brands" 
              />
              <StrategyButton 
                strategy="LinkedIn" 
                icon={<Linkedin className="w-4 h-4" />} 
                label="LinkedIn" 
                description="B2B & Enterprise" 
              />
              <StrategyButton 
                strategy="Directories" 
                icon={<BookOpen className="w-4 h-4" />} 
                label="Directories" 
                description="Yelp, listings reliant" 
              />
          </div>
      </div>

      {/* 3. Advanced Filters & Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
        <div className="space-y-2">
          <label className="flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider">
            Website Status
          </label>
          <select
              value={criteria.websiteFilter}
              onChange={(e) => setCriteria({ ...criteria, websiteFilter: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              disabled={disabled}
            >
              <option value="All">Any Status</option>
              <option value="With Website">Has Website</option>
              <option value="Without Website">No Website</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider">
            Business Size
          </label>
           <select
              value={criteria.businessSize}
              onChange={(e) => setCriteria({ ...criteria, businessSize: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              disabled={disabled}
            >
              <option value="Any">Any Size</option>
              <option value="Small">Small (1-10)</option>
              <option value="Medium">Medium (11-50)</option>
              <option value="Large">Large (50+)</option>
            </select>
        </div>

        <div className="flex items-end justify-end">
             <button
            type="submit"
            disabled={disabled || !criteria.industry || !criteria.location}
            className={`w-full md:w-auto flex items-center justify-center px-8 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all 
                ${disabled 
                ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20 active:scale-95'
                }`}
            >
            {disabled ? (
                <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Scanning...</span>
                </div>
            ) : (
                <>
                <Search className="w-4 h-4 mr-2" />
                Launch Intelligence
                </>
            )}
            </button>
        </div>
      </div>
    </form>
  );
};

export default SearchForm;