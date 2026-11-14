import React, { useState, useEffect, useRef } from 'react';
import { UploadZone } from '../components/UploadZone';
import { PipelineTracker } from '../components/PipelineTracker';
import { ReviewPanel } from '../components/ReviewPanel';
import type { PipelineRun } from '../types/pipeline';
import { uploadDocuments } from '../api/uploadApi';
import { fetchIncomingEmails, fetchProcessedEmails } from '../api/triggerApi';
import { createRunEventSource, fetchRunStatus } from '../api/statusApi';
import { Mail, Upload, Clock, RefreshCw, Inbox } from 'lucide-react';

interface AuditDeskProps {
    activeRun: PipelineRun | null;
    setActiveRun: (run: PipelineRun | null) => void;
    onRunCompleted: () => void;
}

export const AuditDesk: React.FC<AuditDeskProps> = ({ activeRun, setActiveRun, onRunCompleted }) => {
    const [step, setStep] = useState<'idle' | 'uploading' | 'extracting' | 'validating' | 'routing' | 'done'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    // New email queue states
    const [mode, setMode] = useState<'inbox' | 'upload'>('inbox');
    const [inboxTab, setInboxTab] = useState<'incoming' | 'processed'>('incoming');
    const [incomingQueue, setIncomingQueue] = useState<PipelineRun[]>([]);
    const [processedQueue, setProcessedQueue] = useState<PipelineRun[]>([]);
    const [loadingQueue, setLoadingQueue] = useState(false);

    const loadQueues = async () => {
        setLoadingQueue(true);
        try {
            const [incoming, processed] = await Promise.all([
                fetchIncomingEmails(),
                fetchProcessedEmails()
            ]);
            setIncomingQueue(incoming);
            setProcessedQueue(processed);
        } catch (err) {
            console.error('Failed to load email queues:', err);
        } finally {
            setLoadingQueue(false);
        }
    };

    // Load queues on mount and poll every 8 seconds
    useEffect(() => {
        loadQueues();
        const interval = setInterval(() => {
            loadQueues();
        }, 8000);
        return () => {
            clearInterval(interval);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleRunUpdated = () => {
        loadQueues();
        onRunCompleted();
    };

    const handleUploadStart = async (files: File[]) => {
        setLoading(true);
        setActiveRun(null);
        setStep('uploading');
        const fileNames = files.map(f => f.name).join(', ');
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        setLogs([
            'Client Node: Requesting S3 presigned PUT URL from API Gateway...',
            `Client Node: Streaming ${files.length} file(s) [${fileNames}] (${(totalSize / 1024).toFixed(1)} KB) directly to S3 storage...`
        ]);

        try {
            const uploadResult = await uploadDocuments(files);
            const runId = uploadResult.id;
            const shipmentId = uploadResult.shipment_id || String(runId);

            // Fast-path cache hit: skip SSE listener and render completed results instantly
            if (uploadResult.is_cached) {
                setLogs(prev => [
                    ...prev,
                    `⚡ Fast-Path Cache HIT: Instant compliance outcome retrieved for ${fileNames}.`,
                    `Bypassed S3 upload and multi-agent queue (0 Gemini tokens consumed).`,
                    `Decision: ${uploadResult.decision.toUpperCase()} - Reason: ${uploadResult.decision_reason}`
                ]);
                setStep('done');
                setLoading(false);
                setActiveRun(uploadResult);
                onRunCompleted();
                return;
            }

            setLogs(prev => [
                ...prev,
                `Storage: Bytes uploaded directly to S3 bucket. Shipment ${shipmentId} (Run #${runId}) queued for agent worker.`,
                `SSE: Subscribing to live execution pipeline (/pipeline/runs/${shipmentId}/events)...`
            ]);

            // Close existing event stream if any
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const es = createRunEventSource(
                shipmentId,
                async (event) => {
                    const stepName = (event.step || '').toLowerCase();
                    const statusName = (event.status || '').toLowerCase();

                    if (stepName === 'extract' || stepName === 'extracting') {
                        setStep('extracting');
                    } else if (stepName === 'validate' || stepName === 'validating') {
                        setStep('validating');
                    } else if (stepName === 'route' || stepName === 'routing') {
                        setStep('routing');
                    } else if (stepName === 'completed' || stepName === 'done' || statusName === 'completed') {
                        setStep('done');
                        setLoading(false);
                        es.close();
                        try {
                            const updated = await fetchRunStatus(runId);
                            setActiveRun(updated);
                        } catch {
                            setActiveRun(uploadResult);
                        }
                        onRunCompleted();
                    } else if (stepName === 'human_approval' || stepName === 'human_correction' || statusName === 'paused') {
                        setStep('done');
                        setLoading(false);
                        es.close();
                        try {
                            const updated = await fetchRunStatus(runId);
                            setActiveRun(updated);
                        } catch {
                            setActiveRun(uploadResult);
                        }
                        onRunCompleted();
                    } else if (stepName === 'dlq_exhausted' || stepName === 'error') {
                        setStep('idle');
                        setLoading(false);
                        es.close();
                    }

                    if (event.message) {
                        setLogs(prev => [...prev, event.message]);
                    }
                },
                (err) => {
                    console.debug('SSE event stream closed/disconnected:', err);
                }
            );

            eventSourceRef.current = es;

        } catch (err: any) {
            setStep('idle');
            setLoading(false);
            setLogs(prev => [...prev, `Pipeline Error: ${err.message || 'Audit execution failed.'}`]);
        }
    };

    const getDecisionBadgeClass = (decision: string) => {
        switch (decision) {
            case 'auto_approve':
                return 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20';
            case 'flag_review':
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            case 'amendment_request':
                return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            default:
                return 'bg-slate-800 text-slate-400';
        }
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return isoString;
        }
    };

    const displayedRuns = inboxTab === 'incoming' ? incomingQueue : processedQueue;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start w-full">
            <div className="flex flex-col gap-5 w-full">
                
                {/* Segmented Controller Mode Toggle */}
                <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-1 flex">
                    <button
                        onClick={() => setMode('inbox')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                            mode === 'inbox'
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Mail size={14} />
                        <span>Supplier Mail Queue</span>
                        {incomingQueue.length > 0 && (
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                        )}
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                            mode === 'upload'
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Upload size={14} />
                        <span>Manual Upload</span>
                    </button>
                </div>

                {mode === 'upload' ? (
                    <div className="flex flex-col gap-6 w-full animate-fadeIn">
                        <UploadZone onUploadStart={handleUploadStart} disabled={loading} />
                        {(step !== 'idle' || logs.length > 0) && (
                            <PipelineTracker step={step} logs={logs} />
                        )}
                    </div>
                ) : (
                    /* Supplier Mail Queue list view */
                    <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4 w-full animate-fadeIn">
                        
                        <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => setInboxTab('incoming')}
                                    className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 cursor-pointer transition-all ${
                                        inboxTab === 'incoming'
                                            ? 'text-white border-indigo-500'
                                            : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                                >
                                    Incoming ({incomingQueue.length})
                                </button>
                                <button
                                    onClick={() => setInboxTab('processed')}
                                    className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 cursor-pointer transition-all ${
                                        inboxTab === 'processed'
                                            ? 'text-white border-indigo-500'
                                            : 'text-slate-400 border-transparent hover:text-white'
                                    }`}
                                >
                                    Processed ({processedQueue.length})
                                </button>
                            </div>
                            
                            <button
                                onClick={loadQueues}
                                className={`text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 bg-[#0B0F19]/40 cursor-pointer transition-all ${
                                    loadingQueue ? 'animate-spin text-indigo-400' : ''
                                }`}
                                title="Refresh queues"
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>

                        {/* List items */}
                        <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {displayedRuns.length === 0 ? (
                                <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-slate-500 gap-3 border border-dashed border-slate-800/60 rounded-lg">
                                    <Inbox size={36} className="stroke-1 text-slate-600" />
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-400">Queue is empty</p>
                                        <p className="text-[10px] mt-0.5 text-slate-500">No emails currently in this bucket.</p>
                                    </div>
                                </div>
                            ) : (
                                displayedRuns.map((run) => {
                                    const isSelected = activeRun?.id === run.id;
                                    const filenameList = run.filenames && run.filenames.length > 0
                                        ? run.filenames
                                        : (run.filename ? run.filename.split(',').map(s => s.trim()).filter(Boolean) : []);
                                    
                                    return (
                                        <div
                                            key={run.id}
                                            onClick={() => setActiveRun(run)}
                                            className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 flex flex-col gap-2 bg-[#0B0F19]/40 ${
                                                isSelected
                                                    ? 'border-indigo-500/80 bg-indigo-500/5 shadow-[0_0_10px_rgba(99,102,241,0.05)]'
                                                    : 'border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/10'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">
                                                        {run.email_sender || 'unknown@supplier.com'}
                                                    </span>
                                                    <span className="text-xs font-semibold text-white truncate font-outfit">
                                                        {run.email_subject || (run as any).email_metadata_json?.subject || 'No Subject'}
                                                    </span>
                                                </div>
                                                {run.status === 'processing' || run.status === 'pending_upload' ? (
                                                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                                                        <span>Processing</span>
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${getDecisionBadgeClass(run.decision)}`}>
                                                        {(run.decision || 'pending').replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed bg-[#000]/10 p-1.5 rounded border border-slate-850">
                                                {run.email_body || (run as any).email_metadata_json?.body || '(No message body)'}
                                            </p>

                                            <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1 border-t border-slate-850">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    <span>{run.received_at ? formatTime(run.received_at) : formatTime(run.upload_time)}</span>
                                                </span>
                                                <span className="font-medium font-mono text-[9px] text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                                    {filenameList.length} attachment{filenameList.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                {mode === 'inbox' && activeRun && (
                    <div className="animate-fadeIn">
                        <PipelineTracker step="done" logs={activeRun.logs || ['Orchestrator: No logs available.']} />
                    </div>
                )}
            </div>
            
            {/* Right details review column */}
            <div className="w-full">
                <ReviewPanel run={activeRun} onRunUpdated={handleRunUpdated} />
            </div>
        </div>
    );
};

