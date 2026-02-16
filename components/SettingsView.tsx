import React, { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
  Mail,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { getProviderStatus, validateConnection } from "../services/aiProvider";
import {
  checkGmailStatus,
  connectGmail,
  disconnectGmail,
} from "../services/gmailService";
import { AiProviderStatus } from "../types";

const SettingsView: React.FC = () => {
  const [status, setStatus] = useState<AiProviderStatus>(
    getProviderStatus()
  );
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const connected = await checkGmailStatus();
      setGmailConnected(connected);
    };

    init();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    await validateConnection();
    setStatus(getProviderStatus());
    setLoading(false);
  };

  const handleGmailConnect = async () => {
    setGmailLoading(true);
    await connectGmail();
  };

  const handleGmailDisconnect = async () => {
    setGmailLoading(true);
    await disconnectGmail();
    setGmailConnected(false);
    setGmailLoading(false);
  };

  const getStatusColor = (s: AiProviderStatus) => {
    switch (s) {
      case "connected":
        return "text-emerald-400 bg-emerald-900/20 border-emerald-900/50";
      case "invalid_key":
      case "quota_exceeded":
        return "text-red-400 bg-red-900/20 border-red-900/50";
      case "rate_limit":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-900/50";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  const getStatusMessage = (s: AiProviderStatus) => {
    switch (s) {
      case "connected":
        return "System Operational";
      case "invalid_key":
        return "Invalid API Key";
      case "quota_exceeded":
        return "Quota Exceeded";
      case "rate_limit":
        return "Rate Limited";
      case "not_configured":
        return "API Key Not Found";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center">
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 mr-4">
          <Lock className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            System Configuration
          </h2>
          <p className="text-slate-400 text-sm">
            Private SaaS Environment
          </p>
        </div>
      </div>

      {/* AI PROVIDER */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Server className="w-4 h-4 mr-2 text-slate-500" />
            AI Provider Status
          </h3>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={`p-4 rounded-lg border flex items-center justify-between ${getStatusColor(
              status
            )}`}
          >
            <div className="flex items-center">
              {status === "connected" ? (
                <CheckCircle2 className="w-5 h-5 mr-3" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-3" />
              )}
              <span className="font-bold">
                {getStatusMessage(status)}
              </span>
            </div>
            <div className="text-xs opacity-75 font-mono">
              Gemini
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <div className="text-sm text-white font-medium mb-1">
                Connection Test
              </div>
              <div className="text-xs text-slate-500">
                Validate API connectivity.
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Run Diagnostics"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* GMAIL INTEGRATION */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Shield className="w-4 h-4 mr-2 text-slate-500" />
            Integrations
          </h3>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center">
              <Mail className="w-6 h-6 text-red-400 mr-4" />
              <div>
                <div className="text-sm text-white font-medium">
                  Google Workspace
                </div>
                <div className="text-xs text-slate-500">
                  Gmail API integration
                </div>
              </div>
            </div>

            {gmailConnected ? (
              <button
                onClick={handleGmailDisconnect}
                disabled={gmailLoading}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold border border-slate-700"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleGmailConnect}
                disabled={gmailLoading}
                className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold"
              >
                Connect Gmail
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
