import React, { useState, useEffect } from "react";
import SearchForm from "./components/SearchForm";
import ResultsTable from "./components/ResultsTable";
import AgentStatus from "./components/AgentStatus";
import LeadDetailModal from "./components/LeadDetailModal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DatabaseView from "./components/DatabaseView";
import SettingsView from "./components/SettingsView";
import FollowUpQueue from "./components/FollowUpQueue";
import { Lead, AgentState, LeadDetails } from "./types";
import { generateLeads, generateLeadDetails } from "./services/geminiService";
import { fetchLeadsFromDb } from "./services/databaseService";
import {
  Bot,
  BarChart3,
  Database,
  Clock,
  Settings,
  LogOut,
  ShieldCheck,
  Lock,
} from "lucide-react";

// 🔐 HARD PASSWORD
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

const App: React.FC = () => {
  // ==============================
  // PASSWORD AUTH STATE
  // ==============================

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("private_access_granted");
    if (saved === "true") {
      setAuthenticated(true);
      fetchLeadsFromDb().then(setLeads);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      localStorage.setItem("private_access_granted", "true");
      setAuthenticated(true);
      setLoginError("");
      fetchLeadsFromDb().then(setLeads);
    } else {
      setLoginError("Invalid password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("private_access_granted");
    setAuthenticated(false);
    setPassword("");
  };

  // ==============================
  // APP STATE
  // ==============================

  const [activeView, setActiveView] = useState<
    "intelligence" | "database" | "analytics" | "queue" | "settings"
  >("intelligence");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentState, setAgentState] = useState<AgentState>({
    status: "idle",
    logs: [],
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handleSearch = async (criteria: any) => {
    setAgentState({
      status: "searching",
      logs: ["Initializing Private Market Scan..."],
    });

    const result = await generateLeads(criteria);

    if (result.status === "success" && result.data) {
      setLeads((prev) => [...prev, ...result.data!.leads]);
      setAgentState({ status: "complete", logs: [] });
    } else {
      setAgentState({
        status: "error",
        logs: [result.error?.message || "Error"],
      });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLoadingDetails(true);

    generateLeadDetails(lead, "Direct").then((res) => {
      if (res.data) setLeadDetails(res.data);
      setIsLoadingDetails(false);
    });
  };

  // ==============================
  // LOGIN SCREEN
  // ==============================

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Private Intelligence Access
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Restricted Environment. Authorized Personnel Only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Access Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter secure password"
                required
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-xs bg-red-900/10 p-3 rounded border border-red-900/30">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Unlock System
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==============================
  // MAIN DASHBOARD
  // ==============================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="font-bold text-white tracking-tight flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" />
            Private SaaS
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton
            active={activeView === "intelligence"}
            onClick={() => setActiveView("intelligence")}
            icon={<Bot />}
            label="Market Scan"
          />
          <NavButton
            active={activeView === "database"}
            onClick={() => setActiveView("database")}
            icon={<Database />}
            label="Lead Database"
          />
          <NavButton
            active={activeView === "queue"}
            onClick={() => setActiveView("queue")}
            icon={<Clock />}
            label="Follow-Up Queue"
          />
          <NavButton
            active={activeView === "analytics"}
            onClick={() => setActiveView("analytics")}
            icon={<BarChart3 />}
            label="Analytics"
          />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavButton
              active={activeView === "settings"}
              onClick={() => setActiveView("settings")}
              icon={<Settings />}
              label="Configuration"
            />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center text-slate-500 hover:text-white text-sm transition-colors w-full"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          {activeView === "intelligence" && (
            <>
              <SearchForm
                onSearch={handleSearch}
                disabled={agentState.status === "searching"}
              />
              <AgentStatus state={agentState} />
              <ResultsTable
                leads={leads}
                sources={[]}
                onLeadClick={handleLeadClick}
              />
            </>
          )}

          {activeView === "database" && (
            <DatabaseView onLeadClick={handleLeadClick} />
          )}
          {activeView === "queue" && <FollowUpQueue />}
          {activeView === "analytics" && <AnalyticsDashboard leads={leads} />}
          {activeView === "settings" && <SettingsView />}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          details={leadDetails}
          isLoading={isLoadingDetails}
          onClose={() => setSelectedLead(null)}
          onRegenerateEmail={() => {}}
          gmailConnected={false}
        />
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}
  >
    {React.cloneElement(icon, { className: "w-4 h-4 mr-3" })}
    {label}
  </button>
);

export default App;
