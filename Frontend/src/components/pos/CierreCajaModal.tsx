// src/components/pos/CierreCajaModal.tsx
import { useEffect, useState } from 'react';
import { posService } from '../../services/posService';
import { ApiError } from '../../services/api';
import { METODO_LABEL, type Caja, type MetodoPago } from '../../types/pos';
import { formatFechaHora, formatSoles } from '../../utils/formato';
import { centavos } from '../../utils/dinero';

interface Props {
    caja: Caja;
    onClose: () => void;
    onCerrada: (caja: Caja) => void;
}

const textoDiferencia = (cent: number) =>
    cent === 0 ? 'Cuadra exacto ✓' : cent > 0 ? `Sobran ${formatSoles(cent / 100)}` : `Faltan ${formatSoles(-cent / 100)}`;

const colorDiferencia = (cent: number) =>
    cent === 0 ? 'text-green-700' : cent > 0 ? 'text-blue-700' : 'text-red-600';

const NOTA_METODO: Partial<Record<MetodoPago, string>> = {
    EFECTIVO: 'está en el cajón',
    FIADO: 'no entró dinero',
};

export function CierreCajaModal({ caja, onClose, onCerrada }: Props) {
    const [contado, setContado] = useState('');
    const [nota, setNota] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [resultado, setResultado] = useState<Caja | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const efectivoVentas = caja.porMetodo.EFECTIVO ?? 0;
    const difCent = contado.trim() ? centavos(Number(contado) || 0) - centavos(caja.efectivoEsperado) : null;
    const metodos = Object.entries(caja.porMetodo) as [MetodoPago, number][];

    const cerrar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contado.trim()) return;
        setGuardando(true);
        setError(null);
        try {
            setResultado(await posService.cerrarCaja(Number(contado), nota.trim() || null));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo cerrar la caja');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">{resultado ? 'Caja cerrada' : 'Cerrar caja'}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Abierta el {formatFechaHora(caja.abiertaEn)} · {caja.cantidadVentas} ventas
                    </p>
                </div>

                {resultado ? (
                    // ---------- Resultado del cierre ----------
                    <div className="p-8 space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <span className="text-gray-500">Efectivo esperado</span>
                            <span className="text-right font-bold">{formatSoles(resultado.efectivoEsperado)}</span>
                            <span className="text-gray-500">Efectivo contado</span>
                            <span className="text-right font-bold">{formatSoles(resultado.montoContado)}</span>
                        </div>
                        <p className={`text-2xl font-bold text-center ${colorDiferencia(centavos(resultado.diferencia ?? 0))}`}>
                            {textoDiferencia(centavos(resultado.diferencia ?? 0))}
                        </p>
                        <button
                            onClick={() => onCerrada(resultado)}
                            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800"
                        >
                            Listo
                        </button>
                    </div>
                ) : (
                    // ---------- Formulario de cierre ----------
                    <form onSubmit={cerrar} className="p-8 overflow-y-auto space-y-5">
                        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 text-sm">
                            {metodos.length === 0 && <p className="px-4 py-3 text-gray-500">No hubo ventas en este turno.</p>}
                            {metodos.map(([m, monto]) => (
                                <div key={m} className="flex justify-between px-4 py-2.5">
                                    <span className="text-gray-700">
                                        {METODO_LABEL[m]}
                                        <span className="text-xs text-gray-400"> · {NOTA_METODO[m] ?? 'revisa tu app / voucher'}</span>
                                    </span>
                                    <span className="font-bold">{formatSoles(monto)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between px-4 py-2.5 bg-gray-50 font-bold">
                                <span>Total vendido</span>
                                <span>{formatSoles(caja.totalVendido)}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 text-sm">
                            <p className="text-gray-600">Efectivo que debería haber en el cajón:</p>
                            <p className="text-2xl font-bold text-gray-900">{formatSoles(caja.efectivoEsperado)}</p>
                            <p className="text-xs text-gray-500">
                                {formatSoles(caja.montoInicial)} de sencillo + {formatSoles(efectivoVentas)} de ventas en efectivo
                                {caja.abonosEfectivo > 0 && ` + ${formatSoles(caja.abonosEfectivo)} de abonos de fiados`}
                                {caja.gastosEfectivo > 0 && ` − ${formatSoles(caja.gastosEfectivo)} de gastos pagados del cajón`}
                                {caja.comprasEfectivo > 0 && ` − ${formatSoles(caja.comprasEfectivo)} de compras a proveedores`}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">¿Cuánto efectivo contaste?</label>
                            <input
                                type="number"
                                min="0"
                                step="0.10"
                                autoFocus
                                value={contado}
                                onChange={(e) => setContado(e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="0.00"
                                className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                            />
                            {difCent !== null && (
                                <p className={`mt-2 font-bold ${colorDiferencia(difCent)}`}>{textoDiferencia(difCent)}</p>
                            )}
                        </div>

                        <input
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            placeholder="Nota (opcional): ej. faltó porque se dio mal un vuelto"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none"
                        />

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando || !contado.trim()}
                                className="px-6 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40"
                            >
                                {guardando ? 'Cerrando...' : 'Cerrar caja'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
