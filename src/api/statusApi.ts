import { baseApi } from './baseApi';
import type { TradeDocumentExtraction, PipelineRun } from '../types/pipeline';

export interface UpdateStatusPayload {
    status: 'pending_review' | 'approved' | 'amended';
    edited_data?: Partial<TradeDocumentExtraction> | null;
    amendment_draft?: string | null;
}

export interface PipelineRunEvent {
    shipment_id: string;
    run_id?: number | null;
    step: 'idle' | 'uploading' | 'extracting' | 'validating' | 'routing' | 'done' | 'paused' | 'error' | 'connected';
    status: string;
    message: string;
    decision?: string;
    data?: any;
    timestamp: number;
}

export async function fetchRunStatus(runId: number): Promise<PipelineRun> {
    return baseApi.get<PipelineRun>(`/status/${runId}`);
}

export async function updateStatus(
    runId: number,
    payload: UpdateStatusPayload
): Promise<{ status: string; message: string }> {
    return baseApi.post<{ status: string; message: string }>(`/update-status/${runId}`, payload);
}

export function createRunEventSource(
    runIdentifier: string | number,
    onMessage: (event: PipelineRunEvent) => void,
    onError?: (err: Event) => void
): EventSource {
    const sseUrl = `/pipeline/runs/${runIdentifier}/events`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('message', (e) => {
        try {
            const parsed = JSON.parse(e.data);
            onMessage(parsed);
        } catch (err) {
            console.error('Failed to parse SSE payload:', err);
        }
    });

    eventSource.addEventListener('connected', (e: any) => {
        try {
            const parsed = JSON.parse(e.data);
            onMessage(parsed);
        } catch (_) {}
    });

    if (onError) {
        eventSource.onerror = onError;
    }

    return eventSource;
}

