import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, Zap, TrendingUp, ShieldAlert } from 'lucide-react';
import type { AnalyticsResponse } from '../types/pipeline';

interface AnalyticsCardsProps {
    stats: AnalyticsResponse | null;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ stats }) => {
    const totalRuns = stats?.total_runs ?? 0;
    const autoApproved = stats?.decisions?.auto_approve ?? 0;
    const flagReview = stats?.decisions?.flag_review ?? 0;
    const amendments = stats?.decisions?.amendment_request ?? 0;
    const totalFlagged = flagReview + amendments;

    const autoApproveRate = stats?.kpis?.auto_approve_rate ?? (
        totalRuns > 0 ? Math.round((autoApproved / totalRuns) * 100) : 0
    );
    const cacheHitRate = stats?.cache?.hit_rate ?? stats?.kpis?.cache_hit_rate ?? 0;
    const topMismatches = stats?.top_mismatch_fields ?? [];

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Top 4 KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {/* 1. Total Audits */}
                <div className="bg-[#1E293B]/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Audited</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <FileText size={16} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <h3 className="text-2xl font-bold text-white tracking-tight font-outfit">{totalRuns}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                                {stats?.sources?.inbox ?? 0} mail
                            </span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {stats?.sources?.manual_upload ?? totalRuns} upload
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Auto-Approved Rate */}
                <div className="bg-[#1E293B]/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">STP Auto-Pass</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <h3 className="text-2xl font-bold text-white tracking-tight font-outfit">{autoApproved}</h3>
                            <span className="text-xs font-semibold text-emerald-400 font-mono">({autoApproveRate}%)</span>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 flex items-center gap-0.5 font-medium">
                            <TrendingUp size={11} /> Straight-thru
                        </span>
                    </div>
                </div>

                {/* 3. Flagged & Discrepancies */}
                <div className="bg-[#1E293B]/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review / Action</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <h3 className="text-2xl font-bold text-white tracking-tight font-outfit">{totalFlagged}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                {flagReview} flag
                            </span>
                            <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                {amendments} amend
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Cache & LLM Cost Efficiency */}
                <div className="bg-[#1E293B]/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fast-Path Cache</span>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                            <Zap size={16} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <h3 className="text-2xl font-bold text-white tracking-tight font-outfit">{stats?.cache?.hits ?? 0}</h3>
                            <span className="text-xs font-semibold text-cyan-400 font-mono">({cacheHitRate}%)</span>
                        </div>
                        <span className="text-[10px] text-cyan-300/80 font-mono">
                            Zero-token hits
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Compliance Mismatches Bar (if any detected) */}
            {topMismatches.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-lg px-3.5 py-2 flex items-center gap-3 text-xs overflow-x-auto">
                    <div className="flex items-center gap-1.5 text-slate-400 shrink-0 font-medium text-[11px]">
                        <ShieldAlert size={13} className="text-amber-400" />
                        <span>Common Flags:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {topMismatches.map((item, idx) => (
                            <span
                                key={idx}
                                className="bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                                <span className="text-amber-400 font-semibold">{item.field}</span>
                                <span className="text-slate-500">×{item.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
