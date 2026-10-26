// src/components/compras/ProveedorModal.tsx
import { useEffect, useState } from 'react';
import { comprasService } from '../../services/comprasService';
import { ApiError } from '../../services/api';
import type { Proveedor, ProveedorRequest } from '../../types/compras';

interface Props {
    isOpen: boolean;
    proveedor: Proveedor | null;     // null = nuevo
    onClose: () => void;
    onSaved: (p: Proveedor) => void;
}

const VACIO = { nombre: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '' };

export function ProveedorModal({ isOpen, proveedor, onClose, onSaved }: Props) {
    const [form, setForm] = useState(VACIO);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setErrores({});
        setError(null);
        setForm(proveedor ? {
            nombre: proveedor.nombre, ruc: proveedor.ruc ?? '', contacto: proveedor.contacto ?? '',
            telefono: proveedor.telefono ?? '', email: proveedor.email ?? '', direccion: proveedor.direccion ?? '',
        } : VACIO);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, proveedor]);

    if (!isOpen) return null;

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setErrores({});
        setError(null);
        const nulo = (s: string) => s.trim() || null;
        const data: ProveedorRequest = {
            nombre: form.nombre, ruc: nulo(form.ruc), contacto: nulo(form.contacto),
            telefono: nulo(form.telefono), email: nulo(form.email), direccion: nulo(form.direccion),
        };
        try {
            onSaved(proveedor
                ? await comprasService.actualizarProveedor(proveedor.id, data)
                : await comprasService.crearProveedor(data));
            onClose();
        } catch (err) {
            if (err instanceof ApiError) { setError(err.message); setErrores(err.campos ?? {}); }
            else setError('No se pudo guardar el proveedor');
        } finally {
            setGuardando(false);
        }
    };

    const campo = (key: keyof typeof VACIO, label: string, placeholder: string, extra = '') => (
        <div className={extra}>
            <label className="block text-sm font-semibold text-gray-600 mb-2">{label}</label>
            <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className={`w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-black outline-none ${errores[key] ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errores[key] && <p className="text-xs text-red-600 mt-1">{errores[key]}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <form onSubmit={guardar} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    {error && <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
                    {campo('nombre', 'Nombre o razón social', 'Ej: Backus / Distribuidora del Sur', 'md:col-span-2')}
                    {campo('ruc', 'RUC (opcional)', '20xxxxxxxxx')}
                    {campo('contacto', 'Contacto', 'Ej: Juan (vendedor)')}
                    {campo('telefono', 'Teléfono', '987654321')}
                    {campo('email', 'Correo (opcional)', 'ventas@proveedor.com')}
                    {campo('direccion', 'Dirección (opcional)', 'Av. ...', 'md:col-span-2')}
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Cancelar</button>
                    <button type="submit" disabled={guardando} className="px-6 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}
