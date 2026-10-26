// src/pages/Ventas.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TicketModal } from '../components/ventas/TicketModal';
import { posService } from '../services/posService';
import { ApiError } from '../services/api';
import { METODO_LABEL, type Caja, type MetodoPago, type Venta } from '../types/pos';
import { fechaISO, formatFechaHora, formatSoles } from '../utils/formato';
import { centavos } from '../utils/dinero';

type Filtro = 'Hoy' | 'Semana' | 'Mes' | 'Rango';
type Vista = 'ventas' | 'cajas';

function rango(filtro: Filtro, desde: string, hasta: string): [string, string] {
    const hoy = new Date();
    if (filtro === 'Hoy') return [fechaISO(hoy), fechaISO(hoy)];
    if (filtro === 'Semana') {
        const d = new Date(hoy);
        d.setDate(d.getDate() - 6);
        return [fechaISO(d), fechaISO(hoy)];
    }
    if (filtro === 'Mes') return [fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fechaISO(hoy)];
    return [desde, hasta];
}

/** Datos del gráfico: por hora si es un solo día, por día si es un rango */
function datosGrafico(ventas: Venta[], desde: string, hasta: string) {
    const completadas = ventas.filter((v) => v.estado === 'COMPLETADA');
    if (desde === hasta) {
        const porHora = new Map<number, number>();
        completadas.forEach((v) => {
            const h = new Date(v.fecha).getHours();
            porHora.set(h, (porHora.get(h) ?? 0) + centavos(v.total));
        });
        const horas = [...porHora.keys()];
        const min = Math.min(7, ...horas);
        const max = Math.max(21, ...horas);
        return Array.from({ length: max - min + 1 }, (_, i) => ({
            name: `${String(min + i).padStart(2, '0')}:00`,
            ventas: (porHora.get(min + i) ?? 0) / 100,
        }));
    }
    const porDia = new Map<string, number>();
    completadas.forEach((v) => {
        const dia = v.fecha.slice(0, 10);
        porDia.set(dia, (porDia.get(dia) ?? 0) + centavos(v.total));
    });
    const datos: { name: string; ventas: number }[] = [];
    const d = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    while (d <= fin) {
        const clave = fechaISO(d);
        datos.push({ name: `${clave.slice(8, 10)}/${clave.slice(5, 7)}`, ventas: (porDia.get(clave) ?? 0) / 100 });
        d.setDate(d.getDate() + 1);
    }
    return datos;
}

