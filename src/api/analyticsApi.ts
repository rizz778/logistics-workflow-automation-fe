import { baseApi } from './baseApi';
import type { AnalyticsResponse } from '../types/pipeline';

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
    return baseApi.get<AnalyticsResponse>('/analytics');
}
