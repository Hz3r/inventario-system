// src/pages/Dashboard.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { StatCard } from '../components/dashboard/StatCard';
import { RightPanel } from '../components/dashboard/RightPanel';
import { dashboardService } from '../services/dashboardService';
import { ApiError } from '../services/api';
import { METODO_LABEL } from '../types/pos';
import type { DashboardData } from '../types/dashboard';
import { formatCantidad, formatSoles } from '../utils/formato';

/** "+12% vs ayer" */
function comparacion(hoy: number, ayer: number): string {
    if (ayer === 0) return hoy > 0 ? 'Ayer no hubo ventas' : 'Sin ventas aún';
    const pct = ((hoy - ayer) / ayer) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% vs ayer (${formatSoles(ayer)})`;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setData(await dashboardService.obtener());
            setError(null);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar el tablero');
        }
    }, []);

    // Carga al entrar y se actualiza sola cada minuto
    useEffect(() => {
        cargar();
        const id = setInterval(cargar, 60_000);
        return () => clearInterval(id);
    }, [cargar]);

    const d = data;
    const grafico = (d?.ultimos7Dias ?? []).map((x) => ({
        name: DIAS[new Date(`${x.fecha}T12:00:00`).getDay()],
        ventas: x.ventas,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                        <span>{error}</span>
                        <button onClick={cargar} className="font-bold underline">Reintentar</button>
                    </div>
                )}

                {/* Avisos rápidos */}
                {d && (
                    <div className="flex flex-wrap gap-3 text-sm">
                        <button
                            onClick={() => navigate('/pos')}
                            className={`px-4 py-2 rounded-xl font-bold border ${
                                d.caja ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                        >
                            {d.caja
                                ? `● Caja abierta · ${d.caja.cantidadVentas} ventas · ${formatSoles(d.caja.efectivoEsperado)} en cajón`
                                : '○ Caja cerrada · Abrir Punto de Venta'}
                        </button>
                        {d.pedidosPorLlegar > 0 && (
                            <button
                                onClick={() => navigate('/proveedores')}
                                className="px-4 py-2 rounded-xl font-bold border bg-amber-50 text-amber-800 border-amber-200"
                            >
                                📦 {d.pedidosPorLlegar} {d.pedidosPorLlegar === 1 ? 'pedido por llegar' : 'pedidos por llegar'} ({formatSoles(d.pedidosPorLlegarMonto)})
                            </button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard
                        title="Ventas Hoy"
                        amount={d ? formatSoles(d.ventasHoy) : '…'}
                        items={d ? `${d.ventasHoyCantidad} ventas · ${comparacion(d.ventasHoy, d.ventasAyer)}` : 'Cargando...'}
                        iconPath="/icons/venta.svg"
                        color={d && d.ventasHoy > 0 ? 'text-gray-900' : 'text-gray-300'}
                        bgColor="bg-green-100"
                        onAction={() => navigate('/ventas')}
                    />
                    <StatCard
                        title="Ganancia Mes"
                        amount={d ? formatSoles(d.gananciaMes) : '…'}
                        items={d ? `Ventas ${formatSoles(d.ventasMes)} · margen ${formatCantidad(d.margenMes)}%` : 'Cargando...'}
                        iconPath="/icons/ganancias.svg"
                        color={!d || d.ventasMes === 0 ? 'text-gray-300' : d.gananciaMes >= 0 ? 'text-green-700' : 'text-red-600'}
                        bgColor="bg-blue-100"
                        onAction={() => navigate('/ganancia')}
                    />
                    <StatCard
                        title="Stock Bajo"
                        amount={d ? String(d.stockBajoCantidad) : '…'}
                        items={!d ? 'Cargando...' : d.stockBajoCantidad === 0 ? 'Todo en orden' : `${d.stockBajoCantidad} productos por reponer`}
                        iconPath="/icons/alerta.svg"
                        color={d && d.stockBajoCantidad > 0 ? 'text-red-500' : 'text-gray-300'}
                        bgColor="bg-orange-100"
                        onAction={() => navigate('/inventario', { state: { filterStatus: 'BAJO_STOCK' } })}
                    />
                    <StatCard
                        title="Total Fiados"
                        amount={d ? formatSoles(d.fiadosTotal) : '…'}
                        items={!d ? 'Cargando...' : d.clientesConDeuda === 0 ? 'Nadie debe' : `${d.clientesConDeuda} ${d.clientesConDeuda === 1 ? 'cliente debe' : 'clientes deben'}`}
                        iconPath="/icons/fiado.svg"
                        color={d && d.fiadosTotal > 0 ? 'text-amber-600' : 'text-gray-300'}
                        bgColor="bg-amber-100"
                        onAction={() => navigate('/fiados')}
                    />
                </div>

                {/* Ventas de los últimos 7 días */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-lg">Ventas de los últimos 7 días</h3>
                        <span className="text-sm text-gray-500">
                            Total: <b>{formatSoles((d?.ultimos7Dias ?? []).reduce((s, x) => s + x.ventas, 0))}</b>
                        </span>
                    </div>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={grafico}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip formatter={(v) => [formatSoles(Number(v)), 'Ventas']} cursor={{ fill: '#F3F4F6' }}
                                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="ventas" fill="#111827" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Últimas ventas de hoy */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 min-h-[300px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 text-2xl">Últimas Ventas</h3>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Hoy</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="border-b border-gray-100 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="py-4 font-semibold pl-4">Hora</th>
                                <th className="py-4 font-semibold">Ticket</th>
                                <th className="py-4 font-semibold">Total</th>
                                <th className="py-4 font-semibold">Método</th>
                                <th className="py-4 text-right font-semibold pr-4">Estado</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {!d || d.ultimasVentas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                                <img src="/icons/venta.svg" className="w-8 h-8 opacity-30 grayscale" alt="vacio" />
                                            </div>
                                            <p className="text-gray-500 font-bold text-lg">No hay ventas registradas hoy</p>
                                            <p className="text-gray-400 text-sm mt-1">El sistema está esperando tu primera venta.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                d.ultimasVentas.map((v) => (
                                    <tr key={v.id} onClick={() => navigate('/ventas')}
                                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${v.estado === 'ANULADA' ? 'opacity-50' : ''}`}>
                                        <td className="py-3 pl-4 text-gray-600">{v.fecha.slice(11, 16)}</td>
                                        <td className="py-3 font-bold text-gray-800">#{String(v.numero).padStart(6, '0')}</td>
                                        <td className={`py-3 font-bold ${v.estado === 'ANULADA' ? 'line-through' : ''}`}>{formatSoles(v.total)}</td>
                                        <td className="py-3 text-gray-600">{v.pagos.map((p) => METODO_LABEL[p.metodo]).join(' + ')}</td>
                                        <td className="py-3 pr-4 text-right">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                v.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                            }`}>
                                                {v.estado === 'COMPLETADA' ? 'Pagado' : 'Anulada'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1">
                <RightPanel topSemana={d?.topSemana ?? []} stockBajo={d?.stockBajo ?? []} />
            </div>
        </div>
    );
}
