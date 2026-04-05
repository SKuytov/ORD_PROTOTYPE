import { API_BASE_URL } from '../constants';

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setToken(token: string | null) {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401 && _onUnauthorized) {
      _onUnauthorized();
      throw new Error('Session expired. Please log in again.');
    }
    let msg = response.statusText;
    try {
      const json = await response.json();
      msg = json.message || msg;
    } catch {}
    throw new Error(`${response.status}: ${msg}`);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  postForm: <T>(path: string, formData: FormData) => request<T>('POST', path, formData, true),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
