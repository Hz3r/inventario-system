// src/components/notificaciones/NotificationBell.tsx
// Campanita del menú lateral: cantidad de alertas, panel con la lista y avisos flotantes de las nuevas.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Bell, BellRing, CalendarX, CheckCheck, Clock, HandCoins, PackageX, Truck, Vault, X,
} from 'lucide-react';
import { useNotificaciones } from './useNotificaciones';
import { formatFechaHora } from '../../utils/formato';
import {
    TIPO_NOTIFICACION_LABEL, type NivelNotificacion, type Notificacion, type TipoNotificacion,
} from '../../types/notificaciones';

const ICONO: Record<TipoNotificacion, typeof Bell> = {
    STOCK_AGOTADO: PackageX,
    STOCK_BAJO: AlertTriangle,
    PRODUCTO_VENCIDO: CalendarX,
    POR_VENCER: Clock,
    FIADO_ATRASADO: HandCoins,
    PEDIDO_PENDIENTE: Truck,
    CAJA_SIN_CERRAR: Vault,
};

const COLOR: Record<NivelNotificacion, { icono: string; punto: string; borde: string }> = {
    CRITICA: { icono: 'bg-red-50 text-red-600', punto: 'bg-red-500', borde: 'border-l-red-500' },
    ADVERTENCIA: { icono: 'bg-amber-50 text-amber-600', punto: 'bg-amber-500', borde: 'border-l-amber-500' },
    INFO: { icono: 'bg-blue-50 text-blue-600', punto: 'bg-blue-500', borde: 'border-l-blue-500' },
};

/** Al abrir una alerta de stock, el inventario se filtra solo */
const ESTADO_INVENTARIO: Partial<Record<TipoNotificacion, string>> = {
    STOCK_AGOTADO: 'SIN_STOCK',
    STOCK_BAJO: 'BAJO_STOCK',
};

type Filtro = 'NO_LEIDAS' | 'TODAS';

