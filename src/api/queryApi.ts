import { baseApi } from './baseApi';
import type { QueryResponse } from '../types/pipeline';

export async function queryDatabase(query: string): Promise<QueryResponse> {
    return baseApi.post<QueryResponse>('/query', { query });
}
