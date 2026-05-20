// src/components/dashboard/RightPanel.tsx
import { useNavigate } from 'react-router-dom';

export function RightPanel() {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">

            {/* SECCIÓN 1: TOP PRODUCTOS (ESTADO VACÍO) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col">
                <h3 className="font-bold text-gray-800 mb-4">Top Productos</h3>

                {/* Mensaje de "No hay datos" */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-100 rounded-xl">
                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <img src="/icons/inventario.svg" className="w-8 h-8 opacity-20 grayscale" alt="vacio" />
                    </div>
                    <p className="text-gray-500 font-medium">Sin movimientos</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Cuando empieces a vender, aquí aparecerán tus productos estrella.
                    </p>
                </div>
            </div>

            {/* SECCIÓN 2: ACCIONES RÁPIDAS (Gestión de Inventario y Reportes) */}
            <div className="bg-gray-100 p-6 rounded-2xl">
                <h3 className="font-bold text-gray-800 mb-4">Gestión Rápida</h3>
                <div className="space-y-3">

                    {/* BOTÓN 1: Crear Producto */}
                    <button
                        onClick={() => navigate('/inventario', { state: { openModal: true } })}
                        className="w-full bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition group"
                    >
                        <div className="bg-black p-2 rounded-md group-hover:bg-gray-800 transition">
                            <img src="/icons/registro.svg" className="w-4 h-4 brightness-0 invert" alt="crear" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold">Crear Producto</p>
                            <p className="text-[10px] text-gray-500">Nuevo ítem en sistema</p>
                        </div>
                    </button>

                    {/* BOTÓN 2: Ver Reporte (AHORA LLEVA A VENTAS) */}
                    <button
                        onClick={() => navigate('/ventas')} // <--- CORREGIDO: Viaja a la pantalla de ventas
                        className="w-full bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition group"
                    >
                        <div className="bg-black p-2 rounded-md group-hover:bg-gray-800 transition">
                            <img src="/icons/list.svg" className="w-4 h-4 brightness-0 invert" alt="reporte" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold">Ver Reporte</p>
                            <p className="text-[10px] text-gray-500">Resumen de ventas</p>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
}