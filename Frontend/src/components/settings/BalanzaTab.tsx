// src/components/settings/BalanzaTab.tsx
// Configuración de la balanza electrónica:
//  1) Balanza conectada por cable a ESTA computadora (se guarda en este navegador).
//  2) Etiquetas con código de barras que imprime la balanza (se guarda en el servidor, vale para todas las cajas).
import { useState } from 'react';
import { BalanzaEstado } from '../balanza/BalanzaEstado';
import { useBalanza } from '../balanza/useBalanza';
import { balanza, type ConfigBalanza, type ComandoBalanza, type UnidadBalanza } from '../../utils/balanza';
import { inventarioService } from '../../services/inventarioService';
import { ApiError } from '../../services/api';
import { formatSoles } from '../../utils/formato';
import type { PerfilTienda } from '../../types/configuracion';
import type { Escaneo } from '../../types/inventario';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition bg-white';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-2';

const VELOCIDADES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

const COMANDOS: { valor: ComandoBalanza; texto: string }[] = [
    { valor: 'NINGUNO', texto: 'Ninguno: la balanza manda el peso sola (continuo)' },
    { valor: 'W', texto: 'W (CAS, Excell y similares)' },
    { valor: 'P', texto: 'P (Toledo / Mettler y similares)' },
    { valor: 'S', texto: 'S + Enter (protocolo SICS)' },
    { valor: 'ENQ', texto: 'ENQ (0x05)' },
    { valor: 'PERSONALIZADO', texto: 'Otro (escribirlo)' },
];

interface Props {
    form: PerfilTienda;
    cambiar: <K extends keyof PerfilTienda>(campo: K, valor: PerfilTienda[K]) => void;
}

export function BalanzaTab({ form, cambiar }: Props) {
    return (
        <div className="space-y-10 animate-fade-in-up">
            <BalanzaPorCable />
            <hr className="border-gray-100" />
            <EtiquetasBalanza form={form} cambiar={cambiar} />
        </div>
    );
}

// =====================================================================
// 1) Balanza por cable
// =====================================================================

