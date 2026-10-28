// src/pages/Kardex.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { inventarioService } from '../services/inventarioService';
import { ApiError } from '../services/api';
import { MOTIVO_LABEL, UNIDAD_CORTA, type Movimiento } from '../types/inventario';
import { formatCantidad, formatFechaHora } from '../utils/formato';
import { exportarKardexCsv, imprimirKardex, type InfoKardex } from '../utils/exportarKardex';

type Rango = 'hoy' | '7dias' | 'mes' | 'personalizado';

// Fecha local "2026-10-25" (toISOString usaría UTC y después de las 7 p.m. daría el día siguiente)
const pad = (n: number) => String(n).padStart(2, '0');
const aISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function calcularRango(rango: Rango, desde: string, hasta: string): [string, string] {
    const hoy = new Date();
    switch (rango) {
        case 'hoy': return [aISO(hoy), aISO(hoy)];
        case '7dias': {
            const d = new Date(hoy);
            d.setDate(d.getDate() - 6);
            return [aISO(d), aISO(hoy)];
        }
        case 'mes': return [aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), aISO(hoy)];
        default: return [desde, hasta];
    }
}

export default function Kardex() {
    const inputRef = useRef<HTMLInputElement>(null);

    const [rango, setRango] = useState<Rango>('7dias');
    const [desde, setDesde] = useState(aISO(new Date()));
    const [hasta, setHasta] = useState(aISO(new Date()));

    const [codigo, setCodigo] = useState('');
    const [producto, setProducto] = useState<{ id: number; nombre: string } | null>(null);

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (producto) {
                // Historial completo del producto escaneado
                setMovimientos(await inventarioService.kardexProducto(producto.id));
            } else {
                const [d, h] = calcularRango(rango, desde, hasta);
                setMovimientos(await inventarioService.kardex(d, h));
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar el kardex');
            setMovimientos([]);
        } finally {
            setLoading(false);
        }
    }, [producto, rango, desde, hasta]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // La pistola escribe el código y "presiona" Enter al final
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const c = codigo.trim();
        setCodigo('');
        if (!c) return;
        try {
            const r = await inventarioService.escanear(c);   // sirve para botella o caja
            setProducto({ id: r.productoId, nombre: r.productoNombre });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo buscar el código');
        }
    };

    const quitarFiltro = () => {
        setProducto(null);
        inputRef.current?.focus();
    };

    const entradas = movimientos.filter((m) => m.cantidad > 0).length;

    // Título y nombre de archivo para imprimir / exportar
    const infoExport = (): InfoKardex => {
        if (producto) {
            return { titulo: `Producto: ${producto.nombre} (historial completo)`, archivo: `kardex_${producto.nombre.replace(/[^\w]+/g, '_')}` };
        }
        const [d, h] = calcularRango(rango, desde, hasta);
        const dmy = (iso: string) => iso.split('-').reverse().join('/');
        return { titulo: `Del ${dmy(d)} al ${dmy(h)}`, archivo: `kardex_${d}_${h}` };
    };
    const salidas = movimientos.length - entradas;

    const btnRango = (r: Rango, texto: string) => (
        <button
            onClick={() => { setRango(r); setProducto(null); }}
            className={
                rango === r && !producto
                    ? 'bg-black text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition'
                    : 'bg-white text-gray-700 border border-gray-200 px-5 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition'
            }
        >
            {texto}
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kardex de Inventario</h1>
                    <p className="text-sm text-gray-500">Todas las entradas y salidas de stock, con el saldo antes y después.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => imprimirKardex(movimientos, infoExport())} disabled={loading || movimientos.length === 0}
                            className="bg-white border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 disabled:opacity-40 transition">
                        🖨️ Imprimir / PDF
                    </button>
                    <button onClick={() => exportarKardexCsv(movimientos, infoExport())} disabled={loading || movimientos.length === 0}
                            className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-40 transition">
                        Exportar a Excel
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    {btnRango('hoy', 'Hoy')}
                    {btnRango('7dias', 'Últimos 7 días')}
                    {btnRango('mes', 'Este mes')}
                    {btnRango('personalizado', 'Elegir fechas')}
                    {rango === 'personalizado' && !producto && (
                        <div className="flex items-center gap-2 text-sm">
                            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                                   className="border border-gray-200 rounded-xl px-3 py-2" />
                            <span className="text-gray-400">a</span>
                            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                                   className="border border-gray-200 rounded-xl px-3 py-2" />
                        </div>
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escanea un código para ver el historial de ese producto..."
                    className="w-full md:w-1/2 px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm font-mono"
                />

                {producto && (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold">
                            Historial completo de: {producto.nombre}
                        </span>
                        <button onClick={quitarFiltro} className="text-gray-500 hover:text-black font-bold">✕ Ver todos</button>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
            )}

            {/* Resumen */}
            {!loading && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 font-bold uppercase">Movimientos</p>
                        <p className="text-2xl font-bold text-gray-900">{movimientos.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 font-bold uppercase">Entradas</p>
                        <p className="text-2xl font-bold text-green-600">{entradas}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 font-bold uppercase">Salidas</p>
                        <p className="text-2xl font-bold text-red-600">{salidas}</p>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Fecha y Hora</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Motivo</th>
                            <th className="px-6 py-4 text-right">Cantidad</th>
                            <th className="px-6 py-4 text-right">Stock</th>
                            <th className="px-6 py-4">Nota</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">Cargando kardex...</td></tr>
                        ) : movimientos.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-500">No hay movimientos en este periodo.</td></tr>
                        ) : (
                            movimientos.map((m) => {
                                const u = UNIDAD_CORTA[m.unidadMedida];
                                return (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500">{formatFechaHora(m.fecha)}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{m.productoNombre}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                                m.cantidad > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                                {MOTIVO_LABEL[m.motivo]}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.cantidad > 0 ? '+' : ''}{formatCantidad(m.cantidad)} {u}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCantidad(m.stockAnterior)} → <b className="text-gray-900">{formatCantidad(m.stockResultante)}</b>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{m.nota ?? '—'}</td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}