import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Info, Database, Mail, Save, CheckCircle, Send, AlertTriangle } from 'lucide-react';
import type { PipelineRun } from '../types/pipeline';
import { updateStatus } from '../api/statusApi';
import { resolveProcessedEmail } from '../api/triggerApi';

interface ReviewPanelProps {
    run: PipelineRun | null;
    onRunUpdated: () => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ run, onRunUpdated }) => {
    const runId = run ? (run.id || (run as any).run_id) : 0;
    const status = run ? (run.status || 'pending_review') : 'pending_review';

    // State definitions
    const [activeDoc, setActiveDoc] = useState<string>('');
    const [fields, setFields] = useState<Record<string, Record<string, string>>>({});
    const [emailBody, setEmailBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Memoize multi-document detection
    const isMultiDoc = React.useMemo(() => {
        if (!run || !run.extracted_data) return false;
        const firstVal = Object.values(run.extracted_data)[0];
        return firstVal && typeof firstVal === 'object' && !('value' in firstVal);
    }, [run]);

    useEffect(() => {
        if (run) {
            const newFields: Record<string, Record<string, string>> = {};
            if (isMultiDoc) {
                const currentData = run.edited_data || run.extracted_data;
                Object.entries(currentData).forEach(([docName, docData]) => {
                    if (docData && typeof docData === 'object') {
                        const docFields: Record<string, string> = {};
                        Object.entries(docData).forEach(([key, info]) => {
                            if (key !== 'extraction_warnings' && info && typeof info === 'object' && 'value' in info) {
                                docFields[key] = info.value !== null && info.value !== undefined ? String(info.value) : '';
                            }
                        });
                        newFields[docName] = docFields;
                    }
                });

                const docs = Object.keys(run.extracted_data);
                if (docs.length > 0 && (!activeDoc || !docs.includes(activeDoc))) {
                    setActiveDoc(docs[0]);
                }
            } else {
                const docFields: Record<string, string> = {};
                const activeData = run.edited_data || run.extracted_data;
                Object.entries(activeData).forEach(([key, info]) => {
                    if (key !== 'extraction_warnings' && info && typeof info === 'object' && 'value' in info) {
                        docFields[key] = info.value !== null && info.value !== undefined ? String(info.value) : '';
                    }
                });
                newFields['single'] = docFields;
            }
            setFields(newFields);
            setEmailBody(run.amendment_draft || '');
            setMessage(null);
        }
    }, [run, isMultiDoc]);

    if (!run) {
        return (
            <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md h-[480px] flex flex-col items-center justify-center text-center text-slate-400 gap-4">
                <ClipboardCheck size={64} className="stroke-1 text-slate-500" />
                <h3 className="font-outfit text-lg font-semibold text-white">Audit Output Desk</h3>
                <p className="text-xs max-w-sm">
                    Upload a trade document or select an audit run from the Registry logs to inspect discrepancies.
                </p>
            </div>
        );
    }

    const handleFieldChange = (key: string, value: string) => {
        const docKey = isMultiDoc ? activeDoc : 'single';
        setFields(prev => ({
            ...prev,
            [docKey]: {
                ...(prev[docKey] || {}),
                [key]: value
            }
        }));
    };

    const buildEditedDataPayload = (): any => {
        const originalData = run.edited_data || run.extracted_data;
        if (isMultiDoc) {
            const payload: Record<string, any> = {};
            Object.entries(originalData).forEach(([docName, docData]) => {
                const docPayload: Record<string, any> = {};
                const docFields = fields[docName] || {};
                Object.entries(docData).forEach(([key, valInfo]) => {
                    if (key !== 'extraction_warnings') {
                        docPayload[key] = {
                            value: docFields[key] !== undefined ? docFields[key] : (valInfo as any)?.value,
                            confidence: (valInfo as any)?.confidence ?? 1.0,
                            source_snippet: (valInfo as any)?.source_snippet ?? null
                        };
                    }
                });
                payload[docName] = docPayload;
            });
            return payload;
        } else {
            const payload: Record<string, any> = {};
            const singleFields = fields['single'] || {};
            Object.entries(originalData).forEach(([key, valInfo]) => {
                if (key !== 'extraction_warnings') {
                    payload[key] = {
                        value: singleFields[key] !== undefined ? singleFields[key] : (valInfo as any)?.value,
                        confidence: (valInfo as any)?.confidence ?? 1.0,
                        source_snippet: (valInfo as any)?.source_snippet ?? null
                    };
                }
            });
            return payload;
        }
    };

    const handleSaveEdits = async () => {
        setSubmitting(true);
        setMessage(null);
        try {
            const editedPayload = buildEditedDataPayload();
            if (run.source === 'inbox') {
                await resolveProcessedEmail(runId, status, editedPayload, emailBody || undefined);
            } else {
                await updateStatus(runId, {
                    status: status,
                    edited_data: editedPayload,
                    amendment_draft: emailBody || null
                });
            }
            setMessage({ type: 'success', text: 'Revisions saved successfully.' });
            onRunUpdated();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveRun = async () => {
        setSubmitting(true);
        setMessage(null);
        try {
            const editedPayload = buildEditedDataPayload();
            if (run.source === 'inbox') {
                await resolveProcessedEmail(runId, 'approved', editedPayload, emailBody || undefined);
            } else {
                await updateStatus(runId, {
                    status: 'approved',
                    edited_data: editedPayload,
                    amendment_draft: emailBody || null
                });
            }
            setMessage({ type: 'success', text: 'Document successfully approved and verified.' });
            onRunUpdated();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to approve run.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendAmendment = async () => {
        setSubmitting(true);
        setMessage(null);
        try {
            const editedPayload = buildEditedDataPayload();
            if (run.source === 'inbox') {
                await resolveProcessedEmail(runId, 'amended', editedPayload, emailBody);
            } else {
                await updateStatus(runId, {
                    status: 'amended',
                    edited_data: editedPayload,
                    amendment_draft: emailBody
                });
            }
            setMessage({ type: 'success', text: 'Amendment status updated. Email request dispatched (mocked).' });
            onRunUpdated();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to send amendment.' });
        } finally {
            setSubmitting(false);
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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20';
            case 'pending_review':
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            case 'amended':
                return 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
            default:
                return 'bg-slate-800 text-slate-400';
        }
    };

    const getValidationPillClass = (result: string) => {
        switch (result) {
            case 'match':
                return 'bg-emerald-500/10 text-emerald-450';
            case 'mismatch':
                return 'bg-rose-500/10 text-rose-450';
            case 'uncertain':
                return 'bg-amber-500/10 text-amber-400';
            default:
                return 'bg-slate-800 text-slate-400';
        }
    };

    const getConfidenceDotClass = (score: number) => {
        if (score >= 0.9) return 'bg-emerald-500 shadow-[0_0_6px_#10B981]';
        if (score >= 0.7) return 'bg-amber-500 shadow-[0_0_6px_#F59E0B]';
        return 'bg-rose-500 shadow-[0_0_6px_#EF4444]';
    };

    const formatLabel = (key: string) => {
        return key.replace(/_/g, ' ');
    };

    const docKey = isMultiDoc ? activeDoc : 'single';
    const activeDocFields = fields[docKey] || {};

    // Always show draft mail if there are discrepancies or if the decision is not auto-approved
    const showDraftEmail = run.decision !== 'auto_approve' || run.amendment_draft;

    return (
        <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md text-slate-100 flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-slate-800 pb-5">
                <div className="min-w-0 flex-1 pr-4">
                    <h2 className="font-outfit text-xl font-bold tracking-tight text-white mb-0.5 truncate" title={run.filename}>
                        {run.filename}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono" id="review-run-id">Run ID: #{runId}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getDecisionBadgeClass(run.decision)}`}>
                        {run.decision.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(status)}`}>
                        {status.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium border ${message.type === 'success'
                    ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/5 text-rose-455 border-rose-500/20'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Explanation card */}
            <div className="bg-indigo-500/3 border border-indigo-500/10 rounded-lg p-4 leading-relaxed text-sm text-slate-300 flex flex-col gap-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-400">
                    <Info size={14} />
                    <span>Decision Logic Explanation</span>
                </h4>
                <p className="whitespace-pre-line text-xs">{run.decision_reason}</p>
            </div>

            {/* Cross document consistency discrepancies (Multi-doc runs only) */}
            {isMultiDoc && run.cross_doc_results && !run.cross_doc_results.is_consistent && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 flex flex-col gap-3">
                    <h4 className="font-semibold text-rose-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <AlertTriangle size={14} />
                        <span>Cross-Document Consistency Mismatch</span>
                    </h4>
                    <div className="flex flex-col gap-2.5">
                        {run.cross_doc_results.discrepancies.map((disc, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-900 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                                <span className="font-bold text-slate-300 capitalize text-[11px]">
                                    Field: {disc.field.replace(/_/g, ' ')}
                                </span>
                                <p className="text-slate-400 text-[10px] leading-relaxed">{disc.reason}</p>
                                <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-900/60">
                                    {Object.entries(disc.values).map(([doc, val]) => (
                                        <div key={doc} className="flex justify-between items-center bg-[#0B0F19]/40 p-1.5 rounded border border-slate-850">
                                            <span className="text-[9px] text-slate-500 font-medium truncate max-w-[120px]" title={doc}>{doc}</span>
                                            <span className="text-[9px] text-rose-400 font-semibold font-mono truncate">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document Tabs selector for multi-doc */}
            {isMultiDoc && (
                <div>
                    <h3 className="font-outfit text-sm font-bold text-slate-400 uppercase tracking-wide mb-2.5">
                        Audit Attachments Individually:
                    </h3>
                    <div className="flex gap-2 border-b border-slate-850 pb-3 overflow-x-auto">
                        {Object.keys(run.extracted_data).map(docName => (
                            <button
                                key={docName}
                                type="button"
                                onClick={() => setActiveDoc(docName)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 ${activeDoc === docName
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'bg-[#0B0F19]/30 text-slate-400 hover:text-white border border-slate-800'
                                    }`}
                            >
                                {docName}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Form grid */}
            <div>
                <h3 className="font-outfit text-md font-semibold text-white flex items-center gap-2 mb-4">
                    <Database size={16} className="text-slate-450" />
                    <span>Extraction & Rule Audit {isMultiDoc ? `(${activeDoc})` : ''}</span>
                </h3>

                <div className="flex flex-col gap-3">
                    {Object.keys(activeDocFields).map((key) => {
                        const docData = isMultiDoc
                            ? (run.edited_data || run.extracted_data as any)[activeDoc]
                            : (run.edited_data || run.extracted_data as any);

                        const originalField = docData?.[key];
                        const valResult = isMultiDoc
                            ? (run.validation_results as any)[activeDoc]?.[key]
                            : (run.validation_results as any)[key];

                        const val = activeDocFields[key] || '';
                        const confidence = originalField?.confidence ?? 1.0;

                        return (
                            <div key={key} className="bg-slate-900/20 border border-slate-800/60 rounded-lg p-3 grid grid-cols-[150px_1fr_120px_100px] items-center gap-6">
                                <label className="text-[11px] font-bold text-slate-350 uppercase tracking-wide capitalize">
                                    {formatLabel(key)}
                                </label>
                                <div className="w-full">
                                    <input
                                        type="text"
                                        value={val}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                        className="bg-[#1E293B]/40 border border-slate-800 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none w-full"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                    <span className={`w-1.5 h-1.5 rounded-full ${getConfidenceDotClass(confidence)}`}></span>
                                    <span className="text-[11px] text-slate-400 font-semibold font-mono">
                                        {(confidence * 100).toFixed(0)}% conf
                                    </span>
                                </div>
                                <div className="flex justify-end">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getValidationPillClass(valResult?.result || 'match')}`}>
                                        {valResult?.result || 'match'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Email amendment request */}
            {showDraftEmail && (
                <div className="border-t border-slate-850 pt-5 flex flex-col gap-3">
                    <h3 className="font-outfit text-md font-semibold text-white flex items-center gap-2">
                        <Mail size={16} className="text-slate-450" />
                        <span>Supplier Amendment Request Template</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                        Customize the AI-generated email notification flagging errors directly to the supplier:
                    </p>
                    <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="bg-[#080A10] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 h-48 focus:border-indigo-500 focus:outline-none leading-relaxed resize-none"
                        disabled={submitting}
                        placeholder="No email draft generated for this run."
                    />
                </div>
            )}

            {/* Actions panel */}
            <div className="flex justify-end gap-3 border-t border-slate-850 pt-5">
                <button
                    onClick={handleSaveEdits}
                    className="btn px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 cursor-pointer text-xs font-semibold animate-pulse-on-hover"
                    disabled={submitting}
                >
                    <Save size={14} />
                    <span>Save Edits Only</span>
                </button>

                <button
                    onClick={handleApproveRun}
                    className="btn px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2 cursor-pointer text-xs font-semibold"
                    disabled={submitting}
                >
                    <CheckCircle size={14} />
                    <span>Approve & Close</span>
                </button>

                {showDraftEmail && (
                    <button
                        onClick={handleSendAmendment}
                        className="btn px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg flex items-center gap-2 cursor-pointer text-xs font-semibold"
                        disabled={submitting}
                    >
                        <Send size={14} />
                        <span>Send Amendment Request</span>
                    </button>
                )}
            </div>
        </div>
    );
};

