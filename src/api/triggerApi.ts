import { baseApi } from './baseApi';
import type { PipelineRun } from '../types/pipeline';
import { computeFileSha256 } from './uploadApi';

export async function triggerEmailIncoming(
    sender: string,
    subject: string,
    body: string,
    files: File[]
): Promise<{ success: boolean; message: string }> {
    // Precompute SHA-256 fingerprints
    const filesWithHashes = await Promise.all(
        files.map(async f => ({
            filename: f.name,
            content_type: f.type || 'application/pdf',
            file_hash: await computeFileSha256(f)
        }))
    );

    // Reuse presigned-url upload flow with source='inbox' and email metadata
    const presignedReq = {
        files: filesWithHashes,
        source: 'inbox',
        email_sender: sender,
        email_metadata: { subject, body }
    };

    const presignedRes = await baseApi.post<any>('/presigned-urls', presignedReq);

    // If cache hit, documents were already audited -- skip S3 upload
    if (presignedRes.is_cached) {
        return {
            success: true,
            message: `⚡ Fast-Path Cache HIT: Instant verification recorded for ${files.length} document(s) (Shipment: ${presignedRes.shipment_id}).`
        };
    }

    // Upload each file directly to S3 via presigned PUT URL
    await Promise.all(
        presignedRes.files.map(async (item: any) => {
            const fileObj = files.find(f => f.name === item.filename);
            if (!fileObj) return;
            await fetch(item.upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': fileObj.type || 'application/pdf' },
                body: fileObj
            });
        })
    );

    // Confirm upload to trigger agent worker
    await baseApi.post('/confirm-upload', { shipment_id: presignedRes.shipment_id });

    return {
        success: true,
        message: `${files.length} document(s) submitted to CG Inbox queue (Shipment: ${presignedRes.shipment_id}).`
    };
}

export async function fetchIncomingEmails(): Promise<PipelineRun[]> {
    return baseApi.get<PipelineRun[]>('/incoming');
}

export async function fetchProcessedEmails(): Promise<PipelineRun[]> {
    return baseApi.get<PipelineRun[]>('/processed');
}

export async function resolveProcessedEmail(
    runId: number,
    status: string,
    editedData?: any,
    amendmentDraft?: string
): Promise<{ status: string; message: string }> {
    return baseApi.post<{ status: string; message: string }>(`/update-status/${runId}`, {
        status,
        edited_data: editedData,
        amendment_draft: amendmentDraft
    });
}

