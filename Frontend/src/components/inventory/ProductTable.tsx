// src/components/inventory/ProductTable.tsx
import { ESTADO_LABEL, UNIDAD_CORTA, type Producto } from '../../types/inventario';
import { formatCantidad, formatSoles } from '../../utils/formato';
import { SlidersHorizontal } from 'lucide-react';

interface ProductTableProps {
    products: Producto[];
    loading: boolean;
    onDelete: (producto: Producto) => void;
    onEdit: (producto: Producto) => void;
    onManage: (producto: Producto) => void;
}

const ESTADO_CLASES = {
    EN_STOCK: 'bg-green-50 text-green-700 border-green-200',
    BAJO_STOCK: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    SIN_STOCK: 'bg-red-50 text-red-700 border-red-200',
} as const;

export function ProductTable({ products, loading, onDelete, onEdit, onManage }: ProductTableProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Costo</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Precio Venta</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                        <tr>
                            <td colSpan={8} className="py-24 text-center text-gray-400 text-sm">Cargando inventario...</td>
                        </tr>
                    ) : products.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="py-24 text-center">
                                <div className="flex flex-col items-center justify-center opacity-60">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3 border border-gray-100">
                                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    </div>
                                    <h3 className="text-gray-600 font-bold text-lg">No hay productos</h3>
                                    <p className="text-gray-400 text-sm mt-1 max-w-xs">No se encontró nada con esos filtros, o tu inventario está vacío.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        products.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.codigoBarras ?? '—'}</td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-lg shadow-sm overflow-hidden">
                                            {p.imagenURL ? (
                                                <img src={p.imagenURL} alt={p.nombre} className="w-full h-full object-contain p-1 bg-white" />
                                            ) : (
                                                '📦'
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-gray-900">{p.nombre}</span>
                                            {/* Presentaciones: Caja x12 · S/ 78.00 */}
                                            {p.presentaciones.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {p.presentaciones.map((pr) => (
                                                        <span key={pr.id} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                                            {pr.nombre} · {formatSoles(pr.precioVenta)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <span className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-medium">{p.categoriaNombre ?? 'Sin categoría'}</span>
                                </td>

                                <td className={`px-6 py-4 text-sm font-medium ${p.stockActual < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatCantidad(p.stockActual)} {UNIDAD_CORTA[p.unidadMedida]}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500">{formatSoles(p.precioCosto)}</td>

                                <td className="px-6 py-4 text-sm font-bold text-green-600">
                                    {formatSoles(p.precioVenta)}
                                    {p.unidadMedida !== 'UND' && <span className="text-xs text-gray-400 font-medium"> /{UNIDAD_CORTA[p.unidadMedida]}</span>}
                                </td>

                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ESTADO_CLASES[p.estadoStock]}`}>
                                        {ESTADO_LABEL[p.estadoStock]}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => onEdit(p)} className="opacity-40 hover:opacity-100 hover:brightness-0 transition-all" title="Editar">
                                            <img src="/icons/edit.svg" alt="Editar" className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => onDelete(p)} className="opacity-40 hover:opacity-100 hover:brightness-0 transition-all" title="Eliminar">
                                            <img src="/icons/trash.svg" alt="Eliminar" className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => onManage(p)} className="text-gray-400 hover:text-black transition" title="Presentaciones, ajustes y kardex">
                                            <SlidersHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}