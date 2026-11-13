import { useState, useEffect } from 'react';
import { Sidebar } from './components/SideBar';
import { AnalyticsCards } from './components/AnalyticsCards';
import { AuditDesk } from './pages/AuditDesk';
import { HistoryRegistry } from './pages/HistoryRegistry';
import { NLQueryAssistant } from './pages/NLQueryAssistant';
import { SupplierPortal } from './pages/SupplierPortal';
import type { PipelineRun, AnalyticsResponse } from './types/pipeline';
import { fetchHistory } from './api/historyApi';
import { fetchAnalytics } from './api/analyticsApi';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'query' | 'supplier'>('dashboard');
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<PipelineRun[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Helper to load run history and aggregate dashboard stats
  const loadHistoryAndStats = async () => {
    setLoadingHistory(true);
    try {
      const [historyData, analyticsData] = await Promise.all([
        fetchHistory(),
        fetchAnalytics()
      ]);
      setHistoryRuns(historyData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to sync history and analytics:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Sync dashboard data on mount
  useEffect(() => {
    loadHistoryAndStats();
  }, []);

  // When clicking an audit run from the Registry table, load it into the workspace
  const handleSelectRun = (run: PipelineRun) => {
    setActiveRun(run);
    setActiveTab('dashboard');
  };

  // When a pipeline upload run finishes or operator overrides are saved, refresh metrics
  const handleDataRefresh = () => {
    loadHistoryAndStats();
  };

  const getHeaderSubText = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Process incoming trade documentation and verify compliance.';
      case 'supplier':
        return 'Simulate the supplier interface to draft and dispatch email documents to the inbox queue.';
      case 'history':
        return 'Historical log of all document verification pipeline runs.';
      case 'query':
        return 'Query sqlite run history logs using natural language.';
      default:
        return '';
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Audit Desk';
      case 'supplier':
        return 'Supplier Outbox Console';
      case 'history':
        return 'Run Registry';
      case 'query':
        return 'NL Query Assistant';
      default:
        return '';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Frame */}
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto h-full">
        {/* Header */}
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-white">
              {getHeaderTitle()}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {getHeaderSubText()}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-1.5 rounded-full text-[10px] font-semibold text-emerald-400 tracking-wide shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span>Connected</span>
          </div>
        </header>

        {/* Dynamic Panel Views */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            <AnalyticsCards stats={analytics} />
            <AuditDesk
              activeRun={activeRun}
              setActiveRun={setActiveRun}
              onRunCompleted={handleDataRefresh}
            />
          </div>
        )}

        {activeTab === 'supplier' && (
          <div className="flex-1 flex w-full">
            <SupplierPortal onEmailSent={() => {
              setActiveTab('dashboard');
              loadHistoryAndStats();
            }} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 flex w-full">
            <HistoryRegistry
              runs={historyRuns}
              loading={loadingHistory}
              onRefresh={loadHistoryAndStats}
              onSelectRun={handleSelectRun}
            />
          </div>
        )}

        {activeTab === 'query' && (
          <div className="flex-1 flex w-full">
            <NLQueryAssistant />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
