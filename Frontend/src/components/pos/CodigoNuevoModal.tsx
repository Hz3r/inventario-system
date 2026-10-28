// src/components/pos/CodigoNuevoModal.tsx
// Se escaneó un código que el sistema no conoce. En vez de solo mostrar un error,
// el cajero dice qué es:
//   - un producto que YA está en el inventario (se le asigna el código), o
//   - un producto NUEVO (se registra ahí mismo).
// Desde ese momento el código queda guardado y la próxima vez entra directo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanBarcode, X } from 'lucide-react';
import { inventarioService } from '../../services/inventarioService';
import { ApiError } from '../../services/api';
import { UNIDAD_CORTA, UNIDAD_LABEL, type Producto, type UnidadMedida } from '../../types/inventario';
import { formatCantidad, formatSoles } from '../../utils/formato';
import { desglosarIgv } from '../../utils/igv';

interface Props {
    codigo: string;
    productos: Producto[];
    onListo: (producto: Producto) => void;   // ya tiene el código: se agrega al carrito
    onClose: () => void;
}

type Modo = 'existente' | 'nuevo';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition';

export function CodigoNuevoModal({ codigo, productos, onListo, onClose }: Props) {
    const [modo, setModo] = useState<Modo>('existente');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    // ---- Vincular a uno existente ----
    const [buscar, setBuscar] = useState('');
    const buscarRef = useRef<HTMLInputElement>(null);
    const resultados = useMemo(() => {
        const t = buscar.trim().toLowerCase();
        const lista = t ? productos.filter((p) => p.nombre.toLowerCase().includes(t)) : productos;
        // primero los que todavía no tienen código: son los candidatos más probables
        return [...lista].sort((a, b) => Number(!!a.codigoBarras) - Number(!!b.codigoBarras)).slice(0, 8);
    }, [buscar, productos]);

    // ---- Crear nuevo ----
    const [nombre, setNombre] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
    const [stock, setStock] = useState('');
    const [unidad, setUnidad] = useState<UnidadMedida>('UND');
    const [igv, setIgv] = useState(true);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', onKey);
        };
    }, [guardando, onClose]);

    useEffect(() => { if (modo === 'existente') buscarRef.current?.focus(); }, [modo]);

    const mensaje = (e: unknown, porDefecto: string) =>
        e instanceof ApiError ? (e.campos ? Object.values(e.campos)[0] : e.message) : porDefecto;

    const vincular = async (p: Producto) => {
        if (p.codigoBarras && !window.confirm(
            `${p.nombre} ya tiene el código ${p.codigoBarras}.\n¿Reemplazarlo por ${codigo}?`)) return;
        setGuardando(true);
        setError(null);
        try {
            onListo(await inventarioService.asignarCodigo(p.id, codigo));
        } catch (e) {
            setError(mensaje(e, 'No se pudo asignar el código'));
            setGuardando(false);
        }
    };

    const crear = async (e: React.FormEvent) => {
        e.preventDefault();
        const venta = Number(precioVenta);
        if (!nombre.trim() || !(venta > 0)) {
            setError('Escribe el nombre y el precio de venta');
            return;
        }
        setGuardando(true);
        setError(null);
        try {
            const p = await inventarioService.crearProducto({
                nombre: nombre.trim(),
                codigoBarras: codigo,
                plu: null,
                precioVenta: venta,
                precioCosto: precioCosto.trim() ? Number(precioCosto) : null,
                stockInicial: stock.trim() ? Number(stock) : null,
                unidadMedida: unidad,
                igv,
                stockMinimo: null,
                vencimiento: null,
                imagenURL: null,
                categoriaId: null,
                proveedorId: null,
            });
            onListo(p);
        } catch (err) {
            setError(mensaje(err, 'No se pudo registrar el producto'));
            setGuardando(false);
        }
    };

    const tabCls = (m: Modo) =>
        `flex-1 py-2.5 rounded-xl text-sm font-bold transition ${modo === m ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`;

    const ventaNum = Number(precioVenta);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Código no registrado</h2>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <ScanBarcode className="w-4 h-4" />
                            <span className="font-mono font-bold text-gray-800">{codigo}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Dime qué producto es. Solo se hace una vez: la próxima vez entra directo.</p>
                    </div>
                    <button onClick={onClose} disabled={guardando} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl">
                        <button type="button" className={tabCls('existente')} onClick={() => { setModo('existente'); setError(null); }}>
                            Ya está en mi inventario
                        </button>
                        <button type="button" className={tabCls('nuevo')} onClick={() => { setModo('nuevo'); setError(null); }}>
                            Es un producto nuevo
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}

                    {modo === 'existente' ? (
                        <div className="space-y-3">
                            <input ref={buscarRef} value={buscar} onChange={(e) => setBuscar(e.target.value)}
                                   placeholder="Busca por nombre: agua, arroz, galleta..." className={inputCls} />
                            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                                {resultados.length === 0 ? (
                                    <p className="p-4 text-sm text-gray-400 text-center">
                                        No hay productos con ese nombre. Regístralo en "Es un producto nuevo".
                                    </p>
                                ) : resultados.map((p) => (
                                    <button key={p.id} type="button" disabled={guardando} onClick={() => vincular(p)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center gap-3 disabled:opacity-50">
                                        <span>
                                            <span className="font-medium text-gray-900">{p.nombre}</span>
                                            <span className="block text-xs text-gray-400">
                                                {p.codigoBarras ? `Ya tiene código ${p.codigoBarras}` : 'Sin código de barras'}
                                                {' · '}stock {formatCantidad(p.stockActual)} {UNIDAD_CORTA[p.unidadMedida]}
                                            </span>
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{formatSoles(p.precioVenta)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={crear} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Nombre *</label>
                                <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={255}
                                       placeholder="Ej: Agua San Luis 625 ml" className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-2">Precio venta *</label>
                                    <input type="number" min="0" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)}
                                           onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputCls} />
                                    {ventaNum > 0 && igv && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sin IGV {formatSoles(desglosarIgv(ventaNum).base)} · IGV {formatSoles(desglosarIgv(ventaNum).igv)}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-2">Precio costo</label>
                                    <input type="number" min="0" step="0.01" value={precioCosto} onChange={(e) => setPrecioCosto(e.target.value)}
                                           onWheel={(e) => e.currentTarget.blur()} placeholder="Opcional" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-2">Stock que tienes</label>
                                    <input type="number" min="0" step={unidad === 'UND' ? 1 : 0.001} value={stock} onChange={(e) => setStock(e.target.value)}
                                           onWheel={(e) => e.currentTarget.blur()} placeholder="Opcional" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-2">Se vende por</label>
                                    <select value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadMedida)} className={`${inputCls} bg-white`}>
                                        {(Object.keys(UNIDAD_LABEL) as UnidadMedida[]).map((u) => (
                                            <option key={u} value={u}>{UNIDAD_LABEL[u]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer select-none text-sm">
                                <input type="checkbox" checked={igv} onChange={(e) => setIgv(e.target.checked)} className="w-4 h-4 accent-black" />
                                <span className="font-semibold text-gray-700">Afecto a IGV</span>
                                <span className="text-xs text-gray-400">(desmarca si es exonerado: frutas, verduras, huevos...)</span>
                            </label>
                            <p className="text-xs text-gray-400">La categoría, el proveedor y lo demás los puedes completar después en Inventario.</p>
                            <button type="submit" disabled={guardando}
                                    className="w-full bg-black text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 disabled:opacity-50 transition">
                                {guardando ? 'Registrando...' : 'Registrar y agregar a la venta'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
