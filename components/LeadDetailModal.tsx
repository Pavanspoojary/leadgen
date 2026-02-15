import React, { useState, useEffect } from 'react';
import { Lead, LeadDetails, ServiceError, LeadStatus, FollowUpRecommendation } from '../types';
import { X, Mail, Globe, Zap, Layers, ArrowUpRight, ClipboardCopy, ShieldAlert, CheckCircle2, TrendingUp, Users, Target, Lightbulb, Sparkles, FileText, Hourglass, BarChart, Send, Loader2 } from 'lucide-react';
import { sendEmail } from '../services/gmailService';
import { parseDealSize } from '../services/analyticsService';
import { analyzeFollowUpTiming } from '../services/geminiService';

interface LeadDetailModalProps {
  lead: Lead;
  details: LeadDetails | null;
  isLoading: boolean;
  error?: ServiceError | null;
  onClose: () => void;
  onRegenerateEmail: (tone: 'Soft' | 'Direct' | 'Bold' | 'Analytical' | 'Value-driven') => void;
  onStatusChange?: (id: string, status: LeadStatus) => void;
  gmailConnected?: boolean;
  onEmailSent?: (id: string, threadId: string) => void;
  onUpdateLead?: (lead: Lead) => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, details, isLoading, error, onClose, onRegenerateEmail, onStatusChange, gmailConnected, onEmailSent, onUpdateLead }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'outreach' | 'proposal'>('overview');
  const [tone, setTone] = useState<'Soft' | 'Direct' | 'Bold' | 'Analytical' | 'Value-driven'>('Direct');
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status);
  
  // Email Sequence State
  const [emailStepIndex, setEmailStepIndex] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Timing Optimizer State
  const [timingRec, setTimingRec] = useState<FollowUpRecommendation | null>(null);
  const [isTimingLoading, setIsTimingLoading] = useState(false);

  useEffect(() => {
    if (lead) setCurrentStatus(lead.status);
    setSendSuccess(false);
    setSendError(null);
    setTimingRec(null);
  }, [lead]);

  // Sync details to lead object for Analytics when details load
  useEffect(() => {
    if (details && onUpdateLead) {
        // Check if we need to update the lead with new analytics data
        if (!lead.dealValue || lead.hookType !== details.outreach.hook_type) {
            const dealValue = parseDealSize(details.revenueInsights.dealSizeEstimate);
            onUpdateLead({
                ...lead,
                dealValue,
                hookType: details.outreach.hook_type,
                tone: tone,
                // Note: updating nested market_scan directly inside spread might be tricky if we want deep merge,
                // but here we just want to ensure top-level analytics props are set.
            });
        }
    }
  }, [details, lead.id]);

  // Trigger timing optimization when Outreach tab is active
  useEffect(() => {
      if (activeTab === 'outreach' && details && !timingRec && !isTimingLoading) {
          setIsTimingLoading(true);
          analyzeFollowUpTiming(lead.industry, details.outreach.hook_type)
            .then(res => {
                if (res.status === 'success' && res.data) {
                    setTimingRec(res.data);
                }
            })
            .finally(() => setIsTimingLoading(false));
      }
  }, [activeTab, details, lead.industry, timingRec]);

  const handleToneChange = (newTone: typeof tone) => {
    setTone(newTone);
    onRegenerateEmail(newTone);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleStatusUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    setCurrentStatus(newStatus);
    if (onStatusChange) onStatusChange(lead.id, newStatus);
  };

  const handleSendEmail = async () => {
      if (!details) return;
      setIsSending(true);
      setSendError(null);

      const step = details.outreach.steps[emailStepIndex];
      const result = await sendEmail(lead, step.subject, step.body);

      setIsSending(false);

      if (result.status === 'success' && result.data) {
          setSendSuccess(true);
          setCurrentStatus('Email Sent');
          if (onEmailSent) onEmailSent(lead.id, result.data.threadId);
      } else {
          setSendError(result.error?.message || "Failed to send email");
      }
  };

  const getStatusColor = (status: LeadStatus) => {
      switch(status) {
          case 'New': return 'text-blue-400 bg-blue-900/20 border-blue-800';
          case 'Analyzed': return 'text-purple-400 bg-purple-900/20 border-purple-800';
          case 'Email Sent': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
          case 'Follow-Up Due': return 'text-orange-400 bg-orange-900/20 border-orange-800';
          case 'Replied': return 'text-green-400 bg-green-900/20 border-green-800';
          case 'Closed Won': return 'text-emerald-400 bg-emerald-900/20 border-emerald-800';
          case 'Closed Lost': return 'text-slate-400 bg-slate-800 border-slate-700';
          default: return 'text-slate-400 bg-slate-800';
      }
  };

  if (error) return <ErrorView error={error} onClose={onClose} />;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-850">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-white">{lead.business_name}</h2>
                <div className={`px-3 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide flex items-center ${getStatusColor(currentStatus)}`}>
                    {currentStatus}
                </div>
            </div>
            <div className="flex items-center space-x-3 text-slate-400 text-sm">
              <span className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" />{lead.industry}</span>
              <span>•</span>
              <span className="flex items-center"><Globe className="w-3 h-3 mr-1" />{lead.website_url || "No Website"}</span>
              <span>•</span>
              <span>{lead.location}</span>
              {lead.lastEmailSentAt && (
                  <>
                  <span>•</span>
                  <span className="text-slate-500">Last Sent: {new Date(lead.lastEmailSentAt).toLocaleDateString()}</span>
                  </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="flex flex-col items-end mr-4">
                  <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Pipeline Status</label>
                  <select 
                    value={currentStatus} 
                    onChange={handleStatusUpdate}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                      <option value="New">New Lead</option>
                      <option value="Analyzed">Analyzed</option>
                      <option value="Email Sent">Email Sent</option>
                      <option value="Follow-Up Due">Follow-Up Due</option>
                      <option value="Replied">Replied</option>
                      <option value="Closed Won">Closed Won</option>
                      <option value="Closed Lost">Closed Lost</option>
                  </select>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !details ? (
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                    <div className="absolute inset-0 flex items-center justify-center mb-6">
                        <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white">Revenue Engine Active</h3>
                <div className="text-slate-400 mt-2 space-y-1 text-center text-sm font-mono">
                    <p>Detecting tech stack & analytics...</p>
                    <p>Calculating priority score...</p>
                    <p>Generating 3-step sequence...</p>
                    <p>Drafting proposal...</p>
                </div>
            </div>
        ) : details ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Target className="w-4 h-4" />} label="Overview" />
                    <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Layers className="w-4 h-4" />} label="Audit & Enrich" />
                    <TabButton active={activeTab === 'proposal'} onClick={() => setActiveTab('proposal')} icon={<FileText className="w-4 h-4" />} label="Proposal" />
                    <TabButton active={activeTab === 'outreach'} onClick={() => setActiveTab('outreach')} icon={<Mail className="w-4 h-4" />} label="Sequences" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
                    
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Revenue Intelligence */}
                             <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" /> Revenue Intelligence
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <MetricBox label="Priority Score" value={details.priorityScore} highlight />
                                    <MetricBox label="Est. Deal Size" value={details.revenueInsights.dealSizeEstimate} />
                                    <MetricBox label="Response Prob." value={`${details.revenueInsights.responseProbability}%`} />
                                    <MetricBox label="Urgency" value={`${details.revenueInsights.urgencyScore}/100`} />
                                </div>
                                <div className="p-4 bg-emerald-900/10 border border-emerald-900/30 rounded-lg">
                                    <span className="text-emerald-400 text-xs font-bold uppercase">Consultant Note</span>
                                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">"{lead.notes}"</p>
                                </div>
                             </div>

                             {/* Strategic Summary */}
                             <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                    <Zap className="w-4 h-4 mr-2 text-yellow-500" /> Executive Summary
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                    {details.auditSummary}
                                </p>
                                <div className="space-y-3">
                                    {details.strategicRecommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start">
                                            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                                            <span className="text-sm text-slate-300">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}

                    {/* TAB 2: AUDIT & ENRICHMENT */}
                    {activeTab === 'audit' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tech Audit */}
                            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Digital Forensic Audit</h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-400">Maturity Level</span>
                                            <span className="text-white font-medium">{details.digitalMaturity.level}</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${details.digitalMaturity.score}%` }}></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start p-3 bg-red-900/10 border border-red-900/30 rounded-lg">
                                        <Zap className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <div>
                                            <span className="text-red-400 text-xs font-bold uppercase">Critical Gap</span>
                                            <p className="text-slate-300 text-sm">{details.digitalMaturity.biggestGap}</p>
                                        </div>
                                    </div>

                                    {/* Enrichment Data */}
                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Enrichment Data</h4>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                            <div>
                                                <span className="text-slate-500 block text-xs">CMS</span>
                                                <span className="text-white">{details.enrichment.cms}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs">Analytics</span>
                                                <span className="text-white">{details.enrichment.analytics.join(', ') || 'None Detected'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs">SSL Secure</span>
                                                <span className={details.enrichment.ssl ? "text-green-400" : "text-red-400"}>{details.enrichment.ssl ? "Yes" : "No"}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs">Page Speed</span>
                                                <span className="text-white">{details.enrichment.pageSpeedObservation}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Competitor Benchmarking */}
                            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                                    <Users className="w-4 h-4 mr-2" /> Competitive Landscape
                                </h3>
                                <div className="space-y-4">
                                    {details.competitors.map((comp, idx) => (
                                        <div key={idx} className="border border-slate-700 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-white text-sm">{comp.name}</span>
                                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Rival</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <span className="text-green-400 block mb-0.5">Their Advantage</span>
                                                    <span className="text-slate-400">{comp.advantage}</span>
                                                </div>
                                                <div>
                                                    <span className="text-red-400 block mb-0.5">Their Weakness</span>
                                                    <span className="text-slate-400">{comp.vulnerability}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PROPOSAL */}
                    {activeTab === 'proposal' && (
                        <div className="bg-slate-50 h-full rounded-xl text-slate-900 p-8 overflow-y-auto font-serif">
                            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Strategic Proposal</h1>
                                    <p className="text-slate-500">Prepared for {lead.business_name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-900">DATE</div>
                                    <div className="text-slate-500">{new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="space-y-8 max-w-3xl mx-auto">
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Problem Statement</h3>
                                    <p className="text-lg leading-relaxed">{details.proposal.problemSummary}</p>
                                </section>

                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Proposed Solution</h3>
                                    <p className="text-slate-700 leading-relaxed">{details.proposal.solution}</p>
                                </section>

                                <div className="grid grid-cols-2 gap-8">
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Scope of Work</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                            {details.proposal.scopeOfWork.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Timeline & Investment</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                                <span className="font-bold">Estimated Timeline</span>
                                                <span>{details.proposal.timeline}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                                <span className="font-bold">Investment Range</span>
                                                <span>{details.proposal.pricingRange}</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2 font-sans flex items-center">
                                        <BarChart className="w-4 h-4 mr-2" /> ROI Projection
                                    </h3>
                                    <p className="text-blue-900 leading-relaxed font-medium">{details.proposal.roiReasoning}</p>
                                </section>

                                <div className="pt-8 text-center">
                                    <button onClick={() => copyToClipboard(JSON.stringify(details.proposal, null, 2))} className="px-6 py-3 bg-slate-900 text-white font-sans font-bold rounded-lg hover:bg-slate-800 transition-colors">
                                        Copy Proposal Text
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: OUTREACH SEQUENCE */}
                    {activeTab === 'outreach' && (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                                    {details.outreach.steps.map((step, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setEmailStepIndex(index)}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                                emailStepIndex === index 
                                                ? 'bg-blue-600 text-white shadow-lg' 
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`}
                                        >
                                            Step {step.step}: {step.type}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg">
                                     {['Direct', 'Soft', 'Bold', 'Analytical'].map((t) => (
                                         <button 
                                            key={t}
                                            onClick={() => handleToneChange(t as any)}
                                            className={`text-[10px] px-3 py-1.5 rounded-md transition-all font-medium ${tone === t ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                         >
                                            {t}
                                         </button>
                                     ))}
                                </div>
                            </div>

                            {/* Hook Insight Banner (Only for step 1) */}
                            {emailStepIndex === 0 && (
                                <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-4 mb-4 flex items-start">
                                    <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                                        <Lightbulb className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Psychological Strategy:</span>
                                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-medium">{details.outreach.hook_type}</span>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed italic opacity-80">{details.outreach.angle}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-slate-500 uppercase flex justify-between">
                                        <span>Subject Line</span>
                                        <span className="text-[10px] text-emerald-500 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Optimized for Open Rate</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={details.outreach.steps[emailStepIndex].subject}
                                        readOnly
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none font-medium" 
                                    />
                                </div>
                                <div className="space-y-1 flex-1 flex flex-col">
                                    <label className="text-xs font-mono text-slate-500 uppercase">Message Body</label>
                                    <textarea 
                                        value={details.outreach.steps[emailStepIndex].body}
                                        readOnly
                                        className="w-full flex-1 bg-slate-950 border border-slate-800 rounded p-4 text-sm text-slate-300 leading-relaxed focus:ring-1 focus:ring-blue-500 outline-none resize-none font-sans"
                                    />
                                </div>
                                
                                {sendSuccess && (
                                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-center animate-in fade-in">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Email successfully scheduled via Gmail!
                                    </div>
                                )}
                                {sendError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center animate-in fade-in">
                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                        {sendError}
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 pt-2">
                                    <button onClick={() => copyToClipboard(details.outreach.steps[emailStepIndex].body)} className="flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors border border-slate-700">
                                        <ClipboardCopy className="w-3 h-3 mr-1.5" /> Copy Text
                                    </button>
                                    
                                    {gmailConnected ? (
                                        <button 
                                            onClick={handleSendEmail} 
                                            disabled={isSending || sendSuccess}
                                            className={`flex items-center px-4 py-2 rounded text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/20 ${isSending || sendSuccess ? 'bg-blue-800 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-500'}`}
                                        >
                                            {isSending ? (
                                                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Sending...</>
                                            ) : sendSuccess ? (
                                                <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Sent</>
                                            ) : (
                                                <><Send className="w-3 h-3 mr-1.5" /> Send with Gmail</>
                                            )}
                                        </button>
                                    ) : (
                                        <button onClick={() => window.open(`mailto:${lead.email}?subject=${encodeURIComponent(details.outreach.steps[emailStepIndex].subject)}&body=${encodeURIComponent(details.outreach.steps[emailStepIndex].body)}`)} className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors border border-slate-600">
                                            <ArrowUpRight className="w-3 h-3 mr-1.5" /> Open in Mail App
                                        </button>
                                    )}
                                </div>
                                {!gmailConnected && (
                                    <div className="text-[10px] text-center text-slate-500 mt-2">
                                        Connect Gmail in dashboard to send directly.
                                    </div>
                                )}
                            </div>

                            {/* Timing Optimizer Card */}
                            <div className="mt-4 bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                                        <Hourglass className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">AI Timing Optimizer</h4>
                                        <p className="text-xs text-slate-400">Analysis based on industry & hook performance.</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {isTimingLoading ? (
                                        <div className="text-xs text-slate-500 flex items-center">
                                            <Loader2 className="w-3 h-3 animate-spin mr-1" /> Calculating...
                                        </div>
                                    ) : timingRec ? (
                                        <>
                                            <div className="text-emerald-400 font-bold text-sm">
                                                {timingRec.recommendedDay} @ {timingRec.recommendedTime}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {timingRec.confidenceScore}% Confidence
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-slate-600">No prediction available</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        ) : null}
      </div>
    </div>
  );
};

// Sub-components
const TabButton = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            active 
            ? 'border-blue-500 text-white bg-slate-800/50' 
            : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
        }`}
    >
        <span className={`mr-2 ${active ? 'text-blue-400' : 'text-slate-500'}`}>{icon}</span>
        {label}
    </button>
);

const MetricBox = ({ label, value, highlight }: any) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-blue-900/10 border-blue-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">{label}</span>
        <span className={`font-mono font-bold ${highlight ? 'text-blue-400 text-lg' : 'text-white'}`}>{value}</span>
    </div>
);

const ErrorView = ({ error, onClose }: { error: ServiceError, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 p-8 rounded-xl border border-red-900/50 max-w-md w-full text-center shadow-2xl">
        <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Analysis Interrupted</h3>
        <p className="text-slate-400 mb-6">{error.message}</p>
        <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">Close</button>
      </div>
    </div>
);

export default LeadDetailModal;