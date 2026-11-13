import { baseApi } from './baseApi';
import type { RulesResponse } from '../types/pipeline';

export async function fetchRules(): Promise<RulesResponse> {
    return baseApi.get<RulesResponse>('/rules');
}
