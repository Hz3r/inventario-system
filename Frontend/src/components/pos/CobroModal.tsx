// src/components/pos/CobroModal.tsx
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { posService } from '../../services/posService';
import { ApiError } from '../../services/api';
import { METODO_LABEL, type Cliente, type MetodoPago, type Venta, type VentaItemRequest } from '../../types/pos';
import { formatSoles } from '../../utils/formato';
import { centavos } from '../../utils/dinero';
import { refrescarNotificaciones } from '../notificaciones/useNotificaciones';

interface Props {
    total: number;
    descuento: number;
    items: VentaItemRequest[];
    onClose: () => void;
    onDone: (venta: Venta) => void;
}

interface PagoForm {
    key: string;
    metodo: MetodoPago;
    monto: string;
    referencia: string;
}

const METODOS: MetodoPago[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA', 'FIADO'];
const CON_REFERENCIA: MetodoPago[] = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];
const BILLETES = [10, 20, 50, 100, 200];

let contadorPagos = 0;
const nuevoPago = (metodo: MetodoPago, monto: string): PagoForm =>
    ({ key: `pago-${++contadorPagos}`, metodo, monto, referencia: '' });

const inputCls = 'border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-black outline-none text-sm';

export function CobroModal({ total, descuento, items, onClose, onDone }: Props) {
    const totalCent = centavos(total);
    const [pagos, setPagos] = useState<PagoForm[]>(() => [nuevoPago('EFECTIVO', total.toFixed(2))]);
    const [recibido, setRecibido] = useState('');
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    // Escape cierra; bloquea el scroll del fondo
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !guardando) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', onKey);
        };
    }, [guardando, onClose]);

    // ---- Cuentas (en céntimos) ----
    const montoCent = (p: PagoForm) => centavos(Number(p.monto) || 0);
    const sumaCent = pagos.reduce((s, p) => s + montoCent(p), 0);
    const faltaCent = totalCent - sumaCent;
    const efectivoCent = pagos.filter((p) => p.metodo === 'EFECTIVO').reduce((s, p) => s + montoCent(p), 0);
    const fiadoCent = pagos.filter((p) => p.metodo === 'FIADO').reduce((s, p) => s + montoCent(p), 0);
    const recibidoCent = recibido.trim() ? centavos(Number(recibido) || 0) : null;
    const vueltoCent = recibidoCent !== null ? recibidoCent - efectivoCent : null;
    const pagoMixto = pagos.length > 1;

    // ---- Acciones ----
    const elegirMetodoUnico = (m: MetodoPago) => {
        setPagos([nuevoPago(m, total.toFixed(2))]);
        setRecibido('');
        setError(null);
    };

    const agregarPago = () =>
        setPagos((prev) => [
            ...prev,
            nuevoPago(prev.some((p) => p.metodo === 'YAPE') ? 'PLIN' : 'YAPE', faltaCent > 0 ? (faltaCent / 100).toFixed(2) : ''),
        ]);

    const actualizarPago = (key: string, cambios: Partial<PagoForm>) =>
        setPagos((prev) => prev.map((p) => (p.key === key ? { ...p, ...cambios } : p)));

    const quitarPago = (key: string) => setPagos((prev) => prev.filter((p) => p.key !== key));

    // Por qué todavía no se puede confirmar (null = todo listo)
    const motivoBloqueo =
        faltaCent > 0 ? `Falta asignar ${formatSoles(faltaCent / 100)}`
            : faltaCent < 0 ? `Los pagos superan el total por ${formatSoles(-faltaCent / 100)}`
                : fiadoCent > 0 && !cliente ? 'Elige el cliente al que se le fía'
                    : vueltoCent !== null && vueltoCent < 0 ? 'El efectivo recibido no alcanza'
                        : null;

    const confirmar = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (motivoBloqueo || guardando) return;
        setGuardando(true);
        setError(null);
        try {
            const venta = await posService.registrarVenta({
                items,
                descuento: descuento > 0 ? descuento : null,
                pagos: pagos
                    .filter((p) => montoCent(p) > 0)
                    .map((p) => ({ metodo: p.metodo, monto: montoCent(p) / 100, referencia: p.referencia.trim() || null })),
                clienteId: cliente?.id ?? null,
                efectivoRecibido: recibidoCent !== null && efectivoCent > 0 ? recibidoCent / 100 : null,
                nota: null,
            });
            refrescarNotificaciones();
            onDone(venta);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar la venta');
            setGuardando(false);
        }
    };

    const billetes = BILLETES.filter((b) => b * 100 > efectivoCent);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <form
                onSubmit={confirmar}
                className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col"
            >
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Total a cobrar</p>
                        <p className="text-4xl font-bold text-gray-900">{formatSoles(total)}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    {/* Un solo método: botones grandes */}
                    {!pagoMixto && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                {METODOS.map((m) => (
                                    <button
                                        type="button"
                                        key={m}
                                        onClick={() => elegirMetodoUnico(m)}
                                        className={`py-3 rounded-xl font-bold text-sm border transition ${
                                            pagos[0].metodo === m
                                                ? 'bg-black text-white border-black'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {METODO_LABEL[m]}
                                    </button>
                                ))}
                            </div>
                            {CON_REFERENCIA.includes(pagos[0].metodo) && (
                                <input
                                    value={pagos[0].referencia}
                                    onChange={(e) => actualizarPago(pagos[0].key, { referencia: e.target.value })}
                                    placeholder="N° de operación (opcional)"
                                    className={`${inputCls} w-full`}
                                />
                            )}
                        </div>
                    )}

                    {/* Pago mixto: una fila por método */}
                    {pagoMixto && (
                        <div className="space-y-2">
                            {pagos.map((p) => (
                                <div key={p.key} className="flex gap-2 items-center">
                                    <select
                                        value={p.metodo}
                                        onChange={(e) => actualizarPago(p.key, { metodo: e.target.value as MetodoPago })}
                                        className={`${inputCls} bg-white font-bold`}
                                    >
                                        {METODOS.map((m) => (
                                            <option key={m} value={m}>{METODO_LABEL[m]}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.10"
                                        value={p.monto}
                                        onChange={(e) => actualizarPago(p.key, { monto: e.target.value })}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0.00"
                                        className={`${inputCls} w-28 text-right`}
                                    />
                                    {CON_REFERENCIA.includes(p.metodo) && (
                                        <input
                                            value={p.referencia}
                                            onChange={(e) => actualizarPago(p.key, { referencia: e.target.value })}
                                            placeholder="N° operación"
                                            className={`${inputCls} flex-1 min-w-0`}
                                        />
                                    )}
                                    <button type="button" onClick={() => quitarPago(p.key)} className="p-2 text-gray-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <p className={`text-sm font-medium ${faltaCent === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                                Asignado {formatSoles(sumaCent / 100)} de {formatSoles(total)}
                                {faltaCent > 0 && ` · falta ${formatSoles(faltaCent / 100)}`}
                                {faltaCent < 0 && ` · sobra ${formatSoles(-faltaCent / 100)}`}
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={agregarPago}
                        className="text-sm font-bold text-gray-600 hover:text-black flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        {pagoMixto ? 'Agregar otro método' : 'Pago mixto (parte efectivo, parte Yape...)'}
                    </button>

                    {/* Efectivo: con cuánto paga y vuelto */}
                    {efectivoCent > 0 && (
                        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                            <label className="block text-sm font-bold text-gray-700">
                                ¿Con cuánto paga? <span className="font-medium text-gray-500">(efectivo: {formatSoles(efectivoCent / 100)})</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.10"
                                autoFocus
                                value={recibido}
                                onChange={(e) => setRecibido(e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="Vacío = paga exacto"
                                className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                            />
                            <div className="flex flex-wrap gap-2">
                                {billetes.map((b) => (
                                    <button
                                        type="button"
                                        key={b}
                                        onClick={() => setRecibido(String(b))}
                                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:bg-gray-100"
                                    >
                                        S/ {b}
                                    </button>
                                ))}
                            </div>
                            {vueltoCent !== null && (
                                <p className={`text-xl font-bold ${vueltoCent < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                    {vueltoCent < 0 ? `Faltan ${formatSoles(-vueltoCent / 100)}` : `Vuelto: ${formatSoles(vueltoCent / 100)}`}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Fiado: elegir cliente */}
                    {fiadoCent > 0 && <ClientePicker cliente={cliente} onChange={setCliente} montoFiado={fiadoCent / 100} />}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-4">
                    <p className="text-sm text-amber-700 font-medium">{motivoBloqueo ?? ''}</p>
                    <button
                        type="submit"
                        disabled={!!motivoBloqueo || guardando}
                        className="px-8 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 shadow-lg transition disabled:opacity-30 shrink-0"
                    >
                        {guardando ? 'Registrando...' : 'Confirmar venta (Enter)'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// =====================================================================
// Elegir (o crear) el cliente al que se le fía
// =====================================================================

function ClientePicker({ cliente, onChange, montoFiado }: {
    cliente: Cliente | null;
    onChange: (c: Cliente | null) => void;
    montoFiado: number;
}) {
    const [buscar, setBuscar] = useState('');
    const [resultados, setResultados] = useState<Cliente[]>([]);
    const [creando, setCreando] = useState(false);
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Busca mientras escribes, esperando 250 ms para no saturar al backend
    useEffect(() => {
        if (cliente) return;
        const t = setTimeout(() => {
            posService.listarClientes(buscar.trim() || undefined)
                .then(setResultados)
                .catch(() => setResultados([]));
        }, 250);
        return () => clearTimeout(t);
    }, [buscar, cliente]);

    // Dentro del formulario de cobro, Enter no debe confirmar la venta
    const sinEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
    };

    const crear = async () => {
        setError(null);
        try {
            const c = await posService.crearCliente({
                nombre, telefono: telefono.trim() || null, dni: null, direccion: null, limiteCredito: null, nota: null,
            });
            onChange(c);
            setCreando(false);
        } catch (err) {
            setError(err instanceof ApiError ? (err.campos?.nombre ?? err.message) : 'No se pudo crear el cliente');
        }
    };

    if (cliente) {
        const nuevaDeuda = cliente.deudaActual + montoFiado;
        const excede = cliente.limiteCredito !== null && nuevaDeuda > cliente.limiteCredito;
        return (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex justify-between items-start gap-4">
                <div>
                    <p className="text-xs font-bold text-amber-700 uppercase">Se fía a</p>
                    <p className="font-bold text-gray-900">{cliente.nombre}</p>
                    <p className="text-xs text-gray-600">
                        Debe {formatSoles(cliente.deudaActual)} → quedará en <b>{formatSoles(nuevaDeuda)}</b>
                        {cliente.limiteCredito !== null && ` (límite ${formatSoles(cliente.limiteCredito)})`}
                    </p>
                    {excede && <p className="text-xs text-red-600 font-bold mt-1">Supera su límite de crédito</p>}
                </div>
                <button type="button" onClick={() => onChange(null)} className="text-xs font-bold text-gray-500 hover:text-black">
                    Cambiar
                </button>
            </div>
        );
    }

    return (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-amber-800">¿A quién se le fía {formatSoles(montoFiado)}?</p>
            {!creando ? (
                <>
                    <input
                        value={buscar}
                        onChange={(e) => setBuscar(e.target.value)}
                        onKeyDown={sinEnter}
                        placeholder="Buscar cliente por nombre..."
                        className={`${inputCls} w-full bg-white`}
                    />
                    <div className="max-h-40 overflow-y-auto">
                        {resultados.slice(0, 6).map((c) => (
                            <button
                                type="button"
                                key={c.id}
                                onClick={() => onChange(c)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-100 rounded-lg flex justify-between text-sm"
                            >
                                <span className="font-medium text-gray-900">{c.nombre}</span>
                                <span className="text-gray-500">debe {formatSoles(c.deudaActual)}</span>
                            </button>
                        ))}
                        {resultados.length === 0 && <p className="text-xs text-gray-500 px-3 py-2">No hay clientes con ese nombre.</p>}
                    </div>
                    <button
                        type="button"
                        onClick={() => { setCreando(true); setNombre(buscar); }}
                        className="text-sm font-bold text-amber-800 hover:underline"
                    >
                        + Nuevo cliente
                    </button>
                </>
            ) : (
                <>
                    <input
                        autoFocus
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        onKeyDown={sinEnter}
                        placeholder="Nombre (ej: Don Pepe)"
                        className={`${inputCls} w-full bg-white`}
                    />
                    <input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        onKeyDown={sinEnter}
                        placeholder="Teléfono (opcional)"
                        className={`${inputCls} w-full bg-white`}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setCreando(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-amber-100">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={crear}
                            disabled={!nombre.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40"
                        >
                            Crear y elegir
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
