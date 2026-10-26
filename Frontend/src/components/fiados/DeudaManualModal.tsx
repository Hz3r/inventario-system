// src/components/fiados/DeudaManualModal.tsx
// Para pasar al sistema lo que estaba anotado en el cuaderno de fiados
import { useEffect, useState } from 'react';
import { posService } from '../../services/posService';
import { fiadosService } from '../../services/fiadosService';
import { ApiError } from '../../services/api';
import type { Cliente } from '../../types/pos';
import { formatSoles } from '../../utils/formato';

interface Props {
    onClose: () => void;
    onDone: (clienteId: number) => void;
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-black outline-none text-sm';

export function DeudaManualModal({ onClose, onDone }: Props) {
    const [buscar, setBuscar] = useState('');
    const [resultados, setResultados] = useState<Cliente[]>([]);
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [creando, setCreando] = useState(false);
    const [monto, setMonto] = useState('');
    const [nota, setNota] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    useEffect(() => {
        if (cliente || creando) return;
        const t = setTimeout(() => {
            posService.listarClientes(buscar.trim() || undefined).then(setResultados).catch(() => setResultados([]));
        }, 250);
        return () => clearTimeout(t);
    }, [buscar, cliente, creando]);

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        try {
            // 1) Si es cliente nuevo, se crea primero
            let c = cliente;
            if (!c) {
                c = await posService.crearCliente({
                    nombre: nuevoNombre, telefono: nuevoTelefono.trim() || null,
                    dni: null, direccion: null, limiteCredito: null, nota: null,
                });
            }
            // 2) Se registra la deuda
            await fiadosService.deudaManual(c.id, Number(monto), nota.trim() || null);
            onDone(c.id);
        } catch (err) {
            setError(err instanceof ApiError ? (err.campos ? Object.values(err.campos)[0] : err.message) : 'No se pudo guardar');
            setGuardando(false);
        }
    };

    const listo = (cliente || (creando && nuevoNombre.trim())) && Number(monto) > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <form onSubmit={guardar} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Pasar deuda del cuaderno</h2>
                        <p className="text-sm text-gray-500">Para deudas que existían antes del sistema</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5">
                    {/* Cliente */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cliente</label>
                        {cliente ? (
                            <div className="flex justify-between items-center border border-gray-200 rounded-xl px-4 py-3">
                                <div>
                                    <p className="font-bold text-gray-900">{cliente.nombre}</p>
                                    <p className="text-xs text-gray-500">Debe actualmente {formatSoles(cliente.deudaActual)}</p>
                                </div>
                                <button type="button" onClick={() => setCliente(null)} className="text-xs font-bold text-gray-500 hover:text-black">Cambiar</button>
                            </div>
                        ) : creando ? (
                            <div className="space-y-2">
                                <input autoFocus value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                                       placeholder="Nombre (ej: Sra. Rosa)" className={inputCls} />
                                <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)}
                                       placeholder="Teléfono (opcional)" className={inputCls} />
                                <button type="button" onClick={() => setCreando(false)} className="text-xs font-bold text-gray-500 hover:text-black">
                                    ← Buscar un cliente existente
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input autoFocus value={buscar} onChange={(e) => setBuscar(e.target.value)}
                                       placeholder="Buscar cliente..." className={inputCls} />
                                <div className="max-h-40 overflow-y-auto">
                                    {resultados.slice(0, 6).map((c) => (
                                        <button type="button" key={c.id} onClick={() => setCliente(c)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex justify-between text-sm">
                                            <span className="font-medium">{c.nombre}</span>
                                            <span className="text-gray-500">debe {formatSoles(c.deudaActual)}</span>
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={() => { setCreando(true); setNuevoNombre(buscar); }}
                                        className="text-sm font-bold text-gray-700 hover:underline">
                                    + Es un cliente nuevo
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">¿Cuánto debe? (S/)</label>
                        <input type="number" min="0" step="0.10" value={monto} onChange={(e) => setMonto(e.target.value)}
                               onWheel={(e) => e.currentTarget.blur()} placeholder="0.00"
                               className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nota (opcional)</label>
                        <input value={nota} onChange={(e) => setNota(e.target.value)}
                               placeholder="Ej: deuda de septiembre, según cuaderno" className={inputCls} />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">
                        Cancelar
                    </button>
                    <button type="submit" disabled={!listo || guardando}
                            className="px-6 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-30">
                        {guardando ? 'Guardando...' : 'Registrar deuda'}
                    </button>
                </div>
            </form>
        </div>
    );
}
