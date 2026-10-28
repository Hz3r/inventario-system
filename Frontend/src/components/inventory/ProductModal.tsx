// src/components/inventory/ProductModal.tsx
import { useEffect, useState } from 'react';
import { inventarioService } from '../../services/inventarioService';
import { ApiError } from '../../services/api';
import { desglosarIgv } from '../../utils/igv';
import { formatSoles } from '../../utils/formato';
import {
    UNIDAD_CORTA, UNIDAD_LABEL,
    type Categoria, type Producto, type ProductoRequest, type UnidadMedida,
} from '../../types/inventario';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (producto: Producto) => void;
    productToEdit?: Producto | null;
    categorias: Categoria[];
}

// En el formulario todo es texto; se convierte a número al enviar
interface FormState {
    nombre: string;
    codigoBarras: string;
    plu: string;
    categoriaId: string;
    precioCosto: string;
    precioVenta: string;
    stockInicial: string;
    stockMinimo: string;
    unidadMedida: UnidadMedida;
    igv: boolean;
    vencimiento: string;
    imagenURL: string;
}

const VACIO: FormState = {
    nombre: '', codigoBarras: '', plu: '', categoriaId: '', precioCosto: '', precioVenta: '',
    stockInicial: '', stockMinimo: '5', unidadMedida: 'UND', igv: true, vencimiento: '', imagenURL: '',
};

const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const aNumero = (s: string) => (s.trim() === '' ? null : Number(s));

const inputCls = (error?: string) =>
    `w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition disabled:bg-gray-50 disabled:text-gray-400 ${
        error ? 'border-red-300' : 'border-gray-200'
    }`;

function Campo({ label, error, ayuda, children }: {
    label: string; error?: string; ayuda?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">{label}</label>
            {children}
            {error ? (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            ) : ayuda ? (
                <p className="text-xs text-gray-400 mt-1">{ayuda}</p>
            ) : null}
        </div>
    );
}

