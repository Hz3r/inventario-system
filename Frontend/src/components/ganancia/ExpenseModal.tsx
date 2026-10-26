// src/components/ganancia/ExpenseModal.tsx
import { useEffect, useState } from 'react';
import { gananciaService } from '../../services/gananciaService';
import { ApiError } from '../../services/api';
import { METODO_LABEL, type MetodoPago } from '../../types/pos';
import { CATEGORIA_GASTO_LABEL, type CategoriaGasto, type Gasto } from '../../types/ganancia';
import { fechaISO } from '../../utils/formato';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (gasto: Gasto) => void;
}

const METODOS: MetodoPago[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

export function ExpenseModal({ isOpen, onClose, onSaved }: ExpenseModalProps) {
    const hoy = fechaISO(new Date());
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categoria, setCategoria] = useState<CategoriaGasto>('SERVICIOS');
    const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
    const [fecha, setFecha] = useState(hoy);
    const [deCaja, setDeCaja] = useState(true);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    // Bloquear el scroll del fondo y limpiar el formulario al abrir
    useEffect(() => {
        if (!isOpen) return;
        setMonto('');
        setDescripcion('');
        setCategoria('SERVICIOS');
        setMetodo('EFECTIVO');
        setFecha(fechaISO(new Date()));
        setDeCaja(true);
        setErrores({});
        setError(null);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const aplicaCajon = metodo === 'EFECTIVO' && fecha === hoy;

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setErrores({});
        setError(null);
        try {
            const gasto = await gananciaService.registrarGasto({
                categoria,
                descripcion: descripcion.trim() || null,
                monto: Number(monto),
                metodoPago: metodo,
                fecha: fecha === hoy ? null : fecha,
                deCaja: aplicaCajon && deCaja,
            });
            onSaved(gasto);
            onClose();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
                setErrores(err.campos ?? {});
            } else setError('No se pudo registrar el gasto');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
            <form onSubmit={guardar} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">

                {/* Encabezado */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Registrar Nuevo Gasto</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Monto (S/)</label>
                        <input
                            type="number" min="0" step="0.10" autoFocus
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.00"
                            className={`w-full text-2xl font-bold border rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none ${errores.monto ? 'border-red-300' : 'border-gray-200'}`}
                        />
                        {errores.monto && <p className="text-xs text-red-600 mt-1">{errores.monto}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                        <input
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej. Pago de luz de octubre"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none bg-white cursor-pointer"
                        >
                            {(Object.keys(CATEGORIA_GASTO_LABEL) as CategoriaGasto[]).map((c) => (
                                <option key={c} value={c}>{CATEGORIA_GASTO_LABEL[c]}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">¿Cómo se pagó?</label>
                        <div className="flex flex-wrap gap-2">
                            {METODOS.map((m) => (
                                <button
                                    type="button" key={m} onClick={() => setMetodo(m)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                                        metodo === m ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {METODO_LABEL[m]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha</label>
                        <input
                            type="date" value={fecha} max={hoy}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none text-gray-600"
                        />
                        {errores.fecha && <p className="text-xs text-red-600 mt-1">{errores.fecha}</p>}
                    </div>

                    {aplicaCajon && (
                        <label className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 cursor-pointer">
                            <input type="checkbox" checked={deCaja} onChange={(e) => setDeCaja(e.target.checked)} className="w-4 h-4 mt-0.5 accent-black" />
                            <span className="text-sm text-gray-700">
                                <b>Salió del cajón</b>
                                <span className="block text-xs text-gray-500">Se resta del efectivo esperado al cerrar caja. Desmárcalo si lo pagaste con otra plata.</span>
                            </span>
                        </label>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">
                        Cancelar
                    </button>
                    <button type="submit" disabled={guardando || !(Number(monto) > 0)}
                            className="px-5 py-2.5 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-30">
                        {guardando ? 'Guardando...' : 'Registrar gasto'}
                    </button>
                </div>
            </form>
        </div>
    );
}
