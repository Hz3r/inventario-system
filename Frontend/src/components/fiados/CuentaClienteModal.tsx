// src/components/fiados/CuentaClienteModal.tsx
import { useCallback, useEffect, useState } from 'react';
import { fiadosService } from '../../services/fiadosService';
import { ApiError } from '../../services/api';
import { METODO_LABEL, type MetodoPago } from '../../types/pos';
import { ESTADO_FIADO_LABEL, type CuentaCliente, type FiadoDetalle } from '../../types/fiados';
import { formatCantidad, formatFechaHora, formatSoles } from '../../utils/formato';
import { centavos } from '../../utils/dinero';
import { tienda } from '../../config/tienda';
import { refrescarNotificaciones } from '../notificaciones/useNotificaciones';

interface Props {
    clienteId: number;
    onClose: () => void;
    onChanged: () => void;   // la lista de fiados se vuelve a cargar
}

type Tab = 'pendientes' | 'historial' | 'abonos';

const METODOS_ABONO: MetodoPago[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

const ESTADO_CLASES = {
    PENDIENTE: 'bg-red-50 text-red-700',
    PARCIAL: 'bg-amber-50 text-amber-700',
    PAGADO: 'bg-green-50 text-green-700',
    ANULADO: 'bg-gray-100 text-gray-500',
} as const;

export function CuentaClienteModal({ clienteId, onClose, onChanged }: Props) {
    const [cuenta, setCuenta] = useState<CuentaCliente | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('pendientes');

    // Formulario de abono
    const [monto, setMonto] = useState('');
    const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
    const [referencia, setReferencia] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [exito, setExito] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCuenta(await fiadosService.cuenta(clienteId));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar la cuenta');
        }
    }, [clienteId]);

    useEffect(() => {
        cargar();
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', onKey);
        };
    }, [cargar, onClose]);

    const deuda = cuenta?.cliente.deudaActual ?? 0;
    const montoCent = centavos(Number(monto) || 0);
    const quedara = (centavos(deuda) - montoCent) / 100;

    const abonar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (montoCent <= 0) return;
        setGuardando(true);
        setError(null);
        setExito(null);
        try {
            const nueva = await fiadosService.abonar(clienteId, montoCent / 100, metodo, referencia.trim() || null);
            refrescarNotificaciones();
            setCuenta(nueva);
            setExito(`Abono de ${formatSoles(montoCent / 100)} registrado. ` +
                (nueva.cliente.deudaActual > 0 ? `Ahora debe ${formatSoles(nueva.cliente.deudaActual)}.` : '¡Ya no debe nada! 🎉'));
            setMonto('');
            setReferencia('');
            onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el abono');
        } finally {
            setGuardando(false);
        }
    };

    // Recordatorio por WhatsApp (abre WhatsApp Web / la app con el mensaje escrito)
    const telefono = cuenta?.cliente.telefono?.replace(/\D/g, '') ?? '';
    const linkWhatsapp = telefono.length >= 9
        ? `https://wa.me/51${telefono.slice(-9)}?text=${encodeURIComponent(
            `Hola ${cuenta?.cliente.nombre}, te saluda ${tienda().nombre}. Tu cuenta pendiente es de ${formatSoles(deuda)}. ¡Gracias!`)}`
        : null;

    const fiados = cuenta?.fiados ?? [];
    const pendientes = fiados.filter((f) => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL');

    const tabCls = (t: Tab) =>
        `px-4 py-2 rounded-xl text-sm font-bold transition ${tab === t ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                {/* Encabezado */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{cuenta?.cliente.nombre ?? 'Cargando...'}</h2>
                        {cuenta && (
                            <p className="text-sm text-gray-500 mt-1">
                                {cuenta.cliente.telefono ?? 'Sin teléfono'}
                                {cuenta.cliente.dni && ` · DNI ${cuenta.cliente.dni}`}
                                {cuenta.cliente.limiteCredito !== null && ` · Límite ${formatSoles(cuenta.cliente.limiteCredito)}`}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-bold uppercase">Debe</p>
                        <p className={`text-3xl font-bold ${deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatSoles(deuda)}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}
                    {exito && (
                        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">{exito}</div>
                    )}

                    {/* Registrar abono */}
                    {deuda > 0 && (
                        <form onSubmit={abonar} className="bg-gray-50 rounded-xl p-5 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">Registrar abono</h3>
                                {linkWhatsapp && (
                                    <a href={linkWhatsapp} target="_blank" rel="noreferrer"
                                       className="text-xs font-bold text-green-700 hover:underline">
                                        Recordarle por WhatsApp
                                    </a>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {METODOS_ABONO.map((m) => (
                                    <button
                                        type="button"
                                        key={m}
                                        onClick={() => setMetodo(m)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                                            metodo === m ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {METODO_LABEL[m]}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.10"
                                    autoFocus
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="Monto"
                                    className="w-40 text-xl font-bold border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-black outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMonto(deuda.toFixed(2))}
                                    className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:bg-gray-100"
                                >
                                    Paga todo ({formatSoles(deuda)})
                                </button>
                                {metodo !== 'EFECTIVO' && (
                                    <input
                                        value={referencia}
                                        onChange={(e) => setReferencia(e.target.value)}
                                        placeholder="N° operación (opcional)"
                                        className="flex-1 min-w-[10rem] border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                                    />
                                )}
                            </div>
                            {montoCent > 0 && (
                                <p className={`text-sm font-medium ${quedara < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {quedara < 0
                                        ? `Es más de lo que debe (${formatSoles(deuda)})`
                                        : quedara === 0 ? 'Con esto queda en cero ✓' : `Quedará debiendo ${formatSoles(quedara)}`}
                                </p>
                            )}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={guardando || montoCent <= 0 || quedara < 0}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-30"
                                >
                                    {guardando ? 'Registrando...' : 'Registrar abono'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Pestañas */}
                    <div className="flex gap-2">
                        <button className={tabCls('pendientes')} onClick={() => setTab('pendientes')}>Pendientes ({pendientes.length})</button>
                        <button className={tabCls('historial')} onClick={() => setTab('historial')}>Historial ({fiados.length})</button>
                        <button className={tabCls('abonos')} onClick={() => setTab('abonos')}>Abonos ({cuenta?.abonos.length ?? 0})</button>
                    </div>

                    {tab !== 'abonos' && (
                        <div className="space-y-3">
                            {(tab === 'pendientes' ? pendientes : fiados).length === 0 && (
                                <p className="text-sm text-gray-500">{tab === 'pendientes' ? 'No tiene fiados pendientes.' : 'Sin movimientos.'}</p>
                            )}
                            {(tab === 'pendientes' ? pendientes : fiados).map((f) => <TarjetaFiado key={f.id} fiado={f} />)}
                        </div>
                    )}

                    {tab === 'abonos' && (
                        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 text-sm">
                            {(cuenta?.abonos.length ?? 0) === 0 && <p className="px-4 py-3 text-gray-500">Todavía no ha abonado.</p>}
                            {cuenta?.abonos.map((a) => (
                                <div key={a.id} className="flex justify-between items-center px-4 py-3 gap-4">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {METODO_LABEL[a.metodo]}{a.referencia && <span className="text-gray-400"> · {a.referencia}</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFechaHora(a.fecha)} · aplicado a {a.ventaNumero ? `venta #${a.ventaNumero}` : 'deuda anterior'}
                                        </p>
                                    </div>
                                    <span className="font-bold text-green-600">{formatSoles(a.monto)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TarjetaFiado({ fiado: f }: { fiado: FiadoDetalle }) {
    return (
        <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <p className="font-bold text-gray-900">
                        {f.ventaNumero ? `Venta #${f.ventaNumero}` : (f.nota ?? 'Deuda anterior')}
                    </p>
                    <p className="text-xs text-gray-500">{formatFechaHora(f.fecha)}</p>
                </div>
                <div className="text-right">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ESTADO_CLASES[f.estado]}`}>
                        {ESTADO_FIADO_LABEL[f.estado]}
                    </span>
                    <p className="text-sm mt-1">
                        <span className="text-gray-500">{formatSoles(f.montoTotal)}</span>
                        {f.estado !== 'PAGADO' && f.estado !== 'ANULADO' && (
                            <> · debe <b className="text-red-600">{formatSoles(f.saldo)}</b></>
                        )}
                    </p>
                </div>
            </div>
            {/* Qué llevó */}
            {f.items.length > 0 && (
                <ul className="mt-3 text-xs text-gray-600 space-y-0.5">
                    {f.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-4">
                            <span>{formatCantidad(it.cantidad)} × {it.descripcion}</span>
                            <span>{formatSoles(it.subtotal)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