export function NotificationBell() {
    const navigate = useNavigate();
    const {
        data, nuevas, descartarNuevas, marcar, marcarTodas, escritorio, escritorioDisponible, activarEscritorio,
    } = useNotificaciones();
    const [abierto, setAbierto] = useState(false);
    const [filtro, setFiltro] = useState<Filtro>('NO_LEIDAS');
    const [tipo, setTipo] = useState<TipoNotificacion | 'TODOS'>('TODOS');
    const panelRef = useRef<HTMLDivElement>(null);
    const botonRef = useRef<HTMLButtonElement>(null);

    // Cerrar con Escape o al hacer clic fuera
    useEffect(() => {
        if (!abierto) return;
        const alClic = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!panelRef.current?.contains(t) && !botonRef.current?.contains(t)) setAbierto(false);
        };
        const alTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        document.addEventListener('mousedown', alClic);
        document.addEventListener('keydown', alTecla);
        return () => {
            document.removeEventListener('mousedown', alClic);
            document.removeEventListener('keydown', alTecla);
        };
    }, [abierto]);

    // Los avisos flotantes se van solos
    useEffect(() => {
        if (nuevas.length === 0) return;
        const id = window.setTimeout(descartarNuevas, 8000);
        return () => window.clearTimeout(id);
    }, [nuevas, descartarNuevas]);

    const noLeidas = data?.noLeidas ?? 0;
    const criticas = data?.criticas ?? 0;
    const todas = data?.notificaciones ?? [];
    const tiposPresentes = [...new Set(todas.map((n) => n.tipo))];
    const visibles = todas.filter((n) => (filtro === 'TODAS' || !n.leida) && (tipo === 'TODOS' || n.tipo === tipo));

    const abrir = (n: Notificacion) => {
        if (!n.leida) marcar([n.clave]);
        setAbierto(false);
        descartarNuevas();
        const estado = ESTADO_INVENTARIO[n.tipo];
        navigate(n.enlace, estado ? { state: { filterStatus: estado } } : undefined);
    };

    const Campana = noLeidas > 0 ? BellRing : Bell;

    return (
        <>
            <button
                ref={botonRef}
                onClick={() => setAbierto((v) => !v)}
                className="relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition"
                aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ''}`}
                title="Notificaciones"
            >
                <Campana className={`w-5 h-5 ${criticas > 0 ? 'text-red-400' : ''}`} />
                {noLeidas > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${criticas > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
                        {noLeidas > 99 ? '99+' : noLeidas}
                    </span>
                )}
            </button>

            {/* ---------------- Panel ---------------- */}
            {abierto && (
                <div
                    ref={panelRef}
                    className="fixed left-[17rem] top-4 w-[26rem] max-w-[calc(100vw-18rem)] max-h-[calc(100vh-2rem)] bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-[60] overflow-hidden"
                >
                    <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Notificaciones</h3>
                                <p className="text-xs text-gray-500">
                                    {noLeidas === 0 ? 'Todo en orden' : `${noLeidas} sin leer${criticas ? ` · ${criticas} urgentes` : ''}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                {noLeidas > 0 && (
                                    <button onClick={marcarTodas} title="Marcar todas como leídas"
                                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-black hover:bg-gray-100 px-2 py-1.5 rounded-lg transition">
                                        <CheckCheck className="w-4 h-4" /> Leídas
                                    </button>
                                )}
                                <button onClick={() => setAbierto(false)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition" aria-label="Cerrar">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                            {(['NO_LEIDAS', 'TODAS'] as Filtro[]).map((f) => (
                                <button key={f} onClick={() => setFiltro(f)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtro === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {f === 'NO_LEIDAS' ? 'Sin leer' : 'Todas'}
                                </button>
                            ))}
                            {tiposPresentes.length > 1 && (
                                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNotificacion | 'TODOS')}
                                        className="ml-auto text-xs border border-gray-200 rounded-full px-2 py-1 outline-none focus:ring-2 focus:ring-black">
                                    <option value="TODOS">Todos los tipos</option>
                                    {tiposPresentes.map((t) => <option key={t} value={t}>{TIPO_NOTIFICACION_LABEL[t]}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {data === null ? (
                            <p className="p-8 text-center text-sm text-gray-400">Cargando…</p>
                        ) : visibles.length === 0 ? (
                            <div className="p-10 text-center">
                                <CheckCheck className="w-10 h-10 mx-auto text-green-500 mb-2" />
                                <p className="text-sm font-semibold text-gray-700">
                                    {filtro === 'NO_LEIDAS' ? 'No tienes alertas pendientes' : 'No hay alertas'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Te avisaremos de stock bajo, vencimientos, fiados y más.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {visibles.map((n) => {
                                    const Icono = ICONO[n.tipo];
                                    return (
                                        <li key={n.clave}>
                                            <button onClick={() => abrir(n)}
                                                    className={`w-full text-left px-5 py-3 flex gap-3 hover:bg-gray-50 transition ${n.leida ? 'opacity-60' : ''}`}>
                                                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${COLOR[n.nivel].icono}`}>
                                                    <Icono className="w-5 h-5" />
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm truncate">{n.titulo}</span>
                                                        {!n.leida && <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR[n.nivel].punto}`} />}
                                                    </span>
                                                    <span className="block text-xs text-gray-500 mt-0.5">{n.mensaje}</span>
                                                    <span className="block text-[11px] text-gray-400 mt-1">
                                                        {TIPO_NOTIFICACION_LABEL[n.tipo]} · {formatFechaHora(n.fecha)}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {escritorioDisponible && (
                        <label className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 cursor-pointer">
                            <span>Avisarme también con notificaciones del navegador</span>
                            <input type="checkbox" checked={escritorio} onChange={(e) => activarEscritorio(e.target.checked)}
                                   className="w-4 h-4 accent-black" />
                        </label>
                    )}
                </div>
            )}

            {/* ---------------- Avisos flotantes de alertas nuevas ---------------- */}
            {!abierto && nuevas.length > 0 && (
                <div className="fixed bottom-6 right-6 z-[60] space-y-2 w-80" role="status" aria-live="polite">
                    {nuevas.map((n) => {
                        const Icono = ICONO[n.tipo];
                        return (
                            <div key={n.clave} className={`bg-white rounded-xl shadow-xl border border-gray-100 border-l-4 ${COLOR[n.nivel].borde} p-3 flex gap-3`}>
                                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${COLOR[n.nivel].icono}`}>
                                    <Icono className="w-4 h-4" />
                                </span>
                                <button onClick={() => abrir(n)} className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{n.titulo}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2">{n.mensaje}</p>
                                </button>
                                <button onClick={descartarNuevas} className="text-gray-300 hover:text-gray-600 self-start" aria-label="Cerrar aviso">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
