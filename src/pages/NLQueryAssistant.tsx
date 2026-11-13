import React, { useState } from 'react';
import { queryDatabase } from '../api/queryApi';
import type { QueryResponse } from '../types/pipeline';
import { Play, Table, AlertCircle } from 'lucide-react';

export const NLQueryAssistant: React.FC = () => {
    const [queryText, setQueryText] = useState('');
    const [response, setResponse] = useState<QueryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSql, setShowSql] = useState(false);

    const examples = [
        'How many runs are auto-approved?',
        'List filenames of documents that require review',
        'Are there any runs with a gross weight above 1000 kg?',
    ];

    const handleExampleClick = (text: string) => {
        setQueryText(text);
    };

    const handleRunQuery = async () => {
        if (!queryText.trim()) return;
        setLoading(true);
        setResponse(null);
        try {
            const data = await queryDatabase(queryText);
            setResponse(data);
        } catch (err: any) {
            setResponse({
                success: false,
                sql: null,
                results: null,
                answer: 'Failed to run query assistant.',
                error: err.message || 'Server error occurred.'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderResultsTable = () => {
        if (!response || !response.results || response.results.length === 0) return null;

        const headers = Object.keys(response.results[0]);

        return (
            <div className="w-full border border-slate-800 rounded-lg bg-slate-950/20 overflow-hidden max-h-[300px]">
                <div className="overflow-auto max-h-[260px]">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-200 font-semibold uppercase tracking-wider">
                                {headers.map(header => (
                                    <th key={header} className="p-3 whitespace-nowrap">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {response.results.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/10">
                                    {headers.map(header => {
                                        const cellVal = row[header];
                                        const displayVal = typeof cellVal === 'object' && cellVal !== null
                                            ? JSON.stringify(cellVal)
                                            : String(cellVal ?? '');
                                        return (
                                            <td key={header} className="p-3 text-slate-350 max-w-xs truncate" title={displayVal}>
                                                {displayVal}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
            <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md text-slate-100 flex flex-col gap-5 w-full">
                <div>
                    <h2 className="font-outfit text-xl font-bold tracking-tight text-white mb-0.5">
                        Natural Language SQLite Assistant
                    </h2>
                    <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                        Ask questions about audit status rates, consignees, or weight parameters in plain English.
                        The AI generates the correct SQLite query, runs it, and summarizes the results in markdown.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="text-slate-500 font-medium">Try asking:</span>
                    {examples.map(ex => (
                        <button
                            key={ex}
                            onClick={() => handleExampleClick(ex)}
                            className="bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 hover:text-white px-2.5 py-1 rounded-full cursor-pointer transition-colors duration-250"
                        >
                            {ex}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    <textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="e.g. How many documents did we process in total?"
                        className="bg-[#080A10] border border-slate-800 rounded-lg p-4 font-sans text-sm text-slate-350 h-24 focus:border-indigo-500 focus:outline-none leading-relaxed resize-none w-full"
                        disabled={loading}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleRunQuery}
                            className="btn px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2 cursor-pointer text-xs font-semibold"
                            disabled={loading || !queryText.trim()}
                        >
                            <Play size={12} fill="currentColor" />
                            <span>{loading ? 'Asking AI...' : 'Ask Assistant'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {response && (
                <div className="bg-[#1E293B]/50 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md text-slate-100 flex flex-col gap-5 w-full">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h2 className="font-outfit text-md font-semibold text-white">Assistant Answer</h2>
                        {response.sql && (
                            <button
                                onClick={() => setShowSql(!showSql)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                                {showSql ? 'Hide SQL Code' : 'Show SQL Code'}
                            </button>
                        )}
                    </div>

                    {showSql && response.sql && (
                        <div className="bg-[#080A10] border border-purple-500/10 rounded-lg p-4 font-mono text-[11px] text-purple-400 overflow-x-auto">
                            <pre><code>{response.sql}</code></pre>
                        </div>
                    )}

                    {!response.success && response.error && (
                        <div className="bg-rose-500/5 border border-rose-500/20 text-rose-450 rounded-lg p-4 text-xs flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>Error: {response.error}</span>
                        </div>
                    )}

                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap markdown-body">
                        {response.answer}
                    </div>

                    {response.success && response.results && response.results.length > 0 && (
                        <div className="flex flex-col gap-3 mt-2">
                            <h3 className="font-outfit text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Table size={14} />
                                <span>SQL Result Set</span>
                            </h3>
                            {renderResultsTable()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
