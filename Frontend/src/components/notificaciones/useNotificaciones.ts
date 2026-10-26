// src/components/notificaciones/useNotificaciones.ts
// Consulta las alertas cada minuto (y al volver a la pestaña) y avisa de las nuevas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { notificacionesService } from '../../services/notificacionesService';
import type { Notificacion, NotificacionesData } from '../../types/notificaciones';

/** Cualquier pantalla puede pedir que se vuelvan a calcular las alertas: refrescarNotificaciones() */
export const EVENTO_REFRESCAR = 'notificaciones-refrescar';
export const refrescarNotificaciones = () => window.dispatchEvent(new Event(EVENTO_REFRESCAR));

const CADA_MS = 60_000;
const CLAVE_ESCRITORIO = 'notif_escritorio';

const soportaEscritorio = () => typeof window !== 'undefined' && 'Notification' in window;

function leerPreferencia(): boolean {
    try { return localStorage.getItem(CLAVE_ESCRITORIO) === '1'; } catch { return false; }
}

export function useNotificaciones() {
    const [data, setData] = useState<NotificacionesData | null>(null);
    const [nuevas, setNuevas] = useState<Notificacion[]>([]);   // para los avisos flotantes
    const [escritorio, setEscritorio] = useState<boolean>(
        () => leerPreferencia() && soportaEscritorio() && Notification.permission === 'granted',
    );
    const conocidas = useRef<Set<string> | null>(null);   // null = todavía no hubo primera carga
    const escritorioRef = useRef(escritorio);
    escritorioRef.current = escritorio;

    const cargar = useCallback(async () => {
        try {
            const res = await notificacionesService.listar();
            setData(res);

            const noLeidas = res.notificaciones.filter((n) => !n.leida);
            if (conocidas.current === null) {
                // Primera carga: no se "dispara" todo de golpe; solo se resume lo urgente
                const criticas = noLeidas.filter((n) => n.nivel === 'CRITICA');
                if (criticas.length > 0) setNuevas(criticas.slice(0, 3));
            } else {
                const recientes = noLeidas.filter((n) => !conocidas.current!.has(n.clave) && n.nivel !== 'INFO');
                if (recientes.length > 0) {
                    setNuevas(recientes.slice(0, 3));
                    avisarEnEscritorio(recientes, escritorioRef.current);
                }
            }
            conocidas.current = new Set(res.notificaciones.map((n) => n.clave));
        } catch {
            // Sin conexión: se mantiene lo último que se tenía y se reintenta en el próximo ciclo
        }
    }, []);

    useEffect(() => {
        cargar();
        const id = window.setInterval(cargar, CADA_MS);
        const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
        document.addEventListener('visibilitychange', alVolver);
        // Otras pantallas avisan cuando cambian datos (venta, compra, importación...)
        window.addEventListener(EVENTO_REFRESCAR, cargar);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener(EVENTO_REFRESCAR, cargar);
        };
    }, [cargar]);

    // El número de alertas en el título de la pestaña: "(3) Inventario"
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\) /, '');
        const n = data?.noLeidas ?? 0;
        document.title = n > 0 ? `(${n}) ${base}` : base;
    }, [data?.noLeidas]);

    // Marcar como leídas: se actualiza la pantalla al instante y luego se avisa al backend
    const marcar = useCallback(async (claves: string[]) => {
        if (claves.length === 0) return;
        setData((prev) => prev && recontar(prev.notificaciones.map((n) => (claves.includes(n.clave) ? { ...n, leida: true } : n))));
        try { await notificacionesService.marcarLeidas(claves); } catch { cargar(); }
    }, [cargar]);

    const marcarTodas = useCallback(async () => {
        setData((prev) => prev && recontar(prev.notificaciones.map((n) => ({ ...n, leida: true }))));
        try { await notificacionesService.marcarTodasLeidas(); } catch { cargar(); }
    }, [cargar]);

    const activarEscritorio = useCallback(async (activar: boolean) => {
        if (activar && soportaEscritorio()) {
            const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
            if (permiso !== 'granted') {
                alert('El navegador bloqueó las notificaciones. Actívalas desde el candado de la barra de direcciones.');
                return;
            }
        }
        try { localStorage.setItem(CLAVE_ESCRITORIO, activar ? '1' : '0'); } catch { /* nada */ }
        setEscritorio(activar);
    }, []);

    const descartarNuevas = useCallback(() => setNuevas([]), []);

    return {
        data,
        nuevas,
        descartarNuevas,
        recargar: cargar,
        marcar,
        marcarTodas,
        escritorio,
        escritorioDisponible: soportaEscritorio(),
        activarEscritorio,
    };
}

function recontar(notificaciones: Notificacion[]): NotificacionesData {
    return {
        notificaciones,
        noLeidas: notificaciones.filter((n) => !n.leida).length,
        criticas: notificaciones.filter((n) => !n.leida && n.nivel === 'CRITICA').length,
    };
}

function avisarEnEscritorio(recientes: Notificacion[], activo: boolean) {
    if (!activo || !soportaEscritorio() || Notification.permission !== 'granted') return;
    try {
        if (recientes.length === 1) {
            new Notification(recientes[0].titulo, { body: recientes[0].mensaje, tag: recientes[0].clave, icon: '/icons/alerta.svg' });
        } else {
            new Notification(`${recientes.length} alertas nuevas en tu bodega`, {
                body: recientes.slice(0, 4).map((n) => `• ${n.titulo}`).join('\n'),
                tag: 'resumen-alertas',
                icon: '/icons/alerta.svg',
            });
        }
    } catch {
        // Algunos celulares solo permiten notificaciones desde un Service Worker: nos quedamos con las de la pantalla
    }
}
