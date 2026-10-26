// src/services/api.ts
// Único lugar que sabe DÓNDE está el backend y CÓMO hablarle.

// Por defecto el backend está en la MISMA máquina que sirve la página, puerto 8080.
// Así funciona en la PC de la bodega (localhost) y desde el celular en el WiFi (192.168.x.x).
// En Railway se configura VITE_API_URL al construir.
const API_URL: string = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:8080`;

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

/** Hace la petición con el token y convierte los errores del backend en ApiError */
async function enviar(path: string, options: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
        const token = tokenGuardado();
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                // Con FormData (subir archivos) el navegador pone el Content-Type con su "boundary"
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new ApiError(res.status, data?.mensaje ?? `Error ${res.status}`, data?.campos ?? null);
    }
    return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await enviar(path, options);
    if (res.status === 204) return undefined as T;   // DELETE no devuelve cuerpo
    return (await res.json().catch(() => null)) as T;
}

/** Descarga un archivo del backend (con el token) y lo guarda con el nombre indicado */
async function descargar(path: string, nombreArchivo: string): Promise<void> {
    const res = await enviar(path);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path: string) => request<void>(path, { method: 'DELETE' }),
    /** Sube un archivo como multipart/form-data */
    subir: <T>(path: string, campo: string, archivo: File) => {
        const form = new FormData();
        form.append(campo, archivo);
        return request<T>(path, { method: 'POST', body: form });
    },
    descargar,
};