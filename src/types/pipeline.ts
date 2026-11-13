export interface FieldExtraction {
    value: any;
    confidence: number;
    source_snippet: string | null;
}

export interface TradeDocumentExtraction {
    consignee_name: FieldExtraction;
    hs_code: FieldExtraction;
    port_of_loading: FieldExtraction;
    port_of_discharge: FieldExtraction;
    incoterms: FieldExtraction;
    description_of_goods: FieldExtraction;
    gross_weight: FieldExtraction;
    invoice_number: FieldExtraction;
    extraction_warnings?: string[];
}

export interface ValidationResult {
    result: 'match' | 'mismatch' | 'uncertain';
    expected_value: any;
    found_value: any;
    reason: string;
}

export interface CrossDocDiscrepancy {
    field: string;
    values: Record<string, string>;
    reason: string;
}

export interface CrossDocResults {
    is_consistent: boolean;
    discrepancies: CrossDocDiscrepancy[];
}

export interface PipelineRun {
    id: number;
    shipment_id?: string;
    filename: string;
    filenames?: string[];
    upload_time: string;
    extracted_data: TradeDocumentExtraction | Record<string, TradeDocumentExtraction>;
    validation_results: Record<string, ValidationResult> | Record<string, Record<string, ValidationResult>>;
    cross_doc_results?: CrossDocResults;
    decision: 'auto_approve' | 'flag_review' | 'amendment_request';
    decision_reason: string;
    amendment_draft: string | null;
    status: 'pending_review' | 'approved' | 'amended';
    edited_data: TradeDocumentExtraction | Record<string, TradeDocumentExtraction> | null;
    logs?: string[];
    source?: 'inbox' | 'manual_upload';
    email_sender?: string | null;
    email_subject?: string | null;
    email_body?: string | null;
    received_at?: string | null;
    is_cached?: boolean;
}

export interface RuleDetail {
    type: string;
    expected?: any;
    expected_prefixes?: string[];
    expected_max?: number;
    expected_pattern?: string;
}

export interface RulesResponse {
    customer_name: string;
    rules: Record<string, RuleDetail>;
}

export interface AnalyticsKPIs {
    auto_approve_rate: number;
    compliance_score: number;
    cache_hit_rate: number;
    failure_rate: number;
    total_processed: number;
}

export interface DailyThroughputItem {
    date: string | null;
    total: number;
    auto_approved: number;
    flagged: number;
    amendments: number;
}

export interface MismatchFieldItem {
    field: string;
    count: number;
}

export interface AnalyticsResponse {
    total_runs: number;
    decisions: {
        auto_approve: number;
        flag_review: number;
        amendment_request: number;
    };
    statuses: {
        pending_review: number;
        approved: number;
        amended: number;
        processing?: number;
        failed?: number;
        pending_upload?: number;
    };
    kpis?: AnalyticsKPIs;
    sources?: {
        manual_upload: number;
        inbox: number;
    };
    cache?: {
        hits: number;
        misses: number;
        hit_rate: number;
    };
    daily_throughput?: DailyThroughputItem[];
    hourly_distribution?: Record<number, number>;
    top_mismatch_fields?: MismatchFieldItem[];
    auto_approved?: number;
    flagged_for_review?: number;
    amendments_requested?: number;
}

export interface QueryResponse {
    success: boolean;
    sql: string | null;
    results: any[] | null;
    answer: string;
    error?: string;
}
