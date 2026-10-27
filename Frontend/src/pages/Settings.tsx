// src/pages/Settings.tsx
// Configuraciones: datos de la bodega, ticket e impresión, y la cuenta.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SeguridadTab } from '../components/settings/SeguridadTab';
import { BalanzaTab } from '../components/settings/BalanzaTab';
import { configuracionService } from '../services/configuracionService';
import { ApiError } from '../services/api';
import { establecerTienda, tienda } from '../config/tienda';
import { htmlTicket, imprimirTicket } from '../utils/ticket';
import type { PerfilTienda } from '../types/configuracion';
import type { Venta } from '../types/pos';

type Tab = 'general' | 'ticket' | 'balanza' | 'seguridad';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-2';
const CLAVE_AUTO_IMPRIMIR = 'pos_auto_imprimir';   // la misma que usa el Punto de Venta

/** Venta inventada solo para la vista previa y el ticket de prueba */
const VENTA_EJEMPLO: Venta = {
    id: 0, numero: 123, fecha: new Date().toISOString(), cajaId: 0,
    clienteId: null, clienteNombre: null,
    subtotal: 12.5, descuento: 0, total: 12.5, efectivoRecibido: 20, vuelto: 7.5,
    estado: 'COMPLETADA', motivoAnulacion: null, nota: null,
    items: [
        { productoId: 1, presentacionId: null, descripcion: 'Gaseosa 500 ml', cantidad: 2, factor: 1, cantidadBase: 2, precioUnitario: 2.5, descuento: 0, subtotal: 5 },
        { productoId: 2, presentacionId: null, descripcion: 'Arroz (kg)', cantidad: 1.5, factor: 1, cantidadBase: 1.5, precioUnitario: 5, descuento: 0, subtotal: 7.5 },
    ],
    pagos: [{ metodo: 'EFECTIVO', monto: 12.5, referencia: null }],
};

/** Reduce la imagen a 256 px como máximo y la devuelve como PNG (data URL). Así pesa poco */
function prepararLogo(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(archivo);
        img.onload = () => {
            const escala = Math.min(1, 256 / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('sin canvas')); return; }
            ctx.fillStyle = '#fff';                       // fondo blanco (la térmica no imprime transparencias)
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen inválida')); };
        img.src = url;
    });
}

