// src/components/dashboard/RightPanel.tsx
import { useNavigate } from 'react-router-dom';
import { UNIDAD_CORTA } from '../../types/inventario';
import type { ProductoRentable } from '../../types/ganancia';
import type { ProductoAlerta } from '../../types/dashboard';
import { formatCantidad, formatSoles } from '../../utils/formato';

interface RightPanelProps {
    topSemana: ProductoRentable[];
    stockBajo: ProductoAlerta[];
}

export function RightPanel({ topSemana, stockBajo }: RightPanelProps) {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">

            {/* SECCIÓN 1: TOP PRODUCTOS DE LA SEMANA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold text-gray-800 mb-1">Top Productos</h3>
                <p className="text-xs text-gray-400 mb-4">Los que más ganancia dejaron en 7 días</p>

                {topSemana.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-100 rounded-xl min-h-[160px]">
                        <img src="/icons/inventario.svg" className="w-8 h-8 opacity-20 grayscale mb-2" alt="vacio" />
                        <p className="text-gray-500 font-medium">Sin movimientos</p>
                        <p className="text-xs text-gray-400 mt-1">Cuando empieces a vender, aquí aparecerán tus productos estrella.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {topSemana.map((p, i) => (
                            <div key={p.productoId} className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 truncate">{p.nombre}</p>
                                    <p className="text-xs text-gray-500">{formatCantidad(p.cantidad)} vendidos</p>
                                </div>
                                <span className="text-sm font-bold text-green-600 shrink-0">+{formatSoles(p.ganancia)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECCIÓN 2: POR REPONER */}
            {stockBajo.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                    <h3 className="font-bold text-gray-800 mb-4">Por reponer</h3>
                    <div className="space-y-2">
                        {stockBajo.map((p) => (
                            <div key={p.id} className="flex justify-between items-center text-sm gap-3">
                                <span className="text-gray-800 truncate">{p.nombre}</span>
                                <span className={`font-bold shrink-0 ${p.stockActual <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                    {formatCantidad(p.stockActual)} {UNIDAD_CORTA[p.unidadMedida]}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => navigate('/proveedores')}
                            className="mt-4 w-full text-sm font-bold text-gray-700 bg-gray-100 rounded-xl py-2 hover:bg-gray-200">
                        Hacer pedido
                    </button>
                </div>
            )}

            {/* SECCIÓN 3: ACCIONES RÁPIDAS */}
            <div className="bg-gray-100 p-6 rounded-2xl">
                <h3 className="font-bold text-gray-800 mb-4">Gestión Rápida</h3>
                <div className="space-y-3">
                    {[
                        { texto: 'Punto de Venta', sub: 'Cobrar a un cliente', icono: '/icons/venta.svg', ir: () => navigate('/pos') },
                        { texto: 'Crear Producto', sub: 'Nuevo ítem en sistema', icono: '/icons/registro.svg', ir: () => navigate('/inventario', { state: { openModal: true } }) },
                        { texto: 'Ver Reporte', sub: 'Resumen de ventas', icono: '/icons/list.svg', ir: () => navigate('/ventas') },
                    ].map((b) => (
                        <button key={b.texto} onClick={b.ir}
                                className="w-full bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition group">
                            <div className="bg-black p-2 rounded-md group-hover:bg-gray-800 transition">
                                <img src={b.icono} className="w-4 h-4 brightness-0 invert" alt="" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">{b.texto}</p>
                                <p className="text-[10px] text-gray-500">{b.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
