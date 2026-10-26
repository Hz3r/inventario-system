// src/components/compras/CompraModal.tsx
// Ver una compra; si todavía es PEDIDO: recibirla (sube el stock) o cancelarla.
import { useEffect, useState } from 'react';
import { comprasService } from '../../services/comprasService';
import { ApiError } from '../../services/api';
import { UNIDAD_CORTA, type Producto } from '../../types/inventario';
import {
    ESTADO_COMPRA_LABEL, METODO_COMPRA_LABEL, type Compra, type MetodoPagoCompra,
} from '../../types/compras';
import { formatCantidad, formatFechaHora, formatSoles } from '../../utils/formato';
import { LineasCompra, aItems, lineasValidas, nuevaLineaKey, totalCentLineas, type LineaCompra } from './LineasCompra';
import { refrescarNotificaciones } from '../notificaciones/useNotificaciones';

interface Props {
    compraId: number;
    productos: Producto[];
    onClose: () => void;
    onChanged: () => void;
}

const METODOS: MetodoPagoCompra[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'];

export function CompraModal({ compraId, productos, onClose, onChanged }: Props) {
    const [compra, setCompra] = useState<Compra | null>(null);
    const [lineas, setLineas] = useState<LineaCompra[]>([]);
    const [metodo, setMetodo] = useState<MetodoPagoCompra>('EFECTIVO');
    const [deCaja, setDeCaja] = useState(true);
    const [actualizarCostos, setActualizarCostos] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        comprasService.obtenerCompra(compraId)
            .then((c) => {
                setCompra(c);
                // Las líneas editables arrancan con lo pedido
                setLineas(c.items.map((it) => {
                    const p = productos.find((x) => x.id === it.productoId);
                    return {
                        key: nuevaLineaKey(),
                        productoId: it.productoId,
                        productoNombre: it.productoNombre,
                        unidadMedida: it.unidadMedida,
                        presentaciones: p?.presentaciones ?? [],
                        costoBase: p?.precioCosto ?? null,
                        presentacionId: it.presentacionId,
                        cantidad: String(it.cantidad),
                        costo: it.costoUnitario.toFixed(2),
                    };
                }));
            })
            .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudo cargar la compra'));
        return () => { document.body.style.overflow = 'unset'; };
    }, [compraId, productos]);

    const recibir = async () => {
        setGuardando(true);
        setError(null);
        try {
            setCompra(await comprasService.recibirCompra(compraId, {
                items: aItems(lineas),
                metodoPago: metodo,
                deCaja: metodo === 'EFECTIVO' && deCaja,
                actualizarCostos,
                nota: null,
            }));
            refrescarNotificaciones();
            onChanged();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo recibir la compra');
        } finally {
            setGuardando(false);
        }
    };

    const cancelar = async () => {
        if (!confirm('¿Cancelar este pedido? No se podrá recibir después.')) return;
        setGuardando(true);
        try {
            setCompra(await comprasService.cancelarCompra(compraId));
            onChanged();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cancelar');
        } finally {
            setGuardando(false);
        }
    };

    const pendiente = compra?.estado === 'PEDIDO';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Compra #{compraId} {compra && <span className="text-gray-500 font-medium">· {compra.proveedorNombre}</span>}
                        </h2>
                        {compra && (
                            <p className="text-sm text-gray-500 mt-1">
                                {ESTADO_COMPRA_LABEL[compra.estado]} · pedido el {formatFechaHora(compra.fechaPedido)}
                                {compra.fechaRecepcion && ` · recibido el ${formatFechaHora(compra.fechaRecepcion)}`}
                                {compra.nota && ` · ${compra.nota}`}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5">
                    {!compra && !error && <p className="text-gray-400">Cargando...</p>}

                    {/* ---------- Pendiente: confirmar lo que llegó ---------- */}
                    {compra && pendiente && (
                        <>
                            <p className="text-sm text-gray-600">
                                Revisa lo que <b>realmente llegó</b>: corrige cantidades o costos si cambiaron. Al confirmar, el stock sube.
                            </p>
                            <LineasCompra lineas={lineas} onChange={setLineas} productos={productos} />

                            <div>
                                <p className="text-sm font-bold text-gray-700 mb-2">¿Cómo le pagaste al proveedor?</p>
                                <div className="flex flex-wrap gap-2">
                                    {METODOS.map((m) => (
                                        <button key={m} onClick={() => setMetodo(m)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                                                    metodo === m ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                            {METODO_COMPRA_LABEL[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {metodo === 'EFECTIVO' && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={deCaja} onChange={(e) => setDeCaja(e.target.checked)} className="w-4 h-4 accent-black" />
                                        Salió del cajón (se descuenta en el cierre de caja)
                                    </label>
                                )}
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={actualizarCostos} onChange={(e) => setActualizarCostos(e.target.checked)} className="w-4 h-4 accent-black" />
                                    Actualizar el precio de costo de los productos con esta compra
                                </label>
                            </div>
                        </>
                    )}

                    {/* ---------- Recibida o cancelada: solo lectura ---------- */}
                    {compra && !pendiente && (
                        <>
                            <div className="border border-gray-100 rounded-xl overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Producto</th>
                                        <th className="px-4 py-2 text-right">Cantidad</th>
                                        <th className="px-4 py-2 text-right">Entró al stock</th>
                                        <th className="px-4 py-2 text-right">Costo c/u</th>
                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {compra.items.map((it, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 font-medium">{it.productoNombre}{it.presentacionNombre && <span className="text-gray-400"> · {it.presentacionNombre}</span>}</td>
                                            <td className="px-4 py-2 text-right">{formatCantidad(it.cantidad)}</td>
                                            <td className="px-4 py-2 text-right text-gray-500">
                                                {compra.estado === 'RECIBIDO' ? `+${formatCantidad(it.cantidadBase)} ${UNIDAD_CORTA[it.unidadMedida]}` : '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right">{formatSoles(it.costoUnitario)}</td>
                                            <td className="px-4 py-2 text-right font-bold">{formatSoles(it.subtotal)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            {compra.metodoPago && (
                                <p className="text-sm text-gray-600">
                                    Pagado: <b>{METODO_COMPRA_LABEL[compra.metodoPago]}</b>{compra.deCaja && ' (del cajón)'}
                                </p>
                            )}
                        </>
                    )}

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
                </div>

                <div className="p-6 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
                    <p className="text-lg">
                        Total: <b>{formatSoles(pendiente ? totalCentLineas(lineas) / 100 : compra?.total ?? 0)}</b>
                    </p>
                    {pendiente ? (
                        <div className="flex gap-3">
                            <button onClick={cancelar} disabled={guardando} className="px-5 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50">
                                Cancelar pedido
                            </button>
                            <button onClick={recibir} disabled={guardando || !lineasValidas(lineas)}
                                    className="px-5 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40">
                                {guardando ? 'Guardando...' : 'Confirmar recepción'}
                            </button>
                        </div>
                    ) : (
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800">Cerrar</button>
                    )}
                </div>
            </div>
        </div>
    );
}
