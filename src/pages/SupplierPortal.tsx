import React, { useState, useRef } from 'react';
import { Mail, Paperclip, Send, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { triggerEmailIncoming } from '../api/triggerApi';

interface SupplierPortalProps {
    onEmailSent: () => void;
}

export const SupplierPortal: React.FC<SupplierPortalProps> = ({ onEmailSent }) => {
    const [sender, setSender] = useState('su@northwindshipping.com');
    const [subject, setSubject] = useState('Shipment docs - PO#4521');
    const [body, setBody] = useState('Hi, attaching the BOL, invoice, and packing list for the latest shipment. Let us know if anything is missing.');
    const [files, setFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
                const ext = ['.pdf', '.png', '.jpg', '.jpeg'];
                return ext.some(el => file.name.toLowerCase().endsWith(el));
            });
            setFiles(prev => [...prev, ...droppedFiles]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) {
            setError('Please attach at least one shipping document.');
            return;
        }
        
        setSending(true);
        setError(null);
        setSuccessMsg(null);
        
        try {
            const res = await triggerEmailIncoming(sender, subject, body, files);
            setSuccessMsg(res.message || 'Email successfully dispatched to CG Inbox queue.');

            
            // Wait 2.5 seconds to show success before redirecting to the main dashboard
            setTimeout(() => {
                onEmailSent();
            }, 2500);
            
        } catch (err: any) {
            setError(err.message || 'Failed to trigger simulated email. Is backend running?');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex-1 flex justify-center items-start py-4 max-w-4xl mx-auto w-full">
            <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-8 shadow-2xl backdrop-blur-md w-full flex flex-col gap-6">
                
                <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/25 rounded-lg flex items-center justify-center text-indigo-400">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h2 className="font-outfit text-xl font-bold tracking-tight text-white">Simulate Supplier Email Ingestion</h2>
                        <p className="text-xs text-slate-400">Draft an incoming supplier document audit request below.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-lg flex items-start gap-3 text-sm text-rose-450 font-medium">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg flex items-start gap-3 text-sm text-emerald-400 font-medium animate-pulse">
                        <CheckCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{successMsg} Redirecting to CG Audit Desk...</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-[100px_1fr] items-center border border-slate-800/80 rounded-lg p-3 bg-slate-950/20">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">From:</label>
                        <input 
                            type="text" 
                            value={sender} 
                            onChange={e => setSender(e.target.value)} 
                            className="bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0 w-full"
                            required
                            disabled={sending}
                        />
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-center border border-slate-800/80 rounded-lg p-3 bg-slate-950/20">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Subject:</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)} 
                            className="bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0 w-full"
                            required
                            disabled={sending}
                        />
                    </div>

                    <div className="flex flex-col border border-slate-800/80 rounded-lg p-4 bg-slate-950/20 gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Body:</label>
                        <textarea 
                            value={body} 
                            onChange={e => setBody(e.target.value)} 
                            rows={4}
                            className="bg-transparent border-none text-sm text-slate-350 focus:outline-none focus:ring-0 w-full resize-none leading-relaxed"
                            required
                            disabled={sending}
                        />
                    </div>

                    {/* Drag and Drop attachments section */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Attachments:</span>
                        <div 
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/10 rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden" 
                                accept=".pdf,.png,.jpg,.jpeg"
                                multiple
                                disabled={sending}
                            />
                            <Paperclip size={32} className="text-slate-500" />
                            <p className="text-sm text-slate-300">
                                Drag and drop files here or <span className="text-indigo-400 underline font-semibold">browse</span>
                            </p>
                            <p className="text-[10px] text-slate-500">Supports PDF, PNG, JPG, JPEG (Max 25MB)</p>
                        </div>
                    </div>

                    {/* Files list */}
                    {files.length > 0 && (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-[#0B0F19]/50 border border-slate-800/60 p-2.5 rounded-lg">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                                        <File size={16} className="text-slate-450" />
                                        <span className="font-medium font-mono">{file.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveFile(idx)}
                                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                        disabled={sending}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-2 border-t border-slate-850">
                        <button
                            type="submit"
                            disabled={sending || files.length === 0}
                            className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 transition-all duration-300"
                        >
                            {sending ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Sending Simulated Email...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    <span>Send Simulated Email</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
