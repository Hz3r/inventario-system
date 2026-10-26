// src/services/auth.ts
// Guarda la sesión (token + usuario) en ESTE navegador. Dura los días que diga el backend (30 por defecto).
import { api } from './api';

export interface Usuario {
    id: number;
    email: string;
    nombre: string;
    rol: 'ADMIN' | 'CAJERO';
}

interface LoginResponse {
    token: string;
    expiraEn: string;
    usuario: Usuario;
}

const CLAVE_TOKEN = 'auth_token';
const CLAVE_USUARIO = 'auth_usuario';
const CLAVE_EXPIRA = 'auth_expira';

// localStorage puede fallar (modo incógnito estricto): en ese caso la sesión dura mientras la pestaña esté abierta
const memoria = new Map<string, string>();
const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return memoria.get(k) ?? null; } };
const escribir = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { memoria.set(k, v); } };
const borrar = (k: string) => { try { localStorage.removeItem(k); } catch { /* nada */ } memoria.delete(k); };

export const authService = {
    async login(email: string, password: string): Promise<Usuario> {
        const r = await api.post<LoginResponse>('/api/auth/login', { email, password });
        escribir(CLAVE_TOKEN, r.token);
        escribir(CLAVE_EXPIRA, r.expiraEn);
        escribir(CLAVE_USUARIO, JSON.stringify(r.usuario));
        return r.usuario;
    },

    logout() {
        borrar(CLAVE_TOKEN);
        borrar(CLAVE_EXPIRA);
        borrar(CLAVE_USUARIO);
    },

    token(): string | null {
        const t = leer(CLAVE_TOKEN);
        const expira = leer(CLAVE_EXPIRA);
        if (!t) return null;
        if (expira && new Date(expira).getTime() < Date.now()) {   // ya venció
            this.logout();
            return null;
        }
        return t;
    },

    estaLogueado(): boolean {
        return this.token() !== null;
    },

    usuario(): Usuario | null {
        try {
            const u = leer(CLAVE_USUARIO);
            return u ? (JSON.parse(u) as Usuario) : null;
        } catch {
            return null;
        }
    },

    cambiarClave: (claveActual: string, claveNueva: string) =>
        api.post<void>('/api/auth/cambiar-clave', { claveActual, claveNueva }),
};
