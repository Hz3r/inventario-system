// src/pages/Settings.tsx
import { useState } from 'react';
import { SeguridadTab } from '../components/settings/SeguridadTab';

export function Settings() {
    // Estado para controlar qué pestaña está activa
    const [activeTab, setActiveTab] = useState('general');

    // Estilo dinámico para las pestañas
    const getTabClass = (tabName: string) => {
        return activeTab === tabName
            ? "px-6 py-3 bg-black text-white font-bold rounded-xl shadow-md transition"
            : "px-6 py-3 bg-white text-gray-600 font-medium hover:bg-gray-50 rounded-xl border border-gray-200 transition";
    };

    return (
        <div className="max-w-4xl space-y-8 animate-fade-in">

            {/* Encabezado */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
                <p className="text-sm text-gray-500 mt-1">Administra los detalles de tu negocio y preferencias del sistema.</p>
            </div>

            {/* Pestañas de Navegación con Iconos SVG */}
            <div className="flex gap-3 border-b border-gray-200 pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 ${getTabClass('general')}`}
                >
                    <img
                        src="/icons/store.svg"
                        alt="Tienda"
                        className={`w-5 h-5 ${activeTab === 'general' ? 'brightness-0 invert' : 'opacity-60'}`}
                    />
                    Perfil de Tienda
                </button>

                <button
                    onClick={() => setActiveTab('facturacion')}
                    className={`flex items-center gap-2 ${getTabClass('facturacion')}`}
                >
                    <img
                        src="/icons/receipt.svg"
                        alt="Facturación"
                        className={`w-5 h-5 ${activeTab === 'facturacion' ? 'brightness-0 invert' : 'opacity-60'}`}
                    />
                    Preferencias de Venta
                </button>

                <button
                    onClick={() => setActiveTab('seguridad')}
                    className={`flex items-center gap-2 ${getTabClass('seguridad')}`}
                >
                    <img
                        src="/icons/lock.svg"
                        alt="Seguridad"
                        className={`w-5 h-5 ${activeTab === 'seguridad' ? 'brightness-0 invert' : 'opacity-60'}`}
                    />
                    Seguridad y Cuenta
                </button>
            </div>

            {/* Contenedor Principal (Cambia según la pestaña) */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">

                {/* --- PESTAÑA: GENERAL --- */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Información del Negocio</h2>

                        {/* Subir Logo */}
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
                                    Subir Logo
                                </button>
                                <p className="text-xs text-gray-500 mt-2">Recomendado: 256x256px, PNG o JPG.</p>
                            </div>
                        </div>

                        {/* Campos de texto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Negocio</label>
                                <input type="text" placeholder="Ej: Minimarket El Buen Vecino" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">RUC / NIT / Documento</label>
                                <input type="text" placeholder="Ej: 20123456789" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección Completa</label>
                                <input type="text" placeholder="Ej: Av. Principal 123, Ciudad" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA: FACTURACIÓN --- */}
                {activeTab === 'facturacion' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Preferencias del Punto de Venta (POS)</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Moneda Principal</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-black outline-none transition">
                                    <option>Soles (S/)</option>
                                    <option>Dólares ($)</option>
                                    <option>Euros (€)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Impuesto por defecto (%)</label>
                                <input type="number" defaultValue="18" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition" />
                                <p className="text-xs text-gray-500 mt-1">Este porcentaje se aplicará a productos afectos.</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mensaje al pie del Ticket</label>
                                <textarea rows={3} placeholder="¡Gracias por su compra! Vuelva pronto." className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA: SEGURIDAD --- */}
                {activeTab === 'seguridad' && <SeguridadTab />}

                {/* BOTÓN DE GUARDAR GENERAL */}
                <div className="mt-10 flex justify-end pt-6 border-t border-gray-100">
                    <button className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 hover:shadow-xl transition transform hover:-translate-y-0.5">
                        Guardar Cambios
                    </button>
                </div>

            </div>
        </div>
    );
}