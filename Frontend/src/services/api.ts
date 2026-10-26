// src/services/api.ts
// Único lugar que sabe DÓNDE está el backend y CÓMO hablarle.

// En tu PC usa localhost; en Railway se configura VITE_API_URL al construir
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** Error que devuelve nuestro backend (GlobalExceptionHandler → ApiError) */
export class ApiError extends Error {
    status: number;
    campos: Record<string, string> | null;

    constructor(status: number, mensaje: string, campos: Record<string, string> | null = null) {
        super(mensaje);
        this.name = 'ApiError';
        this.status = status;
        this.campos = campos;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
        });
    } catch {
        // El fetch falla solo si no hay conexión (backend apagado, sin red...)
        throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }

    if (res.status === 204) return undefined as T;   // DELETE no devuelve cuerpo

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new ApiError(res.status, data?.mensaje ?? `Error ${res.status}`, data?.campos ?? null);
    }
    return data as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};