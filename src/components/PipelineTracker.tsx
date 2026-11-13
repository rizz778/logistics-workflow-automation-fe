import React, { useEffect, useRef } from 'react';
import { FileUp, Eye, ShieldCheck, GitBranch } from 'lucide-react';

interface PipelineTrackerProps {
    step: 'idle' | 'uploading' | 'extracting' | 'validating' | 'routing' | 'done';
    logs: string[];
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({ step, logs }) => {
    const consoleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);


    const stepsList = [
        { key: 'uploading', label: 'File Upload', icon: FileUp },
        { key: 'extracting', label: 'Gemini Extract', icon: Eye },
        { key: 'validating', label: 'Rule Validate', icon: ShieldCheck },
        { key: 'routing', label: 'Gemini Route', icon: GitBranch },
    ];

    const getStepStatus = (itemKey: string) => {
        const keys = ['uploading', 'extracting', 'validating', 'routing', 'done'];
        const currentIndex = keys.indexOf(step);
        const itemIndex = keys.indexOf(itemKey);

        if (currentIndex > itemIndex) return 'completed';
        if (currentIndex === itemIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-6">
            <h2 className="font-outfit text-lg font-semibold text-white">Audit Pipeline Tracker</h2>

            {/* Stepper Visualizer */}
            <div className="flex justify-between items-center relative px-4 mt-2">
                <div className="absolute top-4 left-6 right-6 h-[2px] bg-slate-800 z-0"></div>
                {stepsList.map(item => {
                    const status = getStepStatus(item.key);
                    const Icon = item.icon;

                    return (
                        <div key={item.key} className="flex flex-col items-center gap-2 z-10 w-20">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${status === 'completed'
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : status === 'active'
                                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/40 animate-pulse'
                                        : 'bg-[#1E293B] border-slate-800 text-slate-500'
                                    }`}
                            >
                                <Icon size={16} />
                            </div>
                            <span
                                className={`text-[10px] font-semibold text-center whitespace-nowrap transition-colors duration-300 ${status === 'completed'
                                    ? 'text-emerald-400'
                                    : status === 'active'
                                        ? 'text-white'
                                        : 'text-slate-500'
                                    }`}
                            >
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Real-time Log Console */}
            <div ref={consoleRef} className="bg-[#080A10] border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-450 h-44 overflow-y-auto flex flex-col gap-1.5 shadow-inner">
                {logs.map((log, idx) => {
                    let typeColor = 'text-slate-400';
                    if (log.toLowerCase().includes('success') || log.toLowerCase().includes('completed') || log.toLowerCase().includes('saved')) {
                        typeColor = 'text-emerald-450';
                    } else if (log.toLowerCase().includes('failed') || log.toLowerCase().includes('warning') || log.toLowerCase().includes('error')) {
                        typeColor = 'text-red-400';
                    }

                    return (
                        <div key={idx} className={`leading-relaxed ${typeColor}`}>
                            {log}
                        </div>
                    );
                })}
                {step !== 'idle' && step !== 'done' && (
                    <div className="text-indigo-400 flex items-center gap-1.5 animate-pulse mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                        <span>Agent processing...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
