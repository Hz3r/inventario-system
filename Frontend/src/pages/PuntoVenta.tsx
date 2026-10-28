// src/pages/PuntoVenta.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Scale, ScanBarcode, Trash2 } from 'lucide-react';
import { inventarioService } from '../services/inventarioService';
import { posService } from '../services/posService';
import { ApiError } from '../services/api';
import { UNIDAD_CORTA, type Presentacion, type Producto } from '../types/inventario';
import type { Caja, LineaCarrito, Venta, VentaItemRequest } from '../types/pos';
import { formatCantidad, formatFechaHora, formatSoles } from '../utils/formato';
import { centavos, subtotalLineaCent } from '../utils/dinero';
import { imprimirTicket } from '../utils/ticket';
import { CobroModal } from '../components/pos/CobroModal';
import { CierreCajaModal } from '../components/pos/CierreCajaModal';
import { CodigoNuevoModal } from '../components/pos/CodigoNuevoModal';
import { BalanzaEstado } from '../components/balanza/BalanzaEstado';
import { useBalanza } from '../components/balanza/useBalanza';
import { balanza } from '../utils/balanza';

let contadorLineas = 0;
const nuevaKey = () => `linea-${++contadorLineas}`;

/** "0.750" -> 0.75   |   "" o inválido -> 0 */
const num = (s: string): number => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * "6*7750182000123" o "6x agua" → { cantidad: 6, consulta: "7750182000123" }
 * Así se escribe la cantidad ANTES de pasar el producto por el escáner.
 */
function separarCantidad(valor: string): { cantidad: number | null; consulta: string } {
    const m = valor.trim().match(/^(\d+(?:[.,]\d+)?)\s*[*xX]\s*(.*)$/);
    if (!m) return { cantidad: null, consulta: valor.trim() };
    const cantidad = Number(m[1].replace(',', '.'));
    return { cantidad: cantidad > 0 ? cantidad : null, consulta: m[2].trim() };
}

function crearLinea(p: Producto, pres: Presentacion | null, cantidad = 1): LineaCarrito {
    return {
        key: nuevaKey(),
        productoId: p.id,
        productoNombre: p.nombre,
        unidadMedida: p.unidadMedida,
        stockActual: p.stockActual,
        precioBase: p.precioVenta,
        presentaciones: p.presentaciones,
        presentacionId: pres?.id ?? null,
        presentacionNombre: pres?.nombre ?? null,
        factor: pres?.factor ?? 1,
        precioUnitario: pres?.precioVenta ?? p.precioVenta,
        cantidad: String(cantidad),
        descuento: '',
    };
}

