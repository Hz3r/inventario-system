// src/components/compras/PedidoModal.tsx
import { useEffect, useState } from 'react';
import { comprasService } from '../../services/comprasService';
import { ApiError } from '../../services/api';
import type { Producto } from '../../types/inventario';
import type { Compra, Proveedor } from '../../types/compras';
import { formatSoles } from '../../utils/formato';
import { LineasCompra, aItems, lineasValidas, totalCentLineas, type LineaCompra } from './LineasCompra';

interface Props {
    proveedores: Proveedor[];
    productos: Producto[];
    onClose: () => void;
    onCreated: (compra: Compra, recibirAhora: boolean) => void;
}

export function PedidoModal({ proveedores, productos, onClose, onCreated }: Props) {
    const [proveedorId, setProveedorId] = useState<number | ''>(proveedores.length === 1 ? proveedores[0].id : '');
    const [lineas, setLineas] = useState<LineaCompra[]>([]);
    const [nota, setNota] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const guardar = async (recibirAhora: boolean) => {
        if (proveedorId === '') return;
        setGuardando(true);
        setError(null);
        try {
            const compra = await comprasService.crearCompra({ proveedorId, items: aItems(lineas), nota: nota.trim() || null });
            onCreated(compra, recibirAhora);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo guardar el pedido');
            setGuardando(false);
        }
    };

    const listo = proveedorId !== '' && lineasValidas(lineas) && !guardando;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Nuevo pedido</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5">
                    {proveedores.length === 0 ? (
                        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                            Primero registra un proveedor en la pestaña "Proveedores".
                        </p>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Proveedor</label>
                            <select
                                value={proveedorId}
                                onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full md:w-1/2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-black outline-none"
                            >
                                <option value="">Elige un proveedor...</option>
                                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    )}

                    <LineasCompra lineas={lineas} onChange={setLineas} productos={productos} />

                    <input
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Nota (opcional): ej. llega el jueves"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none"
                    />

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
                </div>

                <div className="p-6 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
                    <p className="text-lg">Total: <b>{formatSoles(totalCentLineas(lineas) / 100)}</b></p>
                    <div className="flex gap-3">
                        <button onClick={() => guardar(false)} disabled={!listo}
                                className="px-5 py-3 rounded-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-40">
                            Guardar pedido
                        </button>
                        <button onClick={() => guardar(true)} disabled={!listo}
                                title="Para cuando la mercadería ya está aquí (ej. compraste en Makro)"
                                className="px-5 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40">
                            Guardar y recibir ahora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
