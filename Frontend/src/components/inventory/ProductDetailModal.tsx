// src/components/inventory/ProductDetailModal.tsx
import { useEffect, useState } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { ApiError } from '../../services/api';
import {
    MOTIVO_LABEL, UNIDAD_CORTA,
    type MotivoAjuste, type Movimiento, type Presentacion, type Producto,
} from '../../types/inventario';
import { formatCantidad, formatFechaHora, formatSoles } from '../../utils/formato';

type Tab = 'presentaciones' | 'ajuste' | 'kardex';

interface Props {
    producto: Producto | null;          // null = cerrado
    onClose: () => void;
    onUpdated: (producto: Producto) => void;
}

const inputCls = (error?: string) =>
    `w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-black outline-none transition text-sm ${
        error ? 'border-red-300' : 'border-gray-200'
    }`;

export function ProductDetailModal({ producto, onClose, onUpdated }: Props) {
    const [tab, setTab] = useState<Tab>('presentaciones');
    const productoId = producto?.id;

    // Cada vez que se abre otro producto, vuelve a la primera pestaña
    useEffect(() => {
        if (productoId === undefined) return;
        setTab('presentaciones');
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [productoId]);

    if (!producto) return null;

    // Vuelve a pedir el producto al backend para tener stock y presentaciones al día
    const refrescar = async () => {
        const actualizado = await inventarioService.obtenerProducto(producto.id);
        onUpdated(actualizado);
    };

    const unidad = UNIDAD_CORTA[producto.unidadMedida];

    const tabCls = (t: Tab) =>
        `px-4 py-2 rounded-xl text-sm font-bold transition ${
            tab === t ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
        }`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
                {/* Encabezado */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{producto.nombre}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Stock: <span className={`font-bold ${producto.stockActual < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatCantidad(producto.stockActual)} {unidad}
                            </span>
                            {' · '}Precio: <span className="font-bold text-gray-900">{formatSoles(producto.precioVenta)} /{unidad}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Pestañas */}
                <div className="px-8 pt-4 flex gap-2">
                    <button className={tabCls('presentaciones')} onClick={() => setTab('presentaciones')}>
                        Presentaciones ({producto.presentaciones.length})
                    </button>
                    <button className={tabCls('ajuste')} onClick={() => setTab('ajuste')}>Ajustar stock</button>
                    <button className={tabCls('kardex')} onClick={() => setTab('kardex')}>Kardex</button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {tab === 'presentaciones' && <PresentacionesTab producto={producto} onChange={refrescar} />}
                    {tab === 'ajuste' && <AjusteTab producto={producto} onDone={refrescar} />}
                    {/* key: si cambia el stock, el kardex se vuelve a cargar */}
                    {tab === 'kardex' && <KardexTab key={producto.stockActual} producto={producto} />}
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// PRESENTACIONES
// =====================================================================

interface PresForm { nombre: string; factor: string; precioVenta: string; codigoBarras: string; }
const PRES_VACIA: PresForm = { nombre: '', factor: '', precioVenta: '', codigoBarras: '' };

function PresentacionesTab({ producto, onChange }: { producto: Producto; onChange: () => Promise<void> }) {
    const [form, setForm] = useState<PresForm>(PRES_VACIA);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const unidad = UNIDAD_CORTA[producto.unidadMedida];

    const limpiar = () => {
        setForm(PRES_VACIA);
        setEditandoId(null);
        setErrores({});
        setErrorGeneral(null);
    };

    const editar = (pr: Presentacion) => {
        setEditandoId(pr.id);
        setErrores({});
        setErrorGeneral(null);
        setForm({
            nombre: pr.nombre,
            factor: String(pr.factor),
            precioVenta: String(pr.precioVenta),
            codigoBarras: pr.codigoBarras ?? '',
        });
    };

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setErrores({});
        setErrorGeneral(null);
        const data = {
            nombre: form.nombre,
            factor: Number(form.factor),
            precioVenta: Number(form.precioVenta),
            codigoBarras: form.codigoBarras.trim() || null,
        };
        try {
            if (editandoId) await inventarioService.actualizarPresentacion(editandoId, data);
            else await inventarioService.agregarPresentacion(producto.id, data);
            limpiar();
            await onChange();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrorGeneral(err.message);
                setErrores(err.campos ?? {});
            } else setErrorGeneral('No se pudo guardar la presentación');
        } finally {
            setGuardando(false);
        }
    };

    const quitar = async (pr: Presentacion) => {
        if (!confirm(`¿Quitar la presentación "${pr.nombre}"?`)) return;
        try {
            await inventarioService.desactivarPresentacion(pr.id);
            if (editandoId === pr.id) limpiar();
            await onChange();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : 'No se pudo quitar');
        }
    };

    // Vista previa: cuánto sale cada unidad dentro de la caja
    const factorNum = Number(form.factor);
    const precioNum = Number(form.precioVenta);
    const porUnidad = factorNum > 0 && precioNum > 0 ? precioNum / factorNum : null;

    return (
        <div className="space-y-6">
            {/* Lista */}
            {producto.presentaciones.length === 0 ? (
                <p className="text-sm text-gray-500">
                    Este producto solo se vende por {unidad}. Agrega presentaciones como "Media caja" o "Caja x12".
                </p>
            ) : (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                    {producto.presentaciones.map((pr) => {
                        const unit = pr.precioVenta / pr.factor;
                        const ahorro = producto.precioVenta - unit;
                        return (
                            <div key={pr.id} className="flex items-center justify-between px-4 py-3 gap-4">
                                <div>
                                    <p className="font-bold text-gray-900">{pr.nombre}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatCantidad(pr.factor)} {unidad} · {formatSoles(unit)} c/u
                                        {ahorro > 0.004 && <span className="text-green-600"> (ahorra {formatSoles(ahorro)} c/u)</span>}
                                        {pr.codigoBarras && <span className="font-mono"> · {pr.codigoBarras}</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-green-600">{formatSoles(pr.precioVenta)}</span>
                                    <button onClick={() => editar(pr)} className="text-xs font-bold text-gray-500 hover:text-black">Editar</button>
                                    <button onClick={() => quitar(pr)} className="text-xs font-bold text-red-500 hover:text-red-700">Quitar</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Formulario agregar / editar */}
            <form onSubmit={guardar} className="bg-gray-50 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-gray-900">{editandoId ? 'Editar presentación' : 'Nueva presentación'}</h3>
                {errorGeneral && <p className="text-sm text-red-600 font-medium">{errorGeneral}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                        <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                               placeholder="Ej: Caja x12" className={inputCls(errores.nombre)} />
                        {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">¿Cuántos {unidad} trae?</label>
                        <input type="number" min="0" step={producto.unidadMedida === 'UND' ? 1 : 0.001}
                               value={form.factor} onChange={(e) => setForm({ ...form, factor: e.target.value })}
                               onWheel={(e) => e.currentTarget.blur()} placeholder="12" className={inputCls(errores.factor)} />
                        {errores.factor && <p className="text-xs text-red-600 mt-1">{errores.factor}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Precio de la presentación (S/)</label>
                        <input type="number" min="0" step="0.01"
                               value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                               onWheel={(e) => e.currentTarget.blur()} placeholder="78.00" className={inputCls(errores.precioVenta)} />
                        {errores.precioVenta && <p className="text-xs text-red-600 mt-1">{errores.precioVenta}</p>}
                        {porUnidad !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Sale a {formatSoles(porUnidad)} por {unidad} (suelto: {formatSoles(producto.precioVenta)})
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Código de barras (opcional)</label>
                        <input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                               onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                               placeholder="Código de la caja" className={`${inputCls(errores.codigoBarras)} font-mono`} />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    {editandoId && (
                        <button type="button" onClick={limpiar} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200">
                            Cancelar edición
                        </button>
                    )}
                    <button type="submit" disabled={guardando}
                            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-50">
                        {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Agregar'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// =====================================================================
// AJUSTE DE STOCK
// =====================================================================

const MOTIVOS_AJUSTE: { valor: MotivoAjuste; titulo: string; detalle: string; signo: 1 | -1 }[] = [
    { valor: 'MERMA', titulo: 'Merma', detalle: 'Se rompió, venció o malogró', signo: -1 },
    { valor: 'AJUSTE_SALIDA', titulo: 'Faltante', detalle: 'Conté y hay MENOS de lo registrado', signo: -1 },
    { valor: 'AJUSTE_ENTRADA', titulo: 'Sobrante', detalle: 'Conté y hay MÁS de lo registrado', signo: 1 },
];

function AjusteTab({ producto, onDone }: { producto: Producto; onDone: () => Promise<void> }) {
    const [motivo, setMotivo] = useState<MotivoAjuste>('MERMA');
    const [cantidad, setCantidad] = useState('');
    const [nota, setNota] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const unidad = UNIDAD_CORTA[producto.unidadMedida];
    const signo = MOTIVOS_AJUSTE.find((m) => m.valor === motivo)!.signo;
    const cant = Number(cantidad);
    const resultado = cant > 0 ? producto.stockActual + signo * cant : null;

    const confirmar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        setExito(null);
        try {
            const mov = await inventarioService.ajustarStock(producto.id, {
                motivo,
                cantidad: cant,
                nota: nota.trim() || null,
            });
            setExito(`Listo: ${MOTIVO_LABEL[mov.motivo]} de ${formatCantidad(Math.abs(mov.cantidad))} ${unidad}. ` +
                `Stock ${formatCantidad(mov.stockAnterior)} → ${formatCantidad(mov.stockResultante)}.`);
            setCantidad('');
            setNota('');
            await onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el ajuste');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <form onSubmit={confirmar} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MOTIVOS_AJUSTE.map((m) => (
                    <button key={m.valor} type="button" onClick={() => setMotivo(m.valor)}
                            className={`text-left border rounded-xl p-4 transition ${
                                motivo === m.valor ? 'border-black bg-gray-50 ring-2 ring-black' : 'border-gray-200 hover:bg-gray-50'
                            }`}>
                        <p className="font-bold text-gray-900">{m.titulo} <span className={m.signo > 0 ? 'text-green-600' : 'text-red-600'}>{m.signo > 0 ? '(+)' : '(−)'}</span></p>
                        <p className="text-xs text-gray-500 mt-1">{m.detalle}</p>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad ({unidad})</label>
                    <input type="number" min="0" step={producto.unidadMedida === 'UND' ? 1 : 0.001}
                           value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                           onWheel={(e) => e.currentTarget.blur()} placeholder="0" className={inputCls()} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nota (opcional)</label>
                    <input value={nota} onChange={(e) => setNota(e.target.value)}
                           placeholder="Ej: se cayeron al acomodar" className={inputCls()} />
                </div>
            </div>

            {/* Vista previa antes de confirmar */}
            {resultado !== null && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${resultado < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                    Stock: <b>{formatCantidad(producto.stockActual)}</b> → <b>{formatCantidad(resultado)}</b> {unidad}
                    {resultado < 0 && ' — no puedes sacar más de lo que hay'}
                </div>
            )}

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            {exito && <p className="text-sm text-green-700 font-medium">{exito}</p>}

            <div className="flex justify-end">
                <button type="submit" disabled={guardando || !(cant > 0)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 disabled:opacity-40">
                    {guardando ? 'Registrando...' : 'Confirmar ajuste'}
                </button>
            </div>
        </form>
    );
}

// =====================================================================
// KARDEX DEL PRODUCTO
// =====================================================================

function KardexTab({ producto }: { producto: Producto }) {
    const [movs, setMovs] = useState<Movimiento[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        inventarioService.kardexProducto(producto.id)
            .then(setMovs)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el kardex'));
    }, [producto.id]);

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!movs) return <p className="text-sm text-gray-400">Cargando kardex...</p>;
    if (movs.length === 0) return <p className="text-sm text-gray-500">Este producto todavía no tiene movimientos.</p>;

    return (
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3">Nota</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {movs.map((m) => (
                    <tr key={m.id}>
                        <td className="px-4 py-3 text-gray-500">{formatFechaHora(m.fecha)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{MOTIVO_LABEL[m.motivo]}</td>
                        <td className={`px-4 py-3 text-right font-bold ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {m.cantidad > 0 ? '+' : ''}{formatCantidad(m.cantidad)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                            {formatCantidad(m.stockAnterior)} → <b className="text-gray-900">{formatCantidad(m.stockResultante)}</b>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{m.nota ?? '—'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}