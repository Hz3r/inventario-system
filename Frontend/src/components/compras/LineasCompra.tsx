// src/components/compras/LineasCompra.tsx
// Editor de las líneas de un pedido/compra: se usa al crear el pedido y al recibirlo.
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { UNIDAD_CORTA, type Presentacion, type Producto, type UnidadMedida } from '../../types/inventario';
import type { CompraItemRequest } from '../../types/compras';
import { formatCantidad, formatSoles } from '../../utils/formato';
import { centavos } from '../../utils/dinero';

export interface LineaCompra {
    key: string;
    productoId: number;
    productoNombre: string;
    unidadMedida: UnidadMedida;
    presentaciones: Presentacion[];
    costoBase: number | null;        // precio de costo actual por unidad base
    presentacionId: number | null;
    cantidad: string;
    costo: string;                   // costo de UNA presentación
}

let contador = 0;
export const nuevaLineaKey = () => `lc-${++contador}`;

const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

const factorDe = (l: LineaCompra) => l.presentaciones.find((p) => p.id === l.presentacionId)?.factor ?? 1;

/** Costo sugerido: costo base × unidades de la presentación */
const costoSugerido = (costoBase: number | null, factor: number) =>
    costoBase !== null && costoBase > 0 ? (costoBase * factor).toFixed(2) : '';

export function lineaDesdeProducto(p: Producto): LineaCompra {
    // Por defecto la presentación más grande: a los proveedores se les compra por caja
    const mayor = [...p.presentaciones].sort((a, b) => b.factor - a.factor)[0] ?? null;
    return {
        key: nuevaLineaKey(),
        productoId: p.id,
        productoNombre: p.nombre,
        unidadMedida: p.unidadMedida,
        presentaciones: p.presentaciones,
        costoBase: p.precioCosto,
        presentacionId: mayor?.id ?? null,
        cantidad: '1',
        costo: costoSugerido(p.precioCosto, mayor?.factor ?? 1),
    };
}

export const totalCentLineas = (lineas: LineaCompra[]) =>
    lineas.reduce((s, l) => s + centavos(num(l.costo) * num(l.cantidad)), 0);

export const lineasValidas = (lineas: LineaCompra[]) =>
    lineas.length > 0 && lineas.every((l) => num(l.cantidad) > 0 && l.costo.trim() !== '' && Number(l.costo) >= 0);

export const aItems = (lineas: LineaCompra[]): CompraItemRequest[] =>
    lineas.map((l) => ({
        productoId: l.productoId,
        presentacionId: l.presentacionId,
        cantidad: num(l.cantidad),
        costoUnitario: Number(l.costo) || 0,
    }));

interface Props {
    lineas: LineaCompra[];
    onChange: (lineas: LineaCompra[]) => void;
    productos: Producto[];
}

export function LineasCompra({ lineas, onChange, productos }: Props) {
    const [buscar, setBuscar] = useState('');

    const texto = buscar.trim().toLowerCase();
    const sugerencias = useMemo(
        () => (texto.length < 2 ? [] : productos.filter((p) =>
            p.nombre.toLowerCase().includes(texto) || p.codigoBarras === texto
            || p.presentaciones.some((pr) => pr.codigoBarras === texto)).slice(0, 8)),
        [productos, texto],
    );

    const agregar = (p: Producto) => {
        setBuscar('');
        onChange([...lineas, lineaDesdeProducto(p)]);
    };

    const actualizar = (key: string, cambios: Partial<LineaCompra>) =>
        onChange(lineas.map((l) => (l.key === key ? { ...l, ...cambios } : l)));

    const cambiarPresentacion = (l: LineaCompra, presentacionId: number | null) => {
        const factor = l.presentaciones.find((p) => p.id === presentacionId)?.factor ?? 1;
        actualizar(l.key, { presentacionId, costo: costoSugerido(l.costoBase, factor) || l.costo });
    };

    return (
        <div className="space-y-3">
            {/* Buscador de productos (también acepta el código de barras) */}
            <div className="relative">
                <input
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (sugerencias[0]) agregar(sugerencias[0]);
                        }
                    }}
                    placeholder="Agregar producto: escribe el nombre o escanea el código..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none"
                />
                {sugerencias.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
                        {sugerencias.map((p) => (
                            <button type="button" key={p.id} onClick={() => agregar(p)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex justify-between text-sm">
                                <span className="font-medium">{p.nombre}</span>
                                <span className="text-gray-500">
                                    costo {formatSoles(p.precioCosto)} · stock {formatCantidad(p.stockActual)} {UNIDAD_CORTA[p.unidadMedida]}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {lineas.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Todavía no agregaste productos.</p>
            ) : (
                <div className="border border-gray-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-center">Cantidad</th>
                            <th className="px-3 py-2 text-right">Costo c/u</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                            <th className="px-2 py-2" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {lineas.map((l) => {
                            const factor = factorDe(l);
                            const unidad = UNIDAD_CORTA[l.unidadMedida];
                            const entra = num(l.cantidad) * factor;
                            return (
                                <tr key={l.key}>
                                    <td className="px-3 py-2">
                                        <p className="font-bold text-gray-900">{l.productoNombre}</p>
                                        {l.presentaciones.length > 0 ? (
                                            <select
                                                value={l.presentacionId ?? ''}
                                                onChange={(e) => cambiarPresentacion(l, e.target.value ? Number(e.target.value) : null)}
                                                className="mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                                            >
                                                <option value="">Por {unidad}</option>
                                                {l.presentaciones.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.nombre} ({formatCantidad(p.factor)} {unidad})</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-gray-400">Por {unidad}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <input
                                            type="number" min="0" step={l.unidadMedida === 'UND' || l.presentacionId ? 1 : 0.001}
                                            value={l.cantidad}
                                            onChange={(e) => actualizar(l.key, { cantidad: e.target.value })}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5"
                                        />
                                        {factor !== 1 && <p className="text-[11px] text-gray-400 mt-1">= {formatCantidad(entra)} {unidad}</p>}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number" min="0" step="0.10"
                                            value={l.costo}
                                            onChange={(e) => actualizar(l.key, { costo: e.target.value })}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            placeholder="0.00"
                                            className={`w-24 text-right border rounded-lg px-2 py-1.5 ${l.costo.trim() === '' ? 'border-red-300' : 'border-gray-200'}`}
                                        />
                                        {factor !== 1 && num(l.costo) > 0 && (
                                            <p className="text-[11px] text-gray-400 mt-1">{formatSoles(num(l.costo) / factor)} por {unidad}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold">{formatSoles(centavos(num(l.costo) * num(l.cantidad)) / 100)}</td>
                                    <td className="px-2 py-2 text-right">
                                        <button type="button" onClick={() => onChange(lineas.filter((x) => x.key !== l.key))}
                                                className="p-1.5 text-gray-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
