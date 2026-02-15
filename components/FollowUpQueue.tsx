import React, { useEffect, useState } from 'react';
import { fetchFollowUpQueue, generateReminder } from '../services/databaseService';
import { Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const FollowUpQueue: React.FC = () => {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadQueue = async () => {
        setLoading(true);
        const data = await fetchFollowUpQueue();
        setQueue(data);
        setLoading(false);
    };

    useEffect(() => {
        loadQueue();
    }, []);

    const handleGenerate = async (id: string, stage: number) => {
        await generateReminder(id, stage);
        loadQueue(); // Refresh
    };

    if (loading) return <div className="text-center p-8 text-slate-500">Loading Queue...</div>;

    return (
        <div className="animate-in fade-in">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-orange-400" /> Follow-Up Queue
                </h2>
                <div className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400">
                    {queue.length} Pending Actions
                </div>
            </div>

            {queue.length === 0 ? (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-white">All Caught Up</h3>
                    <p className="text-slate-500">No pending follow-ups required at this time.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {queue.map((item) => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-orange-500/30 transition-all">
                            <div>
                                <h3 className="font-bold text-white">{item.leads?.business_name}</h3>
                                <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <span className="mr-3">Stage {item.follow_up_stage}/3</span>
                                    <span>Due: {new Date(item.next_follow_up_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button 
                                    onClick={() => handleGenerate(item.id, item.follow_up_stage)}
                                    className="flex items-center px-4 py-2 bg-orange-600/10 text-orange-400 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-orange-600/20"
                                >
                                    Generate Reminder <ArrowRight className="w-3 h-3 ml-2" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FollowUpQueue;
