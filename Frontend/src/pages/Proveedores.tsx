// src/pages/Proveedores.tsx
import { useCallback, useEffect, useState } from 'react';
import { comprasService } from '../services/comprasService';
import { inventarioService } from '../services/inventarioService';
import { ApiError } from '../services/api';
import type { Producto } from '../types/inventario';
import { ESTADO_COMPRA_LABEL, METODO_COMPRA_LABEL, type Compra, type EstadoCompra, type Proveedor } from '../types/compras';
import { formatFechaHora, formatSoles } from '../utils/formato';
import { ProveedorModal } from '../components/compras/ProveedorModal';
import { PedidoModal } from '../components/compras/PedidoModal';
import { CompraModal } from '../components/compras/CompraModal';

type Vista = 'compras' | 'proveedores';

const ESTADO_CLASES: Record<EstadoCompra, string> = {
    PEDIDO: 'bg-amber-50 text-amber-700 border-amber-200',
    RECIBIDO: 'bg-green-50 text-green-700 border-green-200',
    CANCELADO: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function Proveedores() {
    const [vista, setVista] = useState<Vista>('compras');
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [compras, setCompras] = useState<Compra[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [filtroEstado, setFiltroEstado] = useState<EstadoCompra | 'TODOS'>('TODOS');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modales
    const [proveedorModal, setProveedorModal] = useState<{ open: boolean; proveedor: Proveedor | null }>({ open: false, proveedor: null });
    const [pedidoOpen, setPedidoOpen] = useState(false);
    const [compraAbierta, setCompraAbierta] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        setError(null);
        try {
            const [prov, comp, prods] = await Promise.all([
                comprasService.listarProveedores(),
                comprasService.listarCompras(),
                inventarioService.listarProductos(),
            ]);
            setProveedores(prov);
            setCompras(comp);
            setProductos(prods);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar la información');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const desactivarProveedor = async (p: Proveedor) => {
        if (!confirm(`¿Eliminar a ${p.nombre}? Sus compras anteriores se conservan.`)) return;
        try {
            await comprasService.desactivarProveedor(p.id);
            setProveedores((prev) => prev.filter((x) => x.id !== p.id));
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'No se pudo eliminar');
        }
    };

    const comprasVisibles = compras.filter((c) => filtroEstado === 'TODOS' || c.estado === filtroEstado);
    const porLlegar = compras.filter((c) => c.estado === 'PEDIDO');

    const tabCls = (activo: boolean) =>
        activo
            ? 'bg-black text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md transition'
            : 'bg-white text-gray-700 border border-gray-200 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition';

    return (
        <div className="space-y-6 animate-fade-in">
            <ProveedorModal
                isOpen={proveedorModal.open}
                proveedor={proveedorModal.proveedor}
                onClose={() => setProveedorModal({ open: false, proveedor: null })}
                onSaved={cargar}
            />
            {pedidoOpen && (
                <PedidoModal
                    proveedores={proveedores}
                    productos={productos}
                    onClose={() => setPedidoOpen(false)}
                    onCreated={(compra, recibirAhora) => {
                        setPedidoOpen(false);
                        cargar();
                        if (recibirAhora) setCompraAbierta(compra.id);
                    }}
                />
            )}
            {compraAbierta !== null && (
                <CompraModal
                    compraId={compraAbierta}
                    productos={productos}
                    onClose={() => setCompraAbierta(null)}
                    onChanged={cargar}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Proveedores y Compras</h1>
                    <p className="text-sm text-gray-500">Pedidos a proveedores y entrada de mercadería</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setVista('compras')} className={tabCls(vista === 'compras')}>Pedidos y compras</button>
                    <button onClick={() => setVista('proveedores')} className={tabCls(vista === 'proveedores')}>Proveedores ({proveedores.length})</button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex justify-between">
                    <span>{error}</span>
                    <button onClick={cargar} className="font-bold underline">Reintentar</button>
                </div>
            )}

            {vista === 'compras' ? (
                <>
                    {porLlegar.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                            📦 Tienes <b>{porLlegar.length}</b> {porLlegar.length === 1 ? 'pedido por llegar' : 'pedidos por llegar'} por{' '}
                            <b>{formatSoles(porLlegar.reduce((s, c) => s + c.total, 0))}</b>. Ábrelo y dale "Confirmar recepción" cuando llegue.
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {(['TODOS', 'PEDIDO', 'RECIBIDO', 'CANCELADO'] as const).map((e) => (
                                <button key={e} onClick={() => setFiltroEstado(e)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                                            filtroEstado === e ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                                        }`}>
                                    {e === 'TODOS' ? 'Todos' : ESTADO_COMPRA_LABEL[e]}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setPedidoOpen(true)}
                                className="bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition">
                            + Nuevo pedido
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">#</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">Productos</th>
                                    <th className="px-6 py-4">Pago</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4" />
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="py-16 text-center text-gray-400">Cargando...</td></tr>
                                ) : comprasVisibles.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center text-gray-500">No hay compras. Crea tu primer pedido con "+ Nuevo pedido".</td></tr>
                                ) : (
                                    comprasVisibles.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-800">#{c.id}</td>
                                            <td className="px-6 py-4 text-gray-500">{formatFechaHora(c.fechaRecepcion ?? c.fechaPedido)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{c.proveedorNombre}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {c.items.slice(0, 2).map((it) => it.productoNombre).join(', ')}
                                                {c.items.length > 2 && ` y ${c.items.length - 2} más`}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{c.metodoPago ? METODO_COMPRA_LABEL[c.metodoPago] : '—'}</td>
                                            <td className="px-6 py-4 text-right font-bold">{formatSoles(c.total)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ESTADO_CLASES[c.estado]}`}>
                                                    {c.estado === 'PEDIDO' ? 'Por llegar' : ESTADO_COMPRA_LABEL[c.estado]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setCompraAbierta(c.id)}
                                                        className={c.estado === 'PEDIDO'
                                                            ? 'px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800'
                                                            : 'text-gray-400 hover:text-black font-medium text-xs'}>
                                                    {c.estado === 'PEDIDO' ? 'Recibir' : 'Ver detalle'}
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
                <>
                    <div className="flex justify-end">
                        <button onClick={() => setProveedorModal({ open: true, proveedor: null })}
                                className="bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition">
                            + Nuevo proveedor
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">RUC</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Teléfono</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {proveedores.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-gray-500">Todavía no hay proveedores.</td></tr>
                                ) : (
                                    proveedores.map((p) => {
                                        const tel = (p.telefono ?? '').replace(/\D/g, '');
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900">{p.nombre}</p>
                                                    {p.direccion && <p className="text-xs text-gray-500">{p.direccion}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-mono">{p.ruc ?? '—'}</td>
                                                <td className="px-6 py-4 text-gray-600">{p.contacto ?? '—'}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {p.telefono ?? '—'}
                                                    {tel.length >= 9 && (
                                                        <a href={`https://wa.me/51${tel.slice(-9)}`} target="_blank" rel="noreferrer"
                                                           className="ml-2 text-xs font-bold text-green-700 hover:underline">WhatsApp</a>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-4">
                                                    <button onClick={() => setProveedorModal({ open: true, proveedor: p })}
                                                            className="text-xs font-bold text-gray-500 hover:text-black">Editar</button>
                                                    <button onClick={() => desactivarProveedor(p)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-700">Eliminar</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
