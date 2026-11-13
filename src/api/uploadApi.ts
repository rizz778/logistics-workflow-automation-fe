import { baseApi } from './baseApi';
import type { PipelineRun } from '../types/pipeline';

interface PresignedItem {
    filename: string;
    s3_key: string;
    upload_url: string;
}

interface PresignedUrlsResponse {
    run_id: number;
    shipment_id: string;
    status: string;
    is_cached: boolean;
    files: PresignedItem[];
    cached_results?: any;
}

interface ConfirmUploadResponse {
    shipment_id: string;
    status: string;
    message: string;
    all_files_ready: boolean;
}

/**
 * Computes deterministic SHA-256 hex string of a File object using browser Web Crypto API.
 */
export async function computeFileSha256(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Direct-to-S3 Presigned URL Upload:
 * 1. Computes SHA-256 hash of files and requests presigned S3 PUT URLs from Gateway.
 * 2. Checks Redis Fast-Path Cache first: if identical files were verified, returns cached run immediately.
 * 3. Otherwise uploads file bytes directly to S3 and confirms upload to trigger Agent Worker.
 */
export async function uploadDocument(file: File): Promise<PipelineRun> {
    return uploadDocuments([file]);
}

export async function uploadDocuments(files: File[]): Promise<PipelineRun> {
    if (!files || files.length === 0) {
        throw new Error('No files selected for upload.');
    }

    // Step 1: Pre-compute SHA-256 fingerprints for client-side fast-path caching
    const filesWithHashes = await Promise.all(
        files.map(async f => ({
            filename: f.name,
            content_type: f.type || 'application/pdf',
            file_hash: await computeFileSha256(f)
        }))
    );

    const presignedReq = {
        files: filesWithHashes,
        source: 'manual_upload'
    };

    const presignedRes = await baseApi.post<PresignedUrlsResponse>('/presigned-urls', presignedReq);

    // Fast-path: If server-side hash detected cache hit, skip S3 upload and worker queue
    if (presignedRes.is_cached && presignedRes.cached_results) {
        return {
            id: presignedRes.run_id,
            shipment_id: presignedRes.shipment_id,
            filename: files.map(f => f.name).join(', '),
            filenames: files.map(f => f.name),
            upload_time: new Date().toISOString(),
            extracted_data: presignedRes.cached_results.extracted_data || {},
            validation_results: presignedRes.cached_results.validation_results || {},
            cross_doc_results: presignedRes.cached_results.cross_doc_results,
            decision: presignedRes.cached_results.decision || 'auto_approve',
            decision_reason: presignedRes.cached_results.decision_reason || 'Instant verification from cache',
            amendment_draft: presignedRes.cached_results.amendment_draft || null,
            status: (presignedRes.status as any) || 'approved',
            edited_data: null,
            is_cached: true
        };
    }

    // Step 2: Stream raw bytes to S3 / MinIO via HTTP PUT (with graceful fallback)
    try {
        const uploadPromises = presignedRes.files.map(async (item) => {
            const fileObj = files.find(f => f.name === item.filename);
            if (!fileObj) {
                throw new Error(`File '${item.filename}' missing from upload set.`);
            }

            const s3Response = await fetch(item.upload_url, {
                method: 'PUT',
                headers: {
                    'Content-Type': fileObj.type || 'application/pdf'
                },
                body: fileObj
            });

            if (!s3Response.ok) {
                throw new Error(
                    `Direct S3 upload failed for '${item.filename}' (HTTP ${s3Response.status}): ${s3Response.statusText}`
                );
            }
        });

        await Promise.all(uploadPromises);

        // Step 3: Confirm all files verified in S3 and dispatch to Redis Streams queue
        await baseApi.post<ConfirmUploadResponse>('/confirm-upload', {
            shipment_id: presignedRes.shipment_id
        });
    } catch (s3Err) {
        console.warn('Direct S3 upload failed or MinIO offline; falling back to Gateway direct upload:', s3Err);
        for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);
            const directRes = await baseApi.post<any>('/upload', formData, true);
            if (directRes?.is_cached && directRes?.cached_results) {
                return {
                    id: directRes.id,
                    shipment_id: directRes.shipment_id,
                    filename: files.map(f => f.name).join(', '),
                    filenames: files.map(f => f.name),
                    upload_time: new Date().toISOString(),
                    extracted_data: directRes.cached_results.extracted_data || {},
                    validation_results: directRes.cached_results.validation_results || {},
                    cross_doc_results: directRes.cached_results.cross_doc_results,
                    decision: directRes.cached_results.decision || 'auto_approve',
                    decision_reason: directRes.cached_results.decision_reason || 'Instant verification from cache',
                    amendment_draft: directRes.cached_results.amendment_draft || null,
                    status: (directRes.status as any) || 'approved',
                    edited_data: null,
                    is_cached: true
                };
            }
        }
    }

    return {
        id: presignedRes.run_id,
        shipment_id: presignedRes.shipment_id,
        filename: files.map(f => f.name).join(', '),
        filenames: files.map(f => f.name),
        upload_time: new Date().toISOString(),
        extracted_data: {} as any,
        validation_results: {} as any,
        decision: 'auto_approve',
        decision_reason: '',
        amendment_draft: null,
        status: 'pending_review',
        edited_data: null
    };
}
