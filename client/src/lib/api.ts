// PartPulse API client — connects to existing MySQL backend
// The existing backend runs on a separate server; this frontend proxies through it

const API_BASE = typeof window !== 'undefined' && (window as any).__API_BASE__ 
  ? (window as any).__API_BASE__ 
  : '/api';

let authToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Register a callback to be fired when a 401 is received (token expired / invalid)
export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const headers: Record<string, string> = {};
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // 401 = token expired or not authenticated → trigger logout gracefully
    if (res.status === 401 && _onUnauthorized) {
      _onUnauthorized();
      throw new Error('Session expired. Please log in again.');
    }
    
    // 403 = access denied (role mismatch) → don't logout, just throw
    // 404, 500, etc. → throw without logging out
    let errorMsg: string;
    try {
      const json = await res.json();
      errorMsg = json.message || res.statusText;
    } catch {
      errorMsg = res.statusText;
    }
    throw new Error(`${res.status}: ${errorMsg}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, formData: FormData) => request<T>('POST', path, formData, true),
};