export function Settings() {
    // El Punto de Venta puede mandarnos directo a una pestaña (ej. "Configurar" balanza)
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<Tab>(
        () => (location.state as { tab?: Tab } | null)?.tab ?? 'general');
    const [form, setForm] = useState<PerfilTienda>(tienda());   // arrancamos con la copia local
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState(false);
    const [autoImprimir, setAutoImprimir] = useState(() => {
        try { return localStorage.getItem(CLAVE_AUTO_IMPRIMIR) === 'true'; } catch { return false; }
    });
    const inputLogo = useRef<HTMLInputElement>(null);

    useEffect(() => {
        configuracionService.obtenerTienda()
            .then((datos) => { setForm(datos); establecerTienda(datos); })
            .catch(() => setError('No se pudieron cargar los datos del servidor. Se muestran los últimos guardados.'))
            .finally(() => setCargando(false));
    }, []);

    const cambiar = <K extends keyof PerfilTienda>(campo: K, valor: PerfilTienda[K]) => {
        setForm((f) => ({ ...f, [campo]: valor }));
        setExito(false);
    };

    const elegirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = '';                               // permite volver a elegir el mismo archivo
        if (!archivo) return;
        if (!archivo.type.startsWith('image/')) { setError('Elige una imagen PNG o JPG'); return; }
        try {
            cambiar('logo', await prepararLogo(archivo));
            setError(null);
        } catch {
            setError('No se pudo leer la imagen');
        }
    };

    const cambiarAutoImprimir = (valor: boolean) => {
        setAutoImprimir(valor);
        try { localStorage.setItem(CLAVE_AUTO_IMPRIMIR, String(valor)); } catch { /* solo esta sesión */ }
    };

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        setExito(false);
        try {
            const guardado = await configuracionService.guardarTienda(form);
            setForm(guardado);
            establecerTienda(guardado);                    // el próximo ticket ya sale con los datos nuevos
            setExito(true);
        } catch (err) {
            setError(err instanceof ApiError ? (err.campos ? Object.values(err.campos)[0] : err.message) : 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const getTabClass = (tab: Tab) =>
        activeTab === tab
            ? 'px-6 py-3 bg-black text-white font-bold rounded-xl shadow-md transition'
            : 'px-6 py-3 bg-white text-gray-600 font-medium hover:bg-gray-50 rounded-xl border border-gray-200 transition';

    const tabBtn = (tab: Tab, icono: string, texto: string) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 whitespace-nowrap ${getTabClass(tab)}`}>
            <img src={icono} alt="" className={`w-5 h-5 ${activeTab === tab ? 'brightness-0 invert' : 'opacity-60'}`} />
            {texto}
        </button>
    );

    return (
        <div className="max-w-5xl space-y-8 animate-fade-in">

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
                <p className="text-sm text-gray-500 mt-1">Datos de tu bodega, el ticket, la balanza y tu cuenta.</p>
            </div>

            <div className="flex gap-3 border-b border-gray-200 pb-4 overflow-x-auto">
                {tabBtn('general', '/icons/store.svg', 'Perfil de Tienda')}
                {tabBtn('ticket', '/icons/receipt.svg', 'Ticket e Impresión')}
                {tabBtn('balanza', '/icons/balanza.svg', 'Balanza')}
                {tabBtn('seguridad', '/icons/lock.svg', 'Seguridad y Cuenta')}
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">

                {activeTab !== 'seguridad' && error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                )}
                {activeTab !== 'seguridad' && exito && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
                        Cambios guardados. Los próximos tickets ya salen con estos datos.
                    </div>
                )}

                {/* --- PERFIL DE TIENDA --- */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Información del Negocio</h2>

                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden">
                                {form.logo
                                    ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
                                    : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            </div>
                            <div>
                                <input ref={inputLogo} type="file" accept="image/png,image/jpeg" className="hidden" onChange={elegirLogo} />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => inputLogo.current?.click()}
                                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
                                        {form.logo ? 'Cambiar logo' : 'Subir logo'}
                                    </button>
                                    {form.logo && (
                                        <button type="button" onClick={() => cambiar('logo', null)}
                                            className="text-red-600 px-3 py-2 rounded-lg font-semibold hover:bg-red-50 transition text-sm">
                                            Quitar
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">PNG o JPG. Sale en blanco y negro en el ticket.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelCls}>Nombre del negocio *</label>
                                <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={100}
                                    placeholder="Ej: Bodega Don Lucho" className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>RUC o DNI</label>
                                <input value={form.ruc ?? ''} onChange={(e) => cambiar('ruc', e.target.value.replace(/\D/g, ''))}
                                    maxLength={11} inputMode="numeric" placeholder="Ej: 10456789012 (opcional)" className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Dirección</label>
                                <input value={form.direccion ?? ''} onChange={(e) => cambiar('direccion', e.target.value)} maxLength={255}
                                    placeholder="Ej: Av. Bolognesi 123, Tacna" className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Teléfono / WhatsApp</label>
                                <input value={form.telefono ?? ''} onChange={(e) => cambiar('telefono', e.target.value)} maxLength={20}
                                    inputMode="tel" placeholder="Ej: 952 123 456" className={inputCls} />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TICKET E IMPRESIÓN (con vista previa) --- */}
                {activeTab === 'ticket' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Ticket de venta</h2>

                            <div>
                                <label className={labelCls}>Ancho del papel</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([80, 58] as const).map((mm) => (
                                        <button key={mm} type="button" onClick={() => cambiar('anchoTicket', mm)}
                                            className={`py-3 rounded-xl border-2 font-bold transition ${form.anchoTicket === mm ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                            {mm} mm
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Mide el rollo de tu ticketera: el ancho grande es 80 mm, el chico 58 mm.</p>
                            </div>

                            <div>
                                <label className={labelCls}>Mensaje al pie del ticket</label>
                                <textarea rows={2} value={form.mensajeTicket ?? ''} onChange={(e) => cambiar('mensajeTicket', e.target.value)}
                                    maxLength={255} placeholder="¡Gracias por su compra! Vuelva pronto."
                                    className={`${inputCls} resize-none`} />
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input type="checkbox" checked={autoImprimir} onChange={(e) => cambiarAutoImprimir(e.target.checked)}
                                    className="mt-1 w-4 h-4 accent-black" />
                                <span>
                                    <span className="text-sm font-semibold text-gray-700">Imprimir el ticket automáticamente al cobrar</span>
                                    <span className="block text-xs text-gray-500">Se guarda en este equipo (la PC de la caja), no en los demás.</span>
                                </span>
                            </label>

                            <button type="button" onClick={() => imprimirTicket(VENTA_EJEMPLO, form)}
                                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
                                🖨️ Imprimir ticket de prueba
                            </button>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Vista previa</p>
                            <div className="bg-gray-100 rounded-2xl p-4 flex justify-center">
                                <iframe title="Vista previa del ticket" srcDoc={htmlTicket(VENTA_EJEMPLO, form)}
                                    className="bg-white shadow-md border-0"
                                    style={{ width: form.anchoTicket === 58 ? 230 : 310, height: 520 }} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'balanza' && <BalanzaTab form={form} cambiar={cambiar} />}

                {activeTab === 'seguridad' && <SeguridadTab />}

                {/* Seguridad tiene su propio botón (cambiar contraseña) */}
                {activeTab !== 'seguridad' && (
                    <div className="mt-10 flex justify-end pt-6 border-t border-gray-100">
                        <button onClick={guardar} disabled={guardando || cargando || !form.nombre.trim()}
                            className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