export function Ventas() {
    const [vista, setVista] = useState<Vista>('ventas');
    const [filtro, setFiltro] = useState<Filtro>('Hoy');
    const [desdeRango, setDesdeRango] = useState(fechaISO(new Date()));
    const [hastaRango, setHastaRango] = useState(fechaISO(new Date()));

    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cajas, setCajas] = useState<Caja[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seleccionada, setSeleccionada] = useState<Venta | null>(null);

    const [desde, hasta] = rango(filtro, desdeRango, hastaRango);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (vista === 'ventas') {
                setVentas(await posService.ventasEntre(desde, hasta));
            } else {
                setCajas(await posService.historialCajas());
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar la información');
        } finally {
            setLoading(false);
        }
    }, [vista, desde, hasta]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // ---------------- Resumen ----------------
    const completadas = ventas.filter((v) => v.estado === 'COMPLETADA');
    const totalCent = completadas.reduce((s, v) => s + centavos(v.total), 0);
    const promedio = completadas.length ? totalCent / completadas.length / 100 : 0;
    const anuladas = ventas.length - completadas.length;

    const porMetodo = useMemo(() => {
        const m = new Map<MetodoPago, number>();
        ventas.filter((v) => v.estado === 'COMPLETADA')
            .forEach((v) => v.pagos.forEach((p) => m.set(p.metodo, (m.get(p.metodo) ?? 0) + centavos(p.monto))));
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [ventas]);

    const data = useMemo(() => datosGrafico(ventas, desde, hasta), [ventas, desde, hasta]);
    const hayDatos = completadas.length > 0;

    const actualizarVenta = (v: Venta) => {
        setVentas((prev) => prev.map((x) => (x.id === v.id ? v : x)));
        setSeleccionada(v);
    };

    const getButtonClass = (activo: boolean) =>
        activo
            ? 'bg-black text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md transition'
            : 'bg-white text-gray-700 border border-gray-200 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition';

    return (
        <div className="space-y-8">
            <TicketModal venta={seleccionada} onClose={() => setSeleccionada(null)} onAnulada={actualizarVenta} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-sm text-gray-500">Historial de ventas y cierres de caja</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setVista('ventas')} className={getButtonClass(vista === 'ventas')}>Ventas</button>
                    <button onClick={() => setVista('cajas')} className={getButtonClass(vista === 'cajas')}>Cierres de caja</button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                    <span>{error}</span>
                    <button onClick={cargar} className="font-bold underline">Reintentar</button>
                </div>
            )}

            {vista === 'ventas' ? (
                <>
                    {/* FILTROS */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex gap-2">
                            {(['Hoy', 'Semana', 'Mes'] as Filtro[]).map((f) => (
                                <button key={f} onClick={() => setFiltro(f)} className={getButtonClass(filtro === f)}>{f}</button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium">Desde:</span>
                                <input type="date" value={desdeRango}
                                       onChange={(e) => { setDesdeRango(e.target.value); setFiltro('Rango'); }}
                                       className="border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:ring-2 focus:ring-black outline-none" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium">Hasta:</span>
                                <input type="date" value={hastaRango}
                                       onChange={(e) => { setHastaRango(e.target.value); setFiltro('Rango'); }}
                                       className="border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:ring-2 focus:ring-black outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase">Total vendido</p>
                            <p className="text-3xl font-bold text-gray-900">{formatSoles(totalCent / 100)}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase">Ventas</p>
                            <p className="text-3xl font-bold text-gray-900">{completadas.length}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase">Ticket promedio</p>
                            <p className="text-3xl font-bold text-gray-900">{formatSoles(promedio)}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs text-gray-500 font-bold uppercase">Anuladas</p>
                            <p className={`text-3xl font-bold ${anuladas > 0 ? 'text-red-600' : 'text-gray-900'}`}>{anuladas}</p>
                        </div>
                    </div>

                    {/* GRÁFICO + MÉTODOS */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col justify-center items-center">
                            {!hayDatos ? (
                                <div className="flex flex-col items-center justify-center opacity-50">
                                    <p className="text-gray-500 font-medium">No hay ventas en este periodo</p>
                                    <p className="text-xs text-gray-400 mt-1">Las ventas del Punto de Venta aparecerán aquí.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(valor) => [formatSoles(Number(valor)), 'Ventas']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="ventas" stroke="#000000" strokeWidth={3}
                                              dot={{ r: 4, fill: '#000000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">Por método de pago</h3>
                            {porMetodo.length === 0 ? (
                                <p className="text-sm text-gray-400">Sin ventas.</p>
                            ) : (
                                <div className="space-y-3">
                                    {porMetodo.map(([m, cent]) => (
                                        <div key={m}>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">{METODO_LABEL[m]}</span>
                                                <span className="font-bold">{formatSoles(cent / 100)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-black rounded-full" style={{ width: `${totalCent ? (cent / totalCent) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TABLA HISTORIAL */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Historial de Ventas</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                    <th className="px-4 py-4 rounded-l-xl">Fecha</th>
                                    <th className="px-4 py-4">Ticket #</th>
                                    <th className="px-4 py-4">Cliente</th>
                                    <th className="px-4 py-4">Método</th>
                                    <th className="px-4 py-4 text-right">Total</th>
                                    <th className="px-4 py-4 text-center">Estado</th>
                                    <th className="px-4 py-4 rounded-r-xl" />
                                </tr>
                                </thead>
                                <tbody className="text-sm">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-16 text-center text-gray-400">Cargando...</td></tr>
                                ) : ventas.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <h3 className="text-gray-600 font-bold text-sm">Sin ventas en este periodo</h3>
                                            <p className="text-gray-400 text-xs mt-1">Las ventas del Punto de Venta aparecerán aquí.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    ventas.map((v) => (
                                        <tr key={v.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${v.estado === 'ANULADA' ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-4 font-medium text-gray-600">{formatFechaHora(v.fecha)}</td>
                                            <td className="px-4 py-4 font-bold text-gray-800">#{String(v.numero).padStart(6, '0')}</td>
                                            <td className="px-4 py-4 text-gray-600">{v.clienteNombre ?? '—'}</td>
                                            <td className="px-4 py-4 text-gray-600">{v.pagos.map((p) => METODO_LABEL[p.metodo]).join(' + ')}</td>
                                            <td className={`px-4 py-4 font-bold text-right ${v.estado === 'ANULADA' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {formatSoles(v.total)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                    v.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                    {v.estado === 'COMPLETADA' ? 'Pagado' : 'Anulada'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button onClick={() => setSeleccionada(v)} className="text-gray-400 hover:text-black font-medium text-xs transition">
                                                    Ver detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* CIERRES DE CAJA */
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Últimos 30 turnos de caja</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                <th className="px-4 py-4 rounded-l-xl">Apertura</th>
                                <th className="px-4 py-4">Cierre</th>
                                <th className="px-4 py-4 text-right">Ventas</th>
                                <th className="px-4 py-4 text-right">Total vendido</th>
                                <th className="px-4 py-4 text-right">Efectivo esperado</th>
                                <th className="px-4 py-4 text-right">Contado</th>
                                <th className="px-4 py-4 text-right rounded-r-xl">Diferencia</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center text-gray-400">Cargando...</td></tr>
                            ) : cajas.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center text-gray-500">Todavía no hay turnos de caja.</td></tr>
                            ) : (
                                cajas.map((c) => {
                                    const dif = c.diferencia !== null ? centavos(c.diferencia) : null;
                                    return (
                                        <tr key={c.id} className="border-b border-gray-50">
                                            <td className="px-4 py-4 text-gray-600">{formatFechaHora(c.abiertaEn)}</td>
                                            <td className="px-4 py-4 text-gray-600">
                                                {c.cerradaEn ? formatFechaHora(c.cerradaEn) : <span className="font-bold text-green-700">Abierta ahora</span>}
                                            </td>
                                            <td className="px-4 py-4 text-right">{c.cantidadVentas}</td>
                                            <td className="px-4 py-4 text-right font-bold">{formatSoles(c.totalVendido)}</td>
                                            <td className="px-4 py-4 text-right">{formatSoles(c.efectivoEsperado)}</td>
                                            <td className="px-4 py-4 text-right">{formatSoles(c.montoContado)}</td>
                                            <td className={`px-4 py-4 text-right font-bold ${
                                                dif === null ? 'text-gray-400' : dif === 0 ? 'text-green-700' : dif > 0 ? 'text-blue-700' : 'text-red-600'
                                            }`}>
                                                {dif === null ? '—' : dif === 0 ? 'Cuadra ✓' : `${dif > 0 ? '+' : '−'}${formatSoles(Math.abs(dif) / 100)}`}
                                                {c.nota && <span className="block text-[11px] font-normal text-gray-400">{c.nota}</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
