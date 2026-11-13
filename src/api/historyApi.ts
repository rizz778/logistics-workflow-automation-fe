import { baseApi } from './baseApi';
import type { PipelineRun } from '../types/pipeline';

interface HistoryResponse {
    total: number;
    runs: PipelineRun[];
    limit: number;
    offset: number;
}

export async function fetchHistory(): Promise<PipelineRun[]> {
    const res = await baseApi.get<HistoryResponse | PipelineRun[]>('/history');
    // Handle both paginated { runs: [...] } and plain array responses
    if (Array.isArray(res)) return res;
    return (res as HistoryResponse).runs ?? [];
}