function BalanzaPorCable() {
    const { config, estado, lectura } = useBalanza();
    const [prueba, setPrueba] = useState<string | null>(null);

    const set = <K extends keyof ConfigBalanza>(campo: K, valor: ConfigBalanza[K]) =>
        balanza.guardarConfig({ ...config, [campo]: valor });

    const probar = async () => {
        setPrueba('Pesando…');
        try {
            const kg = await balanza.pesar();
            setPrueba(`✓ Peso leído: ${kg.toFixed(3)} kg`);
        } catch (e) {
            setPrueba(`✗ ${e instanceof Error ? e.message : 'No se pudo leer'}`);
        }
    };

    return (
        <section className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-900">Balanza conectada a esta computadora</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Para balanzas con cable USB o RS-232 (serial). En el Punto de Venta, al agregar un producto que se vende por
                    kilo, el peso se lee solo. Esta configuración se guarda <b>solo en esta computadora</b>.
                </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={config.activa} onChange={(e) => set('activa', e.target.checked)}
                       className="w-5 h-5 accent-black" />
                <span className="font-semibold text-gray-800">Usar balanza en esta computadora</span>
            </label>

            {config.activa && (
                <>
                    <BalanzaEstado />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelCls}>Velocidad (baudios)</label>
                            <select value={config.baudRate} onChange={(e) => set('baudRate', Number(e.target.value))} className={inputCls}>
                                {VELOCIDADES.map((v) => <option key={v} value={v}>{v}{v === 9600 ? ' (la más común)' : ''}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Comando para pedir el peso</label>
                            <select value={config.comando} onChange={(e) => set('comando', e.target.value as ComandoBalanza)} className={inputCls}>
                                {COMANDOS.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                            </select>
                        </div>
                        {config.comando === 'PERSONALIZADO' && (
                            <div className="md:col-span-2">
                                <label className={labelCls}>Comando</label>
                                <input value={config.comandoPersonalizado} onChange={(e) => set('comandoPersonalizado', e.target.value)}
                                       placeholder="Ej: W\r  o  \x05" className={`${inputCls} font-mono`} />
                                <p className="text-xs text-gray-400 mt-1">Usa \r para Enter, \n para salto de línea y \xNN para un byte (ej. \x05).</p>
                            </div>
                        )}
                        <div>
                            <label className={labelCls}>Unidad que manda la balanza</label>
                            <select value={config.unidad} onChange={(e) => set('unidad', e.target.value as UnidadBalanza)} className={inputCls}>
                                <option value="AUTO">Automática (la que diga; si no dice, kg)</option>
                                <option value="KG">Kilos</option>
                                <option value="G">Gramos</option>
                                <option value="LB">Libras</option>
                            </select>
                        </div>
                        <details className="md:col-span-2 text-sm">
                            <summary className="cursor-pointer font-semibold text-gray-600">Opciones avanzadas del puerto</summary>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <label className={labelCls}>Bits de datos</label>
                                    <select value={config.dataBits} onChange={(e) => set('dataBits', Number(e.target.value) as 7 | 8)} className={inputCls}>
                                        <option value={8}>8</option><option value={7}>7</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Paridad</label>
                                    <select value={config.parity} onChange={(e) => set('parity', e.target.value as ConfigBalanza['parity'])} className={inputCls}>
                                        <option value="none">Ninguna</option><option value="even">Par</option><option value="odd">Impar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Bits de parada</label>
                                    <select value={config.stopBits} onChange={(e) => set('stopBits', Number(e.target.value) as 1 | 2)} className={inputCls}>
                                        <option value={1}>1</option><option value={2}>2</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Lecturas iguales</label>
                                    <input type="number" min={1} max={10} value={config.lecturasIguales}
                                           onChange={(e) => set('lecturasIguales', Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                                           className={inputCls} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                “Lecturas iguales”: si la balanza no avisa cuándo el peso está quieto, se considera estable
                                cuando llegan esas lecturas seguidas con el mismo valor.
                            </p>
                        </details>
                    </div>

                    {estado === 'conectada' && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <button onClick={probar} className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-800">
                                    Probar: pedir peso
                                </button>
                                {prueba && <span className="text-sm font-medium text-gray-700">{prueba}</span>}
                            </div>
                            <p className="text-xs text-gray-500">
                                Última línea recibida: <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{lectura?.texto || '(nada todavía)'}</code>
                                {' '}— si no llega nada, prueba otra velocidad o elige un comando.
                            </p>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

// =====================================================================
// 2) Etiquetas con código de barras
// =====================================================================

function EtiquetasBalanza({ form, cambiar }: Props) {
    const [codigo, setCodigo] = useState('');
    const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

    const digitosValor = 12 - form.balanzaPrefijo.length - form.balanzaDigitosPlu;
    const ejemplo = form.balanzaPrefijo.padEnd(form.balanzaPrefijo.length, '0')
        + '123'.padStart(form.balanzaDigitosPlu, '0')
        + (form.balanzaTipoValor === 'PESO' ? '1250' : '875').padStart(digitosValor, '0');

    const probar = async (e: React.FormEvent) => {
        e.preventDefault();
        const c = codigo.trim();
        if (!c) return;
        try {
            const r: Escaneo = await inventarioService.escanear(c);
            setResultado({
                ok: true,
                texto: r.cantidad !== null
                    ? `${r.productoNombre}: ${r.cantidad} ${r.unidadMedida.toLowerCase()}${r.importe !== null ? ` (${formatSoles(r.importe)})` : ''}`
                    : `${r.productoNombre} (código normal, no es etiqueta de balanza)`,
            });
        } catch (err) {
            setResultado({ ok: false, texto: err instanceof ApiError ? err.message : 'No se pudo leer el código' });
        }
    };

    return (
        <section className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-gray-900">Etiquetas con código de barras</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Si tu balanza imprime etiquetas, al escanearlas en el Punto de Venta se agrega el producto con su peso.
                    Cada producto necesita su <b>PLU</b> (el mismo número que tiene en la balanza): ponlo en Inventario → Editar producto.
                    Esta configuración vale para todas las cajas. <b>Se guarda con el botón de abajo.</b>
                </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.balanzaEtiquetas} onChange={(e) => cambiar('balanzaEtiquetas', e.target.checked)}
                       className="w-5 h-5 accent-black" />
                <span className="font-semibold text-gray-800">Reconocer etiquetas de la balanza</span>
            </label>

            {form.balanzaEtiquetas && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className={labelCls}>Prefijo</label>
                            <input value={form.balanzaPrefijo} maxLength={2} inputMode="numeric"
                                   onChange={(e) => cambiar('balanzaPrefijo', e.target.value.replace(/\D/g, ''))}
                                   className={`${inputCls} font-mono`} placeholder="20" />
                            <p className="text-xs text-gray-400 mt-1">Con lo que empiezan las etiquetas (casi siempre 20 o 2).</p>
                        </div>
                        <div>
                            <label className={labelCls}>Dígitos del PLU</label>
                            <select value={form.balanzaDigitosPlu} onChange={(e) => cambiar('balanzaDigitosPlu', Number(e.target.value))} className={inputCls}>
                                {[4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>La etiqueta trae</label>
                            <select value={form.balanzaTipoValor} onChange={(e) => cambiar('balanzaTipoValor', e.target.value as PerfilTienda['balanzaTipoValor'])} className={inputCls}>
                                <option value="PESO">El peso (en gramos)</option>
                                <option value="PRECIO">El importe (en céntimos)</option>
                            </select>
                        </div>
                    </div>

                    {form.balanzaPrefijo.length > 0 && digitosValor >= 4 && digitosValor <= 6 ? (
                        <div className="bg-gray-50 rounded-xl p-4 text-sm">
                            <p className="font-semibold text-gray-700 mb-2">Así se lee una etiqueta:</p>
                            <p className="font-mono text-lg tracking-wider">
                                <span className="text-gray-400">{ejemplo.slice(0, form.balanzaPrefijo.length)}</span>
                                <span className="text-blue-600 font-bold"> {ejemplo.slice(form.balanzaPrefijo.length, form.balanzaPrefijo.length + form.balanzaDigitosPlu)}</span>
                                <span className="text-green-600 font-bold"> {ejemplo.slice(form.balanzaPrefijo.length + form.balanzaDigitosPlu)}</span>
                                <span className="text-gray-400"> X</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                <span className="text-gray-400">prefijo</span> · <span className="text-blue-600">PLU 123</span> ·{' '}
                                <span className="text-green-600">{form.balanzaTipoValor === 'PESO' ? '1.250 kg' : 'S/ 8.75'}</span> ·{' '}
                                <span className="text-gray-400">dígito de control</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-red-600">
                            Con ese prefijo y ese PLU quedan {digitosValor} dígitos para el valor; deben ser entre 4 y 6.
                        </p>
                    )}

                    <form onSubmit={probar} className="flex gap-3">
                        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={`${inputCls} font-mono`}
                               placeholder="Escanea una etiqueta para probar (guarda primero)" />
                        <button type="submit" className="bg-white border border-gray-200 px-5 rounded-xl font-bold text-sm hover:bg-gray-50 whitespace-nowrap">
                            Probar
                        </button>
                    </form>
                    {resultado && (
                        <p className={`text-sm font-medium ${resultado.ok ? 'text-green-700' : 'text-red-600'}`}>
                            {resultado.ok ? '✓ ' : '✗ '}{resultado.texto}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
