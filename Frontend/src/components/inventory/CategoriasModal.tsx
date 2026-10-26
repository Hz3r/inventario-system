// src/components/inventory/CategoriasModal.tsx
import { useEffect, useState } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { ApiError } from '../../services/api';
import type { Categoria } from '../../types/inventario';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    categorias: Categoria[];
    onChanged: () => void;   // la página vuelve a cargar categorías y productos
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-black outline-none transition text-sm';

export function CategoriasModal({ isOpen, onClose, categorias, onChanged }: Props) {
    const [nueva, setNueva] = useState('');
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setNueva('');
        setEditandoId(null);
        setError(null);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Ejecuta una acción contra el backend mostrando el error si falla
    const ejecutar = async (accion: () => Promise<unknown>) => {
        setOcupado(true);
        setError(null);
        try {
            await accion();
            onChanged();
            return true;
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Ocurrió un error');
            return false;
        } finally {
            setOcupado(false);
        }
    };

    const crear = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nueva.trim()) return;
        if (await ejecutar(() => inventarioService.crearCategoria(nueva))) setNueva('');
    };

    const guardarNombre = async (id: number) => {
        if (await ejecutar(() => inventarioService.renombrarCategoria(id, editNombre))) setEditandoId(null);
    };

    const eliminar = async (c: Categoria) => {
        if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
        await ejecutar(() => inventarioService.eliminarCategoria(c.id));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5">
                    {/* Nueva */}
                    <form onSubmit={crear} className="flex gap-3">
                        <input value={nueva} onChange={(e) => setNueva(e.target.value)}
                               placeholder="Nueva categoría (ej: Licores)" className={inputCls} autoFocus />
                        <button type="submit" disabled={ocupado || !nueva.trim()}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40">
                            Agregar
                        </button>
                    </form>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}

                    {/* Lista */}
                    {categorias.length === 0 ? (
                        <p className="text-sm text-gray-500">Todavía no hay categorías.</p>
                    ) : (
                        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                            {categorias.map((c) => (
                                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    {editandoId === c.id ? (
                                        <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                                               onKeyDown={(e) => {
                                                   if (e.key === 'Enter') guardarNombre(c.id);
                                                   if (e.key === 'Escape') setEditandoId(null);
                                               }}
                                               className={inputCls} autoFocus />
                                    ) : (
                                        <div>
                                            <p className="font-bold text-gray-900">{c.nombre}</p>
                                            <p className="text-xs text-gray-500">
                                                {c.productos === 1 ? '1 producto' : `${c.productos} productos`}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 shrink-0">
                                        {editandoId === c.id ? (
                                            <>
                                                <button onClick={() => guardarNombre(c.id)} disabled={ocupado}
                                                        className="text-xs font-bold text-green-600 hover:text-green-800">Guardar</button>
                                                <button onClick={() => setEditandoId(null)}
                                                        className="text-xs font-bold text-gray-500 hover:text-black">Cancelar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditandoId(c.id); setEditNombre(c.nombre); setError(null); }}
                                                        className="text-xs font-bold text-gray-500 hover:text-black">Renombrar</button>
                                                <button onClick={() => eliminar(c)} disabled={ocupado || c.productos > 0}
                                                        title={c.productos > 0 ? 'Tiene productos: muévelos a otra categoría primero' : undefined}
                                                        className="text-xs font-bold text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed">
                                                    Eliminar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}