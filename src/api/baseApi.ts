const API_BASE = '/pipeline';

export const baseApi = {
    async get<T>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `GET request to ${path} failed.`);
        }
        return response.json();
    },

    async post<T>(path: string, body?: any, isFormData: boolean = false): Promise<T> {
        const headers: Record<string, string> = {};
        let requestBody: any;

        if (isFormData) {
            requestBody = body;
        } else {
            headers['Content-Type'] = 'application/json';
            requestBody = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: requestBody,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `POST request to ${path} failed.`);
        }

        return response.json();
    }
};
