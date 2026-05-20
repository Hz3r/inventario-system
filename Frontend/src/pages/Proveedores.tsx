import React, { useState } from 'react';
import { Proveedor } from '../types/models';

export default function Proveedores() {
    // Datos de prueba
    const [proveedores] = useState<Proveedor[]>([
        { id: '1', nombre: 'Distribuidora del Sur', ruc: '20123456789', contacto: 'Juan Pérez', telefono: '987654321' },
        { id: '2', nombre: 'Macro Alimentos', ruc: '20987654321', contacto: 'Ana Gómez', telefono: '912345678' }
    ]);

    // Estados para controlar qué modal está abierto
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);
    const [proveedorAEliminar, setProveedorAEliminar] = useState<Proveedor | null>(null);

    return (
        <div className="p-6 relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + Nuevo Proveedor
                </button>
            </div>

            {/* Tabla Principal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                    <tr>
                        <th className="p-4">Nombre / Empresa</th>
                        <th className="p-4">RUC</th>
                        <th className="p-4">Contacto</th>
                        <th className="p-4">Teléfono</th>
                        <th className="p-4 text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {proveedores.map((prov) => (
                        <tr key={prov.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium text-gray-800">{prov.nombre}</td>
                            <td className="p-4 text-gray-600">{prov.ruc}</td>
                            <td className="p-4 text-gray-600">{prov.contacto}</td>
                            <td className="p-4 text-gray-600">{prov.telefono}</td>
                            <td className="p-4 text-right space-x-3">
                                <button
                                    onClick={() => setProveedorAEditar(prov)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => setProveedorAEliminar(prov)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL 1: NUEVO PROVEEDOR */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Agregar Proveedor</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            {/* Le agregamos el onClick para cerrar el modal al Guardar */}
                            <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDITAR PROVEEDOR */}
            {proveedorAEditar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Editar Proveedor</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                                <input type="text" defaultValue={proveedorAEditar.nombre} className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                <input type="text" defaultValue={proveedorAEditar.ruc} className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                                    <input type="text" defaultValue={proveedorAEditar.contacto} className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input type="text" defaultValue={proveedorAEditar.telefono} className="w-full border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setProveedorAEditar(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            {/* Le agregamos el onClick para cerrar el modal al Actualizar */}
                            <button onClick={() => setProveedorAEditar(null)} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">Actualizar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: ELIMINAR PROVEEDOR */}
            {proveedorAEliminar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-red-500 text-2xl font-bold">!</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-gray-800">¿Eliminar proveedor?</h2>
                        <p className="text-gray-500 mb-6">
                            Estás a punto de eliminar a <span className="font-semibold text-gray-700">{proveedorAEliminar.nombre}</span>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setProveedorAEliminar(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full">Cancelar</button>
                            {/* Le agregamos el onClick para cerrar el modal al confirmar eliminar */}
                            <button onClick={() => setProveedorAEliminar(null)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors w-full">Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}