import React, { useState } from 'react';
import { Fiado } from '../types/models';

export default function Fiados() {
    const [fiados] = useState<Fiado[]>([
        { id: '1', cliente: 'María (Bodega Esquina)', montoTotal: 150.50, montoPagado: 50.00, fechaCreacion: '2023-10-25', estado: 'PARCIAL' },
    ]);

    // Estado para controlar a quién se le está pagando
    const [fiadoSeleccionado, setFiadoSeleccionado] = useState<Fiado | null>(null);

    return (
        <div className="p-6 relative">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Fiados</h1>
                <p className="text-gray-500 text-sm mt-1">Control de cuentas por cobrar a clientes</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                    <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Deuda Total</th>
                        <th className="p-4">Abonado</th>
                        <th className="p-4">Restante</th>
                        <th className="p-4 text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {fiados.map((fiado) => (
                        <tr key={fiado.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium text-gray-800">{fiado.cliente}</td>
                            <td className="p-4 font-semibold">S/ {fiado.montoTotal.toFixed(2)}</td>
                            <td className="p-4 text-green-600">S/ {fiado.montoPagado.toFixed(2)}</td>
                            <td className="p-4 text-red-600 font-bold">S/ {(fiado.montoTotal - fiado.montoPagado).toFixed(2)}</td>
                            <td className="p-4 text-right">
                                <button
                                    onClick={() => setFiadoSeleccionado(fiado)}
                                    className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                    Registrar Pago
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Pago */}
            {fiadoSeleccionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl">
                        <h2 className="text-xl font-bold mb-2 text-gray-800">Registrar Pago</h2>
                        <p className="text-sm text-gray-500 mb-4">Cliente: <span className="font-semibold text-gray-800">{fiadoSeleccionado.cliente}</span></p>

                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-center">
                            Deuda pendiente: <span className="font-bold text-lg">S/ {(fiadoSeleccionado.montoTotal - fiadoSeleccionado.montoPagado).toFixed(2)}</span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a abonar (S/)</label>
                            <input type="number" step="0.10" placeholder="Ej: 20.00" className="w-full border border-gray-300 rounded-lg p-2 text-lg focus:border-blue-500 focus:outline-none" />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setFiadoSeleccionado(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            <button className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">Confirmar Pago</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}