export function ProductModal({ isOpen, onClose, onSaved, productToEdit, categorias }: ProductModalProps) {
    const [form, setForm] = useState<FormState>(VACIO);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const editando = !!productToEdit;
    const tieneStock = editando && productToEdit.stockActual !== 0;

    // Al abrir: llena el formulario (editar) o lo limpia (nuevo)
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        setErrores({});
        setErrorGeneral(null);
        setForm(productToEdit ? {
            nombre: productToEdit.nombre,
            codigoBarras: productToEdit.codigoBarras ?? '',
            plu: productToEdit.plu ?? '',
            categoriaId: aTexto(productToEdit.categoriaId),
            precioCosto: aTexto(productToEdit.precioCosto),
            precioVenta: aTexto(productToEdit.precioVenta),
            stockInicial: '',
            stockMinimo: aTexto(productToEdit.stockMinimo),
            unidadMedida: productToEdit.unidadMedida,
            igv: productToEdit.igv ?? true,
            vencimiento: productToEdit.vencimiento ?? '',
            imagenURL: productToEdit.imagenURL ?? '',
        } : VACIO);
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, productToEdit]);

    if (!isOpen) return null;

    const set = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
        setForm((f) => ({ ...f, [campo]: valor }));

    const pasoCantidad = form.unidadMedida === 'UND' ? 1 : 0.001;
    const unidad = UNIDAD_CORTA[form.unidadMedida];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setErrores({});
        setErrorGeneral(null);

        const data: ProductoRequest = {
            nombre: form.nombre,
            codigoBarras: form.codigoBarras.trim() || null,
            plu: form.plu.trim() || null,
            precioCosto: aNumero(form.precioCosto),
            precioVenta: aNumero(form.precioVenta) as number,
            stockInicial: editando ? null : aNumero(form.stockInicial),
            unidadMedida: form.unidadMedida,
            igv: form.igv,
            stockMinimo: aNumero(form.stockMinimo),
            vencimiento: form.vencimiento || null,
            imagenURL: form.imagenURL.trim() || null,
            categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
            proveedorId: productToEdit?.proveedorId ?? null,
        };

        try {
            const guardado = editando
                ? await inventarioService.actualizarProducto(productToEdit.id, data)
                : await inventarioService.crearProducto(data);
            onSaved(guardado);
            onClose();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrorGeneral(err.message);
                setErrores(err.campos ?? {});
            } else {
                setErrorGeneral('No se pudo guardar el producto');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
            >
                <div className="px-8 py-6 border-b border-gray-100 bg-white flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {editando ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-5">
                    {errorGeneral && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                            {errorGeneral}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Campo label="Nombre del Producto" error={errores.nombre}>
                            <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
                                   placeholder="Ej: Pilsen 630ml" className={inputCls(errores.nombre)} autoFocus />
                        </Campo>
                        <Campo label="Categoría" error={errores.categoriaId}>
                            <select value={form.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}
                                    className={`${inputCls(errores.categoriaId)} bg-white cursor-pointer`}>
                                <option value="">Sin categoría</option>
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </Campo>
                    </div>

                    <Campo label="Código de Barras" error={errores.codigoBarras}
                           ayuda="Haz clic aquí y dispara la pistola. Déjalo vacío si el producto no tiene código.">
                        <input type="text" value={form.codigoBarras} onChange={(e) => set('codigoBarras', e.target.value)}
                            // La pistola termina con Enter: evitamos que eso envíe el formulario
                               onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                               placeholder="Escanea o escribe" className={`${inputCls(errores.codigoBarras)} font-mono`} />
                    </Campo>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Campo label="Unidad de Medida" error={errores.unidadMedida}
                               ayuda={tieneStock ? 'No se puede cambiar mientras tenga stock' : undefined}>
                            <select value={form.unidadMedida} disabled={tieneStock}
                                    onChange={(e) => set('unidadMedida', e.target.value as UnidadMedida)}
                                    className={`${inputCls(errores.unidadMedida)} bg-white cursor-pointer`}>
                                {(Object.keys(UNIDAD_LABEL) as UnidadMedida[]).map((u) => (
                                    <option key={u} value={u}>{UNIDAD_LABEL[u]} ({UNIDAD_CORTA[u]})</option>
                                ))}
                            </select>
                        </Campo>
                        <div className="flex items-end pb-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className="text-sm font-semibold text-gray-600" title="Desactívalo para productos exonerados: frutas, verduras, huevos...">
                                    {form.igv ? 'Afecto a IGV (18%)' : 'Exonerado de IGV'}
                                </span>
                                <button type="button" onClick={() => set('igv', !form.igv)}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${form.igv ? 'bg-black' : 'bg-gray-300'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${form.igv ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Campo label={`Precio Costo ${form.igv ? 'con IGV ' : ''}(S/ por ${unidad})`} error={errores.precioCosto}>
                            <input type="number" min="0" step="0.01" value={form.precioCosto}
                                   onChange={(e) => set('precioCosto', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputCls(errores.precioCosto)} />
                            <DesgloseIgv monto={form.precioCosto} afecto={form.igv} />
                        </Campo>
                        <Campo label={`Precio Venta ${form.igv ? 'con IGV ' : ''}(S/ por ${unidad})`} error={errores.precioVenta}>
                            <input type="number" min="0" step="0.01" value={form.precioVenta}
                                   onChange={(e) => set('precioVenta', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputCls(errores.precioVenta)} />
                            <DesgloseIgv monto={form.precioVenta} afecto={form.igv} />
                        </Campo>
                    </div>
                    <Margen costo={form.precioCosto} venta={form.precioVenta} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {editando ? (
                            <Campo label="Stock actual" ayuda="El stock se cambia con compras, ventas o ajustes (queda en el kardex).">
                                <input type="text" disabled value={`${productToEdit.stockActual} ${unidad}`} className={inputCls()} />
                            </Campo>
                        ) : (
                            <Campo label={`Stock Inicial (${unidad})`} error={errores.stockInicial}
                                   ayuda="Lo que tienes ahora en la tienda. Queda registrado en el kardex.">
                                <input type="number" min="0" step={pasoCantidad} value={form.stockInicial}
                                       onChange={(e) => set('stockInicial', e.target.value)}
                                       onWheel={(e) => e.currentTarget.blur()} placeholder="0" className={inputCls(errores.stockInicial)} />
                            </Campo>
                        )}
                        <Campo label={`Stock Mínimo (${unidad})`} error={errores.stockMinimo}
                               ayuda="Cuando baje de aquí, saldrá como 'Bajo Stock'.">
                            <input type="number" min="0" step={pasoCantidad} value={form.stockMinimo}
                                   onChange={(e) => set('stockMinimo', e.target.value)}
                                   onWheel={(e) => e.currentTarget.blur()} placeholder="5" className={inputCls(errores.stockMinimo)} />
                        </Campo>
                    </div>

                    {(form.unidadMedida !== 'UND' || form.plu) && (
                        <Campo label="PLU de la balanza (Opcional)" error={errores.plu}
                               ayuda="El número con el que registraste este producto en la balanza que imprime etiquetas. Al escanear la etiqueta se reconoce el producto y su peso.">
                            <input type="text" inputMode="numeric" maxLength={6} value={form.plu}
                                   onChange={(e) => set('plu', e.target.value.replace(/\D/g, ''))}
                                   placeholder="Ej: 123" className={`${inputCls(errores.plu)} font-mono`} />
                        </Campo>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Campo label="Vencimiento (Opcional)" error={errores.vencimiento}>
                            <input type="date" value={form.vencimiento} onChange={(e) => set('vencimiento', e.target.value)}
                                   className={`${inputCls(errores.vencimiento)} text-gray-600`} />
                        </Campo>
                        <Campo label="URL de imagen (Opcional)" error={errores.imagenURL}>
                            <input type="url" value={form.imagenURL} onChange={(e) => set('imagenURL', e.target.value)}
                                   placeholder="https://..." className={inputCls(errores.imagenURL)} />
                        </Campo>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4">
                    <button type="button" onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                        Cancelar
                    </button>
                    <button type="submit" disabled={guardando}
                            className="px-6 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 shadow-lg transition disabled:opacity-50">
                        {guardando ? 'Guardando...' : editando ? 'Actualizar Producto' : 'Guardar Producto'}
                    </button>
                </div>
            </form>
        </div>
    );
}

/** Debajo de cada precio: la base y el IGV calculados solos (nadie los separa a mano) */
function DesgloseIgv({ monto, afecto }: { monto: string; afecto: boolean }) {
    const n = Number(monto);
    if (!monto.trim() || !Number.isFinite(n) || n <= 0) return null;
    if (!afecto) return <p className="text-xs text-gray-400 mt-1">Exonerado: no lleva IGV</p>;
    const { base, igv } = desglosarIgv(n);
    return (
        <p className="text-xs text-gray-500 mt-1">
            Sin IGV: <b>{formatSoles(base)}</b> · IGV 18%: <b>{formatSoles(igv)}</b>
        </p>
    );
}

/** Ganancia por unidad, para que el dueño vea al toque si el precio está bien puesto */
function Margen({ costo, venta }: { costo: string; venta: string }) {
    const c = Number(costo);
    const v = Number(venta);
    if (!costo.trim() || !venta.trim() || !(c > 0) || !(v > 0)) return null;
    const ganancia = Math.round((v - c) * 100) / 100;
    const pct = (ganancia / c) * 100;
    return (
        <p className={`text-sm -mt-2 ${ganancia < 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {ganancia < 0 ? '⚠ Se vende por debajo del costo: ' : 'Ganancia por unidad: '}
            <b>{formatSoles(ganancia)}</b> ({pct.toFixed(1)}% sobre el costo)
        </p>
    );
}
