// src/pages/Ganancia.tsx
import { useCallback, useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExpenseModal } from '../components/ganancia/ExpenseModal';
import { gananciaService } from '../services/gananciaService';
import { ApiError } from '../services/api';
import { METODO_LABEL } from '../types/pos';
import { CATEGORIA_GASTO_LABEL, type CategoriaGasto, type Ganancia as GananciaData, type Gasto } from '../types/ganancia';
import { fechaISO, formatCantidad, formatFechaHora, formatSoles } from '../utils/formato';

type Filtro = 'Hoy' | 'Semana' | 'Este mes' | 'Rango';

function rango(filtro: Filtro, desde: string, hasta: string): [string, string] {
    const hoy = new Date();
    if (filtro === 'Hoy') return [fechaISO(hoy), fechaISO(hoy)];
    if (filtro === 'Semana') {
        const d = new Date(hoy);
        d.setDate(d.getDate() - 6);
        return [fechaISO(d), fechaISO(hoy)];
    }
    if (filtro === 'Este mes') return [fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fechaISO(hoy)];
    return [desde, hasta];
}

/** Descarga un CSV que se abre en Excel (con ; y BOM para que respete tildes y decimales) */
function exportarCsv(g: GananciaData, gastos: Gasto[]) {
    const n = (x: number) => x.toFixed(2).replace('.', ',');
    const filas: string[][] = [
        ['Reporte de ganancia', `${g.desde} al ${g.hasta}`],
        [],
        ['Ventas', n(g.ventas)], ['Costo de lo vendido', n(g.costoVendido)], ['Ganancia bruta', n(g.gananciaBruta)],
        ['Margen %', n(g.margen)], ['Gastos', n(g.gastos)], ['Ganancia neta', n(g.gananciaNeta)],
        [],
        ['Fecha', 'Ventas', 'Costo', 'Gastos', 'Ganancia'],
        ...g.porDia.map((d) => [d.fecha, n(d.ventas), n(d.costo), n(d.gastos), n(d.ganancia)]),
        [],
        ['Gastos'], ['Fecha', 'Categoría', 'Descripción', 'Método', 'Monto'],
        ...gastos.map((x) => [x.fecha.slice(0, 16).replace('T', ' '), CATEGORIA_GASTO_LABEL[x.categoria],
            x.descripcion ?? '', METODO_LABEL[x.metodoPago], n(x.monto)]),
    ];
    const csv = '﻿' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganancia_${g.desde}_${g.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function Ganancia() {
    const [filtro, setFiltro] = useState<Filtro>('Hoy');
    const [desdeRango, setDesdeRango] = useState(fechaISO(new Date()));
    const [hastaRango, setHastaRango] = useState(fechaISO(new Date()));
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const [data, setData] = useState<GananciaData | null>(null);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [desde, hasta] = rango(filtro, desdeRango, hastaRango);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [g, gs] = await Promise.all([gananciaService.calcular(desde, hasta), gananciaService.gastos(desde, hasta)]);
            setData(g);
            setGastos(gs);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo calcular la ganancia');
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const eliminarGasto = async (g: Gasto) => {
        if (!confirm(`¿Eliminar el gasto de ${formatSoles(g.monto)}${g.descripcion ? ` (${g.descripcion})` : ''}?`)) return;
        try {
            await gananciaService.eliminarGasto(g.id);
            cargar();
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'No se pudo eliminar');
        }
    };

    const getButtonClass = (activo: boolean) =>
        activo
            ? 'px-5 py-2 bg-black text-white rounded-lg text-sm font-bold shadow-md transition'
            : 'px-5 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition';

    const un = desde === hasta;
    const grafico = (data?.porDia ?? []).map((d) => ({ ...d, name: `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}` }));
    const categorias = Object.entries(data?.gastosPorCategoria ?? {}) as [CategoriaGasto, number][];

    return (
        <div className="space-y-6">
            <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSaved={cargar} />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                        {(['Hoy', 'Semana', 'Este mes', 'Rango'] as Filtro[]).map((f) => (
                            <button key={f} onClick={() => setFiltro(f)} className={getButtonClass(filtro === f)}>
                                {f === 'Rango' ? 'Rango de Fechas' : f}
                            </button>
                        ))}
                    </div>
                    {filtro === 'Rango' && (
                        <div className="flex items-center gap-2 text-sm">
                            <input type="date" value={desdeRango} onChange={(e) => setDesdeRango(e.target.value)}
                                   className="border border-gray-200 rounded-lg px-3 py-2" />
                            <span className="text-gray-400">a</span>
                            <input type="date" value={hastaRango} onChange={(e) => setHastaRango(e.target.value)}
                                   className="border border-gray-200 rounded-lg px-3 py-2" />
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition">
                        + Registrar gasto
                    </button>
                    <button onClick={() => data && exportarCsv(data, gastos)} disabled={!data}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition flex items-center gap-2 border border-gray-200 disabled:opacity-40">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar Reporte
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                    <span>{error}</span>
                    <button onClick={cargar} className="font-bold underline">Reintentar</button>
                </div>
            )}

            {data && data.productosSinCosto > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                    ⚠ {data.productosSinCosto} {data.productosSinCosto === 1 ? 'producto vendido no tiene' : 'productos vendidos no tienen'} precio de costo:
                    la ganancia sale más alta de lo real. Completa el costo en Inventario.
                </div>
            )}

            {/* TARJETAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-sm font-bold text-gray-500 uppercase">Ventas</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '…' : formatSoles(data?.ventas ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">{data?.cantidadVentas ?? 0} ventas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-sm font-bold text-gray-500 uppercase">Costo de lo vendido</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '…' : formatSoles(data?.costoVendido ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Ganancia bruta {formatSoles(data?.gananciaBruta ?? 0)} · margen {formatCantidad(data?.margen ?? 0)}%
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <p className="text-sm font-bold text-gray-500 uppercase">Gastos</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{loading ? '…' : formatSoles(data?.gastos ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">{gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}</p>
                </div>
                <div className={`p-6 rounded-2xl shadow-sm border transition hover:shadow-md ${
                    (data?.gananciaNeta ?? 0) >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                }`}>
                    <p className="text-sm font-bold text-gray-500 uppercase">Ganancia neta</p>
                    <p className={`text-3xl font-bold mt-2 ${(data?.gananciaNeta ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {loading ? '…' : formatSoles(data?.gananciaNeta ?? 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ventas − costo − gastos</p>
                </div>
            </div>

            {/* GRÁFICO + PANELES */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 text-lg">Costo vs. Venta por Día</h3>
                    {un || !data || data.cantidadVentas === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
                            {un ? 'Elige "Semana", "Este mes" o un rango para ver la evolución por día.' : 'No hay ventas en este periodo.'}
                        </div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={grafico}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                    <Tooltip formatter={(v) => formatSoles(Number(v))}
                                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="ventas" name="Ventas" fill="#111827" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="costo" name="Costo" fill="#9CA3AF" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="gastos" name="Gastos" fill="#FCA5A5" radius={[6, 6, 0, 0]} />
                                    <Line type="monotone" dataKey="ganancia" name="Ganancia" stroke="#16A34A" strokeWidth={3} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Top 5 Productos Rentables</h3>
                        {(data?.topProductos.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-400">Sin ventas en este periodo.</p>
                        ) : (
                            <div className="space-y-3">
                                {data!.topProductos.map((p, i) => (
                                    <div key={p.productoId} className="flex justify-between items-center gap-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{i + 1}. {p.nombre}</p>
                                            <p className="text-xs text-gray-500">{formatCantidad(p.cantidad)} vendidos · {formatSoles(p.ventas)}</p>
                                        </div>
                                        <span className="font-bold text-green-600 shrink-0">+{formatSoles(p.ganancia)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-1 text-sm uppercase tracking-wide">Productos Sin Movimiento</h3>
                        <p className="text-xs text-gray-400 mb-4">Con stock, pero no se vendieron en este periodo</p>
                        {(data?.sinMovimiento.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-400">Todo lo que tienes se movió. 👍</p>
                        ) : (
                            <div className="space-y-3">
                                {data!.sinMovimiento.map((p) => (
                                    <div key={p.productoId} className="flex justify-between items-center gap-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                                            <p className="text-xs text-gray-500">stock {formatCantidad(p.stock)}</p>
                                        </div>
                                        <span className="text-gray-600 shrink-0" title="Plata invertida en ese stock">{formatSoles(p.valorEnStock)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* GASTOS DEL PERIODO */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">Gastos del periodo</h3>
                    {gastos.length === 0 ? (
                        <p className="text-sm text-gray-400">No hay gastos registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3">Método</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                    <th className="px-2 py-3" />
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {gastos.map((g) => (
                                    <tr key={g.id}>
                                        <td className="px-4 py-3 text-gray-500">{formatFechaHora(g.fecha)}</td>
                                        <td className="px-4 py-3 text-gray-700">{CATEGORIA_GASTO_LABEL[g.categoria].split(' (')[0]}</td>
                                        <td className="px-4 py-3 text-gray-600">{g.descripcion ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {METODO_LABEL[g.metodoPago]}
                                            {g.deCaja && <span className="ml-2 text-[11px] bg-gray-100 px-2 py-0.5 rounded-md">del cajón</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatSoles(g.monto)}</td>
                                        <td className="px-2 py-3 text-right">
                                            <button onClick={() => eliminarGasto(g)} className="text-xs font-bold text-gray-400 hover:text-red-600">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Gastos por categoría</h3>
                    {categorias.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin gastos.</p>
                    ) : (
                        <div className="space-y-3">
                            {categorias.sort((a, b) => b[1] - a[1]).map(([c, monto]) => (
                                <div key={c}>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{CATEGORIA_GASTO_LABEL[c].split(' (')[0]}</span>
                                        <span className="font-bold">{formatSoles(monto)}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-red-400 rounded-full"
                                             style={{ width: `${data && data.gastos > 0 ? (monto / data.gastos) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
