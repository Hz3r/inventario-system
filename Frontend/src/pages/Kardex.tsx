import React, { useState, useRef, useEffect } from 'react';
import { KardexEntry } from '../types/models';

export default function Kardex() {
    const [codigoBarras, setCodigoBarras] = useState('');
    const [movimientos, setMovimientos] = useState<KardexEntry[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Mantiene el foco en el input para que la pistola siempre funcione
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // La pistola lectora de barras actúa como un teclado que presiona "Enter" al final
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarHistorialProducto(codigoBarras);
            setCodigoBarras(''); // Limpia el input para la siguiente lectura
        }
    };

    const buscarHistorialProducto = (codigo: string) => {
        console.log("Buscando en backend el código:", codigo);
        // Aquí harías el fetch a tu backend en Spring Boot
        // Ejemplo de datos simulados que te devolvería el backend:
        setMovimientos([
            { id: '1', fecha: '2023-10-26 08:30 AM', tipo: 'ENTRADA', productoId: codigo, productoNombre: 'Galletas Casino', cantidad: 50, saldo: 50, motivo: 'Compra a Macro Alimentos' },
            { id: '2', fecha: '2023-10-26 10:15 AM', tipo: 'SALIDA', productoId: codigo, productoNombre: 'Galletas Casino', cantidad: 2, saldo: 48, motivo: 'Venta #0045' },
        ]);
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Kardex de Inventario</h1>
                <p className="text-gray-500 mb-4">Escanea un producto para ver su historial completo de entradas y salidas.</p>

                {/* INPUT PREPARADO PARA PISTOLA LECTORA */}
                <input
                    ref={inputRef}
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="[|] Escanea el código de barras aquí..."
                    className="w-full md:w-1/2 px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-lg shadow-sm"
                    autoFocus
                />
            </div>

            {movimientos.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-700">
                            Historial de: <span className="text-blue-600">{movimientos[0].productoNombre}</span>
                        </h2>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                        <tr className="border-b border-gray-100 text-sm text-gray-500">
                            <th className="p-4 font-medium">Fecha y Hora</th>
                            <th className="p-4 font-medium">Tipo</th>
                            <th className="p-4 font-medium">Motivo</th>
                            <th className="p-4 font-medium text-center">Cantidad</th>
                            <th className="p-4 font-medium text-center">Saldo Actual</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {movimientos.map((mov) => (
                            <tr key={mov.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-600">{mov.fecha}</td>
                                <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        mov.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {mov.tipo}
                    </span>
                                </td>
                                <td className="p-4 text-gray-600">{mov.motivo}</td>
                                <td className={`p-4 text-center font-bold ${
                                    mov.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                                </td>
                                <td className="p-4 text-center font-bold text-gray-800">{mov.saldo}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">Esperando lectura de código de barras...</p>
                </div>
            )}
        </div>
    );
}