export function PuntoVenta() {
    const inputRef = useRef<HTMLInputElement>(null);

    const [caja, setCaja] = useState<Caja | null | undefined>(undefined); // undefined = cargando
    const [productos, setProductos] = useState<Producto[]>([]);
    const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [descuentoGeneral, setDescuentoGeneral] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);
    const [cobrando, setCobrando] = useState(false);
    const [cerrandoCaja, setCerrandoCaja] = useState(false);
    // Código escaneado que no existe: se abre el modal para vincularlo o registrarlo
    const [codigoNuevo, setCodigoNuevo] = useState<{ codigo: string; veces: number } | null>(null);
    const { estado: estadoBalanza, config: configBalanza } = useBalanza();
    const balanzaLista = configBalanza.activa && estadoBalanza === 'conectada';
    const [pesando, setPesando] = useState<string | null>(null);   // key de la línea que se está pesando
    // Preferencia de ESTA computadora (la caja con impresora la deja activada)
    const [autoImprimir, setAutoImprimir] = useState<boolean>(() => {
        try { return localStorage.getItem('pos_auto_imprimir') === 'true'; } catch { return false; }
    });

    const cambiarAutoImprimir = (valor: boolean) => {
        setAutoImprimir(valor);
        try { localStorage.setItem('pos_auto_imprimir', String(valor)); } catch { /* sin almacenamiento: solo dura la sesión */ }
    };

    const enfocarBuscador = () => setTimeout(() => inputRef.current?.focus(), 0);

    const cargarCaja = useCallback(async () => {
        try {
            setCaja(await posService.cajaActual());
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo consultar la caja');
            setCaja(null);
        }
    }, []);

    const cargarProductos = useCallback(async () => {
        try {
            setProductos(await inventarioService.listarProductos());
        } catch {
            // si falla, el buscador por nombre queda vacío; el escaneo igual funciona
        }
    }, []);

    useEffect(() => {
        cargarCaja();
        cargarProductos();
    }, [cargarCaja, cargarProductos]);

    // ============================ CARRITO ============================

    /**
     * @param cantidadPesada viene de una etiqueta de balanza: la línea entra ya con su peso
     * @param veces          cantidad escrita antes de escanear ("6*" + código = 6 unidades)
     */
    const agregar = (producto: Producto, presentacionId: number | null = null,
                     cantidadPesada: number | null = null, veces = 1) => {
        setError(null);
        setUltimaVenta(null);
        const pres = presentacionId ? producto.presentaciones.find((p) => p.id === presentacionId) ?? null : null;
        // "1.5*arroz": en lo que se vende por kilo, la cantidad escrita son los kilos
        if (cantidadPesada === null && veces !== 1 && producto.unidadMedida !== 'UND' && !pres) {
            cantidadPesada = veces;
            veces = 1;
        }
        if (!Number.isInteger(veces)) {
            setError(`${producto.nombre} se vende por unidad: la cantidad debe ser un número entero`);
            enfocarBuscador();
            return;
        }
        const porPeso = (producto.unidadMedida !== 'UND' && !pres) || cantidadPesada !== null;
        const nueva = crearLinea(producto, pres, cantidadPesada ?? veces);

        setCarrito((prev) => {
            // Lo que se cuenta por unidades se acumula en la misma línea; lo que se pesa va aparte
            const existente = porPeso
                ? undefined
                : prev.find((l) => l.productoId === producto.id && l.presentacionId === (pres?.id ?? null));
            if (existente) {
                return prev.map((l) => (l.key === existente.key ? { ...l, cantidad: String(num(l.cantidad) + veces) } : l));
            }
            return [...prev, nueva];
        });

        if (cantidadPesada !== null) {
            enfocarBuscador();                       // la etiqueta ya trae el peso
        } else if (porPeso && balanzaLista) {
            void pesarLinea(nueva.key);              // se lee la balanza conectada
        } else if (porPeso) {
            enfocarCantidad(nueva.key);              // sin balanza: se escriben los kilos
        } else {
            enfocarBuscador();
        }
    };

    // Producto por peso: el cursor salta a la cantidad para escribir los kilos
    const enfocarCantidad = (key: string) => setTimeout(() => {
        const el = document.getElementById(`cant-${key}`) as HTMLInputElement | null;
        el?.focus();
        el?.select();
    }, 0);

    /** Lee la balanza conectada y pone el peso en la línea */
    const pesarLinea = async (key: string) => {
        setPesando(key);
        try {
            const kg = await balanza.pesar();
            if (kg <= 0) {
                setError('La balanza marca 0. Pon el producto en la balanza y vuelve a pesar (F4).');
                enfocarCantidad(key);
                return;
            }
            actualizarLinea(key, { cantidad: String(kg) });
            enfocarBuscador();
        } catch (e) {
            setError(`${e instanceof Error ? e.message : 'No se pudo leer la balanza'}. Puedes escribir el peso a mano.`);
            enfocarCantidad(key);
        } finally {
            setPesando(null);
        }
    };

    const actualizarLinea = (key: string, cambios: Partial<LineaCarrito>) =>
        setCarrito((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));

    const cambiarPresentacion = (linea: LineaCarrito, presentacionId: number | null) => {
        const pres = linea.presentaciones.find((p) => p.id === presentacionId) ?? null;
        const cant = num(linea.cantidad);
        actualizarLinea(linea.key, {
            presentacionId: pres?.id ?? null,
            presentacionNombre: pres?.nombre ?? null,
            factor: pres?.factor ?? 1,
            precioUnitario: pres?.precioVenta ?? linea.precioBase,
            // una caja no puede ser 0.5: si había decimales, vuelve a 1
            cantidad: pres && !Number.isInteger(cant) ? '1' : linea.cantidad,
            descuento: '',
        });
    };

    const quitarLinea = (key: string) => {
        setCarrito((prev) => prev.filter((l) => l.key !== key));
        enfocarBuscador();
    };

    const vaciar = () => {
        setCarrito([]);
        setDescuentoGeneral('');
        setError(null);
        enfocarBuscador();
    };

    // ======================= BUSCADOR / PISTOLA =======================

    const { cantidad: cantidadEscrita, consulta } = separarCantidad(busqueda);
    const texto = consulta.toLowerCase();
    const sugerencias = useMemo(
        () => (texto.length < 2 || /^\d+$/.test(texto)
            ? []
            : productos.filter((p) => p.nombre.toLowerCase().includes(texto)).slice(0, 8)),
        [productos, texto],
    );

    const onKeyDownBuscador = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setBusqueda('');
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const { cantidad, consulta: valor } = separarCantidad(busqueda);
        if (cantidad !== null && !valor) return;   // escribió "6*": falta pasar el producto
        setBusqueda('');
        if (!valor) return;
        const veces = cantidad ?? 1;

        // Solo números = código de barras (de botella o de caja): lo resuelve el backend
        if (/^\d+$/.test(valor)) {
            try {
                const r = await inventarioService.escanear(valor);
                const producto = productos.find((p) => p.id === r.productoId)
                    ?? await inventarioService.obtenerProducto(r.productoId);
                agregar(producto, r.presentacionId, r.cantidad, veces);
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    setError(null);
                    setCodigoNuevo({ codigo: valor, veces });   // código nuevo: ¿qué producto es?
                } else {
                    setError(err instanceof ApiError ? err.message : 'No se pudo leer el código');
                }
            }
            return;
        }
        // Texto: Enter agrega la primera coincidencia
        if (sugerencias.length > 0) agregar(sugerencias[0], null, null, veces);
        else setError(`No se encontró ningún producto con "${valor}"`);
    };

    // ============================ TOTALES ============================

    const subtotalCent = carrito.reduce(
        (s, l) => s + subtotalLineaCent(l.precioUnitario, num(l.cantidad), num(l.descuento)), 0);
    const descuentoCent = centavos(num(descuentoGeneral));
    const totalCent = subtotalCent - descuentoCent;

    const carritoValido = carrito.length > 0 && carrito.every((l) =>
        num(l.cantidad) > 0 && subtotalLineaCent(l.precioUnitario, num(l.cantidad), num(l.descuento)) >= 0);
    const puedeCobrar = !!caja && carritoValido && totalCent > 0;

    // Lo que se manda al backend: SIN precios (los pone el backend)
    const itemsRequest: VentaItemRequest[] = carrito.map((l) => ({
        productoId: l.productoId,
        presentacionId: l.presentacionId,
        cantidad: num(l.cantidad),
        descuento: num(l.descuento) > 0 ? num(l.descuento) : null,
    }));

    // F2 = cobrar · F4 = volver a pesar el último producto por peso
    const ultimaPorPeso = [...carrito].reverse().find((l) => l.unidadMedida !== 'UND' && l.presentacionId === null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'F2' && puedeCobrar && !cobrando && !cerrandoCaja && !codigoNuevo) {
                e.preventDefault();
                setCobrando(true);
            }
            if (e.key === 'F4' && balanzaLista && ultimaPorPeso && !pesando && !cobrando) {
                e.preventDefault();
                void pesarLinea(ultimaPorPeso.key);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const ventaTerminada = (venta: Venta) => {
        setCobrando(false);
        setUltimaVenta(venta);
        if (autoImprimir) imprimirTicket(venta);
        setCarrito([]);
        setDescuentoGeneral('');
        cargarCaja();        // actualiza "N ventas · S/ total"
        cargarProductos();   // actualiza el stock del buscador
        enfocarBuscador();
    };

    // ============================ PANTALLA ============================

    if (caja === undefined) {
        return <p className="text-gray-400">Cargando punto de venta...</p>;
    }

    if (caja === null) {
        return (
            <AbrirCaja
                errorInicial={error}
                onAbierta={(c) => {
                    setCaja(c);
                    setError(null);
                    enfocarBuscador();
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {cobrando && (
                <CobroModal
                    total={totalCent / 100}
                    descuento={descuentoCent / 100}
                    items={itemsRequest}
                    onClose={() => { setCobrando(false); enfocarBuscador(); }}
                    onDone={ventaTerminada}
                />
            )}
            {codigoNuevo && (
                <CodigoNuevoModal
                    codigo={codigoNuevo.codigo}
                    productos={productos}
                    onClose={() => { setCodigoNuevo(null); enfocarBuscador(); }}
                    onListo={(producto) => {
                        const veces = codigoNuevo.veces;
                        setCodigoNuevo(null);
                        agregar(producto, null, null, veces);
                        cargarProductos();   // el buscador ya conoce el código / producto nuevo
                    }}
                />
            )}
            {cerrandoCaja && (
                <CierreCajaModal
                    caja={caja}
                    onClose={() => setCerrandoCaja(false)}
                    onCerrada={() => {
                        setCerrandoCaja(false);
                        setCarrito([]);
                        setUltimaVenta(null);
                        setCaja(null);
                    }}
                />
            )}

            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
                    <p className="text-sm text-gray-500">
                        Caja abierta desde {formatFechaHora(caja.abiertaEn)} · {caja.cantidadVentas} ventas · {formatSoles(caja.totalVendido)}
                    </p>
                </div>
                <button
                    onClick={() => setCerrandoCaja(true)}
                    className="bg-white border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-gray-800 hover:bg-gray-50 transition"
                >
                    Cerrar caja
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* ---------- Izquierda: buscador + carrito ---------- */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="relative">
                        <ScanBarcode className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            ref={inputRef}
                            autoFocus
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={onKeyDownBuscador}
                            placeholder="Escanea o escribe el producto · para varios: 6* y escanea"
                            className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-black outline-none transition bg-white shadow-sm"
                        />
                        {cantidadEscrita !== null && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white text-sm font-bold px-3 py-1 rounded-lg pointer-events-none">
                                × {formatCantidad(cantidadEscrita)}{!consulta && ' · pasa el producto'}
                            </span>
                        )}
                        {sugerencias.length > 0 && (
                            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                                {sugerencias.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setBusqueda(''); agregar(p, null, null, cantidadEscrita ?? 1); }}
                                        className="w-full text-left px-5 py-3 hover:bg-gray-50 flex justify-between items-center gap-4"
                                    >
                                        <span className="font-medium text-gray-900">{p.nombre}</span>
                                        <span className="text-sm text-gray-500">
                                            {formatSoles(p.precioVenta)}
                                            {p.unidadMedida !== 'UND' && ` /${UNIDAD_CORTA[p.unidadMedida]}`}
                                            {' · '}stock {formatCantidad(p.stockActual)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {configBalanza.activa && <BalanzaEstado compacto />}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                    )}

                    {ultimaVenta && (
                        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
                            ✓ Venta #{ultimaVenta.numero} registrada · Total {formatSoles(ultimaVenta.total)}
                            {ultimaVenta.vuelto !== null && ultimaVenta.vuelto > 0 && (
                                <> · <b>Vuelto {formatSoles(ultimaVenta.vuelto)}</b></>
                            )}
                            {ultimaVenta.clienteNombre && <> · Cliente: {ultimaVenta.clienteNombre}</>}
                            <button
                                onClick={() => { imprimirTicket(ultimaVenta); enfocarBuscador(); }}
                                className="ml-3 px-3 py-1 rounded-lg bg-white border border-green-300 text-green-800 font-bold hover:bg-green-100"
                            >
                                Imprimir ticket
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {carrito.length === 0 ? (
                            <div className="py-20 text-center text-gray-400">
                                <ScanBarcode className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                Escanea el primer producto para empezar
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Producto</th>
                                    <th className="px-4 py-3 text-center">Cantidad</th>
                                    <th className="px-4 py-3 text-right">Precio</th>
                                    <th className="px-4 py-3 text-right">Desc.</th>
                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                    <th className="px-2 py-3" />
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {carrito.map((l) => {
                                    const porPeso = l.unidadMedida !== 'UND' && l.presentacionId === null;
                                    const subCent = subtotalLineaCent(l.precioUnitario, num(l.cantidad), num(l.descuento));
                                    const necesita = num(l.cantidad) * l.factor;
                                    return (
                                        <tr key={l.key}>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-gray-900">{l.productoNombre}</p>
                                                {l.presentaciones.length > 0 ? (
                                                    <select
                                                        value={l.presentacionId ?? ''}
                                                        onChange={(e) => cambiarPresentacion(l, e.target.value ? Number(e.target.value) : null)}
                                                        className="mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                                                    >
                                                        <option value="">Unidad · {formatSoles(l.precioBase)}</option>
                                                        {l.presentaciones.map((p) => (
                                                            <option key={p.id} value={p.id}>{p.nombre} · {formatSoles(p.precioVenta)}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <p className="text-xs text-gray-400">
                                                        {porPeso ? `Por ${UNIDAD_CORTA[l.unidadMedida]}` : 'Por unidad'}
                                                    </p>
                                                )}
                                                {necesita > l.stockActual && (
                                                    <p className="text-xs text-amber-600 mt-1">
                                                        Stock en sistema: {formatCantidad(l.stockActual)} {UNIDAD_CORTA[l.unidadMedida]}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {!porPeso && (
                                                        <button
                                                            onClick={() => actualizarLinea(l.key, { cantidad: String(Math.max(1, num(l.cantidad) - 1)) })}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <input
                                                        id={`cant-${l.key}`}
                                                        type="number"
                                                        min="0"
                                                        step={porPeso ? 0.001 : 1}
                                                        value={l.cantidad}
                                                        onChange={(e) => actualizarLinea(l.key, { cantidad: e.target.value })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enfocarBuscador(); } }}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className={`w-20 text-center border rounded-lg px-2 py-1.5 ${num(l.cantidad) > 0 ? 'border-gray-200' : 'border-red-300'}`}
                                                    />
                                                    {!porPeso && (
                                                        <button
                                                            onClick={() => actualizarLinea(l.key, { cantidad: String(num(l.cantidad) + 1) })}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {porPeso && balanzaLista && (
                                                        <button
                                                            onClick={() => pesarLinea(l.key)}
                                                            disabled={pesando !== null}
                                                            title="Leer el peso de la balanza (F4)"
                                                            className={`p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 ${pesando === l.key ? 'animate-pulse text-black' : 'text-gray-500'}`}
                                                        >
                                                            <Scale className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 text-center mt-1">
                                                    {l.presentacionNombre ?? UNIDAD_CORTA[l.unidadMedida]}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">{formatSoles(l.precioUnitario)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.10"
                                                    value={l.descuento}
                                                    placeholder="0.00"
                                                    onChange={(e) => actualizarLinea(l.key, { descuento: e.target.value })}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1.5"
                                                />
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${subCent < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {formatSoles(subCent / 100)}
                                            </td>
                                            <td className="px-2 py-3 text-right">
                                                <button
                                                    onClick={() => quitarLinea(l.key)}
                                                    title="Quitar"
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ---------- Derecha: totales y cobrar ---------- */}
                <div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 xl:sticky xl:top-8">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal ({carrito.length} {carrito.length === 1 ? 'línea' : 'líneas'})</span>
                            <span className="font-medium">{formatSoles(subtotalCent / 100)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Descuento general</span>
                            <input
                                type="number"
                                min="0"
                                step="0.10"
                                value={descuentoGeneral}
                                placeholder="0.00"
                                onChange={(e) => setDescuentoGeneral(e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1.5"
                            />
                        </div>
                        <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                            <span className="text-gray-500 font-bold">TOTAL</span>
                            <span className={`text-4xl font-bold ${totalCent < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatSoles(totalCent / 100)}
                            </span>
                        </div>
                        <button
                            onClick={() => setCobrando(true)}
                            disabled={!puedeCobrar}
                            className="w-full bg-black text-white py-4 rounded-2xl text-lg font-bold hover:bg-gray-800 disabled:opacity-30 transition"
                        >
                            Cobrar <span className="text-sm font-medium opacity-60">(F2)</span>
                        </button>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoImprimir}
                                onChange={(e) => cambiarAutoImprimir(e.target.checked)}
                                className="w-4 h-4 accent-black"
                            />
                            Imprimir ticket automáticamente al cobrar
                        </label>
                        {carrito.length > 0 && (
                            <button onClick={vaciar} className="w-full text-sm font-bold text-gray-500 hover:text-red-600">
                                Vaciar carrito
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Pantalla cuando no hay caja abierta
// =====================================================================

function AbrirCaja({ errorInicial, onAbierta }: { errorInicial: string | null; onAbierta: (c: Caja) => void }) {
    const [monto, setMonto] = useState('');
    const [nota, setNota] = useState('');
    const [error, setError] = useState<string | null>(errorInicial);
    const [guardando, setGuardando] = useState(false);

    const abrir = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        try {
            onAbierta(await posService.abrirCaja(num(monto), nota.trim() || null));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo abrir la caja');
            setGuardando(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
            <form onSubmit={abrir} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 w-full max-w-md space-y-5">
                <div className="text-center">
                    <div className="bg-black w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <ScanBarcode className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Abrir caja</h1>
                    <p className="text-sm text-gray-500 mt-1">¿Con cuánto sencillo empiezas el turno?</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Monto inicial (S/)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.10"
                        autoFocus
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="50.00"
                        className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Nota (opcional)</label>
                    <input
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Ej: turno mañana"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={guardando}
                    className="w-full bg-black text-white py-4 rounded-2xl text-lg font-bold hover:bg-gray-800 disabled:opacity-50 transition"
                >
                    {guardando ? 'Abriendo...' : 'Abrir caja'}
                </button>
            </form>
        </div>
    );
}
