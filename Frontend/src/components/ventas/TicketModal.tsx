// src/components/ventas/TicketModal.tsx
// Detalle de una venta: qué se vendió, cómo se pagó, reimprimir y anular.
import { useEffect, useState } from 'react';
import { posService } from '../../services/posService';
import { ApiError } from '../../services/api';
import { METODO_LABEL, type Venta } from '../../types/pos';
import { formatCantidad, formatFechaHora, formatSoles } from '../../utils/formato';
import { imprimirTicket } from '../../utils/ticket';

interface TicketModalProps {
    venta: Venta | null;                 // null = cerrado
    onClose: () => void;
    onAnulada: (venta: Venta) => void;   // la lista se actualiza
}

export function TicketModal({ venta, onClose, onAnulada }: TicketModalProps) {
    const [anulando, setAnulando] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const ventaId = venta?.id;
    useEffect(() => {
        if (ventaId === undefined) return;
        setAnulando(false);
        setMotivo('');
        setError(null);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [ventaId]);

    if (!venta) return null;

    const anular = async () => {
        setGuardando(true);
        setError(null);
        try {
            const anulada = await posService.anularVenta(venta.id, motivo.trim());
            onAnulada(anulada);
            setAnulando(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo anular la venta');
        } finally {
            setGuardando(false);
        }
    };

    const esAnulada = venta.estado === 'ANULADA';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-3xl shadow-2xl rounded-xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">

                {/* ENCABEZADO */}
                <div className="bg-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Ticket</p>
                        <p className="text-xl font-bold text-gray-800">#{String(venta.numero).padStart(6, '0')}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Fecha</p>
                        <p className="text-gray-800 font-medium">{formatFechaHora(venta.fecha)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Cliente</p>
                        <p className="text-gray-800 font-medium">{venta.clienteNombre ?? 'Cliente general'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        esAnulada ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'
                    }`}>
                        {esAnulada ? 'Anulada' : 'Completada'}
                    </span>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    {esAnulada && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            <b>Venta anulada.</b> Motivo: {venta.motivoAnulacion ?? '—'}. El stock fue devuelto al inventario.
                        </div>
                    )}

                    {/* DETALLE */}
                    <table className="w-full text-left">
                        <thead>
                        <tr className="text-sm font-bold text-gray-800 border-b-2 border-gray-100">
                            <th className="py-3 w-20">Cant.</th>
                            <th className="py-3">Producto</th>
                            <th className="py-3 text-right">P. Unit</th>
                            <th className="py-3 text-right">Desc.</th>
                            <th className="py-3 text-right">Total</th>
                        </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                        {venta.items.map((it, i) => (
                            <tr key={i} className="border-b border-gray-50">
                                <td className="py-3 font-bold">{formatCantidad(it.cantidad)}</td>
                                <td className="py-3">{it.descripcion}</td>
                                <td className="py-3 text-right">{formatSoles(it.precioUnitario)}</td>
                                <td className="py-3 text-right">{it.descuento > 0 ? `-${formatSoles(it.descuento)}` : '—'}</td>
                                <td className="py-3 text-right font-medium">{formatSoles(it.subtotal)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* TOTALES Y PAGOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1 text-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pagos</p>
                            {venta.pagos.map((p, i) => (
                                <div key={i} className="flex justify-between">
                                    <span className="text-gray-600">
                                        {METODO_LABEL[p.metodo]}{p.referencia && <span className="text-gray-400"> · {p.referencia}</span>}
                                    </span>
                                    <span className="font-medium">{formatSoles(p.monto)}</span>
                                </div>
                            ))}
                            {venta.efectivoRecibido !== null && (
                                <div className="flex justify-between text-gray-500">
                                    <span>Recibido / Vuelto</span>
                                    <span>{formatSoles(venta.efectivoRecibido)} / {formatSoles(venta.vuelto)}</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 text-sm">
                            {venta.descuento > 0 && (
                                <>
                                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatSoles(venta.subtotal)}</span></div>
                                    <div className="flex justify-between text-gray-600"><span>Descuento</span><span>-{formatSoles(venta.descuento)}</span></div>
                                </>
                            )}
                            <div className="flex justify-between items-end pt-2">
                                <span className="font-bold text-gray-500">TOTAL</span>
                                <span className={`text-3xl font-bold ${esAnulada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {formatSoles(venta.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ANULAR */}
                    {anulando && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                            <p className="text-sm font-bold text-red-800">¿Por qué se anula esta venta?</p>
                            <input
                                autoFocus
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej: se cobró dos veces / el cliente devolvió todo"
                                className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-red-400 outline-none"
                            />
                            <p className="text-xs text-red-700">
                                El stock vuelve al inventario y, si se fió una parte, esa deuda se anula. No se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setAnulando(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-red-100">
                                    Cancelar
                                </button>
                                <button
                                    onClick={anular}
                                    disabled={!motivo.trim() || guardando}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40"
                                >
                                    {guardando ? 'Anulando...' : 'Sí, anular venta'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}
                </div>

                {/* ACCIONES */}
                <div className="p-6 border-t border-gray-100 flex justify-between gap-3">
                    {!esAnulada && !anulando ? (
                        <button onClick={() => setAnulando(true)} className="px-5 py-2.5 rounded-xl font-bold text-red-600 hover:bg-red-50">
                            Anular venta
                        </button>
                    ) : <span />}
                    <button
                        onClick={() => imprimirTicket(venta)}
                        className="px-6 py-2.5 rounded-xl font-bold text-white bg-black hover:bg-gray-800 shadow-lg"
                    >
                        Reimprimir ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
