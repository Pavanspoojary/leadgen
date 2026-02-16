import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertCircle, RefreshCw, Server, Lock, Mail, LogOut, ExternalLink } from 'lucide-react';
import { getProviderStatus, validateConnection } from '../services/aiProvider';
import { checkGmailStatus, connectGmail, disconnectGmail } from '../services/gmailService';
import { AiProviderStatus } from '../types';

const SettingsView: React.FC = () => {
  const [status, setStatus] = useState<AiProviderStatus>('not_configured');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);

  // ✅ AUTO VALIDATE ON LOAD
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await validateConnection();
      setStatus(getProviderStatus());
      setLoading(false);

      const gmail = await checkGmailStatus();
      setGmailConnected(gmail);
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
    window.location.reload();
  };

  const getStatusColor = (s: AiProviderStatus) => {
    switch (s) {
      case 'connected':
        return 'text-emerald-400 bg-emerald-900/20 border-emerald-900/50';
      case 'rate_limit':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-900/50';
      case 'quota_exceeded':
      case 'invalid_key':
        return 'text-red-400 bg-red-900/20 border-red-900/50';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusMessage = (s: AiProviderStatus) => {
    switch (s) {
      case 'connected':
        return 'System Operational';
      case 'rate_limit':
        return 'Rate Limit Hit - Cooling Down';
      case 'quota_exceeded':
        return 'Quota Exceeded - Check Billing';
      case 'invalid_key':
        return 'Invalid API Key';
      case 'not_configured':
        return 'API Key Not Found';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center">
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 mr-4">
          <Lock className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">System Configuration</h2>
          <p className="text-slate-400 text-sm">Private SaaS Environment</p>
        </div>
      </div>

      {/* AI Provider Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Server className="w-4 h-4 mr-2 text-slate-500" /> AI Provider Status
          </h3>
        </div>

        <div className="p-6 space-y-6">
          <div className={`p-4 rounded-lg border flex items-center justify-between ${getStatusColor(status)}`}>
            <div className="flex items-center">
              {status === 'connected'
                ? <CheckCircle2 className="w-5 h-5 mr-3" />
                : <AlertCircle className="w-5 h-5 mr-3" />}
              <span className="font-bold">{getStatusMessage(status)}</span>
            </div>
            <div className="text-xs opacity-75 font-mono">Gemini-3-Flash</div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <div className="text-sm text-white font-medium mb-1">Connection Test</div>
              <div className="text-xs text-slate-500">
                Validate API latency and key permissions.
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              {loading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : 'Run Diagnostics'}
            </button>
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Shield className="w-4 h-4 mr-2 text-slate-500" /> Integrations
          </h3>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-4 ${gmailConnected ? 'bg-red-500/10' : 'bg-slate-800'}`}>
                <Mail className={`w-6 h-6 ${gmailConnected ? 'text-red-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <div className="flex items-center">
                  <div className="text-sm text-white font-medium mb-1 mr-2">
                    Google Workspace
                  </div>
                  {gmailConnected ? (
                    <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-900/50 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-700">
                      Disconnected
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Enable direct email sending via Gmail API.
                </div>
              </div>
            </div>

            {gmailConnected ? (
              <button
                onClick={handleGmailDisconnect}
                disabled={gmailLoading}
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold border border-slate-700"
              >
                {gmailLoading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <><LogOut className="w-4 h-4 mr-2" /> Disconnect</>}
              </button>
            ) : (
              <button
                onClick={handleGmailConnect}
                disabled={gmailLoading}
                className="flex items-center px-4 py-2 bg-white text-slate-900 hover:bg-slate-200 rounded-lg text-sm font-bold"
              >
                {gmailLoading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <><ExternalLink className="w-4 h-4 mr-2" /> Connect Gmail</>}
              </button>
            )}
          </div>

          {gmailConnected && (
            <div className="mt-4 p-4 bg-emerald-900/10 rounded-lg border border-emerald-900/30 text-xs text-emerald-300">
              <p>
                <strong>Status:</strong> OAuth Token Active. You can now send emails directly from the dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
