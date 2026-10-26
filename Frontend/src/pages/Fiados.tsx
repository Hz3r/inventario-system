// src/pages/Fiados.tsx
import { useCallback, useEffect, useState } from 'react';
import { fiadosService } from '../services/fiadosService';
import { ApiError } from '../services/api';
import type { DeudaCliente } from '../types/fiados';
import { formatSoles } from '../utils/formato';
import { CuentaClienteModal } from '../components/fiados/CuentaClienteModal';
import { DeudaManualModal } from '../components/fiados/DeudaManualModal';

/** "2026-10-20T10:00" -> 6 (días desde esa fecha) */
const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const textoDias = (dias: number) => (dias === 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`);

export default function Fiados() {
    const [filas, setFilas] = useState<DeudaCliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buscar, setBuscar] = useState('');
    const [clienteAbierto, setClienteAbierto] = useState<number | null>(null);
    const [deudaManualOpen, setDeudaManualOpen] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setFilas(await fiadosService.resumen());
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar los fiados');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const texto = buscar.trim().toLowerCase();
    const visibles = filas.filter((f) => texto === '' || f.nombre.toLowerCase().includes(texto));

    const totalPorCobrar = filas.reduce((s, f) => s + f.deuda, 0);
    const masAntigua = filas.length ? Math.max(...filas.map((f) => diasDesde(f.deudaDesde))) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {clienteAbierto !== null && (
                <CuentaClienteModal
                    clienteId={clienteAbierto}
                    onClose={() => setClienteAbierto(null)}
                    onChanged={cargar}
                />
            )}
            {deudaManualOpen && (
                <DeudaManualModal
                    onClose={() => setDeudaManualOpen(false)}
                    onDone={(clienteId) => {
                        setDeudaManualOpen(false);
                        cargar();
                        setClienteAbierto(clienteId);
                    }}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fiados</h1>
                    <p className="text-sm text-gray-500">Lo que te deben tus clientes y sus abonos</p>
                </div>
                <button
                    onClick={() => setDeudaManualOpen(true)}
                    className="bg-white text-gray-800 border border-gray-200 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                    + Pasar deuda del cuaderno
                </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-500 font-bold uppercase">Total por cobrar</p>
                    <p className="text-3xl font-bold text-red-600">{formatSoles(totalPorCobrar)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-500 font-bold uppercase">Clientes que deben</p>
                    <p className="text-3xl font-bold text-gray-900">{filas.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-500 font-bold uppercase">Deuda más antigua</p>
                    <p className="text-3xl font-bold text-gray-900">{filas.length ? textoDias(masAntigua) : '—'}</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                    <span>{error}</span>
                    <button onClick={cargar} className="font-bold underline">Reintentar</button>
                </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <input
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full md:w-1/2 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4 text-right">Fiado</th>
                            <th className="px-6 py-4 text-right">Abonado</th>
                            <th className="px-6 py-4 text-right">Debe</th>
                            <th className="px-6 py-4">Desde</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">Cargando...</td></tr>
                        ) : visibles.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-gray-500">
                                    {filas.length === 0 ? 'Nadie te debe nada 🎉' : 'No hay clientes con ese nombre.'}
                                </td>
                            </tr>
                        ) : (
                            visibles.map((f) => {
                                const dias = diasDesde(f.deudaDesde);
                                const excede = f.limiteCredito !== null && f.deuda > f.limiteCredito;
                                return (
                                    <tr key={f.clienteId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{f.nombre}</p>
                                            <p className="text-xs text-gray-500">
                                                {f.telefono ?? 'Sin teléfono'} · {f.fiadosPendientes} {f.fiadosPendientes === 1 ? 'fiado' : 'fiados'}
                                                {f.limiteCredito !== null && ` · límite ${formatSoles(f.limiteCredito)}`}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-700">{formatSoles(f.totalFiado)}</td>
                                        <td className="px-6 py-4 text-right text-green-600">{formatSoles(f.abonado)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${excede ? 'text-red-700' : 'text-red-600'}`}>
                                            {formatSoles(f.deuda)}
                                            {excede && <span className="block text-[11px] font-medium">supera su límite</span>}
                                        </td>
                                        <td className={`px-6 py-4 ${dias > 30 ? 'text-red-600 font-bold' : dias > 15 ? 'text-amber-600' : 'text-gray-500'}`}>
                                            {textoDias(dias)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setClienteAbierto(f.clienteId)}
                                                className="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800"
                                            >
                                                Ver cuenta / Abonar
                                            </button>
                                        </td>
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
