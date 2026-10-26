// src/services/api.ts
// Único lugar que sabe DÓNDE está el backend y CÓMO hablarle.

// - Instalado (npm run build): la página la entrega el MISMO backend → misma dirección ('').
//   Funciona igual en la mini PC (localhost:8080), desde el celular (192.168.x.x:8080) y en Railway.
// - Desarrollo (npm run dev): Vite corre en el 5173 y el backend en el 8080 de la misma máquina.
// - VITE_API_URL permite forzar otra dirección si algún día hiciera falta.
const API_URL: string = import.meta.env.VITE_API_URL
    ?? (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:8080` : '');

const CLAVE_TOKEN = 'auth_token';

function tokenGuardado(): string | null {
    try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
}

/** Aviso global: App.tsx lo escucha y vuelve a la pantalla de login */
export const EVENTO_SESION_EXPIRADA = 'sesion-expirada';

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
        const token = tokenGuardado();
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),   // la "pulsera" de la sesión
                ...options.headers,
            },
        });
    } catch {
        // El fetch falla solo si no hay conexión (backend apagado, sin red...)
        throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }

    // 401 fuera del login = el token venció o es inválido → volver a pedir la contraseña
    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
        try { localStorage.removeItem(CLAVE_TOKEN); } catch { /* nada */ }
        window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
        throw new ApiError(401, 'Tu sesión venció. Vuelve a iniciar sesión.');
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