const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiRequest(path, { token, body, formData, method } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: method || (body || formData ? 'POST' : 'GET'),
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        ...(formData ? { body: formData } : {})
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || 'The request could not be completed.');
    }
    return payload;
}

export async function downloadRequest(path, token) {
    const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'The document could not be downloaded.');
    }
    return response.blob();
}