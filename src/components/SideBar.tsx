import React, { useEffect, useState } from 'react';
import { LayoutDashboard, History, Terminal, Shield, Mail } from 'lucide-react';
import { fetchRules } from '../api/rulesApi';
import type { RulesResponse } from '../types/pipeline';

interface SidebarProps {
    activeTab: 'dashboard' | 'history' | 'query' | 'supplier';
    setActiveTab: (tab: 'dashboard' | 'history' | 'query' | 'supplier') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const [rulesData, setRulesData] = useState<RulesResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRules()
            .then(data => {
                setRulesData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <aside className="w-72 bg-[#0F1322] border-r border-slate-850 p-6 flex flex-col gap-8 h-screen shrink-0 text-slate-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg font-outfit shadow-indigo-500/20 shadow-lg">
                    N
                </div>
                <div>
                    <h2 className="font-bold text-lg tracking-wide leading-tight">Nova</h2>
                    <span className="text-[10px] text-slate-400 tracking-wider uppercase">Logistics Audit</span>
                </div>
            </div>

            <nav className="flex flex-col gap-1.5">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 text-left ${activeTab === 'dashboard'
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border-l-4 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutDashboard size={18} />
                    <span>Audit Desk</span>
                </button>

                <button
                    onClick={() => setActiveTab('supplier')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 text-left ${activeTab === 'supplier'
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border-l-4 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Mail size={18} />
                    <span>Supplier Portal</span>
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 text-left ${activeTab === 'history'
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border-l-4 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <History size={18} />
                    <span>Run Registry</span>
                </button>

                <button
                    onClick={() => setActiveTab('query')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 text-left ${activeTab === 'query'
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border-l-4 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Terminal size={18} />
                    <span>NL Query Assistant</span>
                </button>
            </nav>

            <div className="mt-auto border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 mb-3 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    <Shield size={14} className="text-indigo-400" />
                    <span>Active Audit Rules</span>
                </div>

                {loading ? (
                    <div className="text-[11px] text-slate-500 italic">Loading rules...</div>
                ) : rulesData ? (
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                        {Object.entries(rulesData.rules).map(([field, detail]) => (
                            <div key={field} className="bg-slate-900/50 border border-slate-800/80 rounded p-2 text-[11px] flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-300 capitalize">{field.replace(/_/g, ' ')}</span>
                                <span className="text-slate-500 font-mono text-[9px]">
                                    {detail.type === 'exact_match' && `Exact: "${detail.expected}"`}
                                    {detail.type === 'prefix_match' && `Prefix: [${detail.expected_prefixes?.join(', ')}]`}
                                    {detail.type === 'allow_list' && `Allow list: [${detail.expected?.join(', ')}]`}
                                    {detail.type === 'pattern_match' && `Regex: "${detail.expected_pattern || detail.type}"`}
                                    {detail.type === 'numeric_limit' && `Max: ${detail.expected_max}`}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] text-red-400 italic">Rules failed to load.</div>
                )}
            </div>
        </aside>
    );
};
