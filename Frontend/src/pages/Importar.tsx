// src/pages/Importar.tsx
// Importar productos, clientes y proveedores desde Excel en 3 pasos:
// 1) descargar la plantilla  2) subir el archivo y revisar la vista previa  3) confirmar.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Info, RotateCcw, Upload, XCircle,
} from 'lucide-react';
import { importacionService } from '../services/importacionService';
import { ApiError } from '../services/api';
import { refrescarNotificaciones } from '../components/notificaciones/useNotificaciones';
import type { AccionImportacion, ImportacionResultado, TipoImportacion } from '../types/importacion';

const TIPOS: { id: TipoImportacion; nombre: string; ayuda: string; ruta: string }[] = [
    {
        id: 'productos', nombre: 'Productos', ruta: '/inventario',
        ayuda: 'Nombre y precio de venta son obligatorios. Si el código de barras o el nombre ya existen, el producto se actualiza; el stock cargado entra por el kardex.',
    },
    {
        id: 'clientes', nombre: 'Clientes', ruta: '/fiados',
        ayuda: 'Solo el nombre es obligatorio. Si el DNI ya existe, se actualizan sus datos (teléfono, límite de crédito…).',
    },
    {
        id: 'proveedores', nombre: 'Proveedores', ruta: '/proveedores',
        ayuda: 'Solo el nombre es obligatorio. Si el RUC ya existe, se actualizan sus datos de contacto.',
    },
];

const ACCION: Record<AccionImportacion, { texto: string; clase: string }> = {
    CREAR: { texto: 'Nuevo', clase: 'bg-green-50 text-green-700 border-green-200' },
    ACTUALIZAR: { texto: 'Actualizar', clase: 'bg-blue-50 text-blue-700 border-blue-200' },
    ERROR: { texto: 'Error', clase: 'bg-red-50 text-red-700 border-red-200' },
};

type FiltroFilas = 'TODAS' | AccionImportacion;

export function Importar() {
    const [tipo, setTipo] = useState<TipoImportacion>('productos');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [resultado, setResultado] = useState<ImportacionResultado | null>(null);
    const [filtro, setFiltro] = useState<FiltroFilas>('TODAS');
    const [ocupado, setOcupado] = useState<'leyendo' | 'guardando' | 'descargando' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [arrastrando, setArrastrando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const info = TIPOS.find((t) => t.id === tipo)!;

    const reiniciar = () => {
        setArchivo(null);
        setResultado(null);
        setError(null);
        setFiltro('TODAS');
        if (inputRef.current) inputRef.current.value = '';
    };

    const cambiarTipo = (t: TipoImportacion) => {
        setTipo(t);
        reiniciar();
    };

    // Al elegir el archivo se pide la vista previa enseguida
    const elegir = async (f: File | undefined) => {
        if (!f) return;
        if (!/\.(xlsx|xls)$/i.test(f.name)) {
            setError('El archivo debe ser un Excel (.xlsx o .xls)');
            return;
        }
        setArchivo(f);
        setResultado(null);
        setError(null);
        setFiltro('TODAS');
        setOcupado('leyendo');
        try {
            setResultado(await importacionService.previsualizar(tipo, f));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo leer el archivo');
        } finally {
            setOcupado(null);
        }
    };

    const confirmar = async () => {
        if (!archivo || !resultado) return;
        const validas = resultado.nuevos + resultado.actualizados;
        if (resultado.conError > 0 && !confirm(
            `${resultado.conError} fila(s) tienen errores y NO se importarán. ¿Importar las otras ${validas}?`)) return;
        setOcupado('guardando');
        setError(null);
        try {
            setResultado(await importacionService.confirmar(tipo, archivo));
            setFiltro('TODAS');
            refrescarNotificaciones();   // el stock pudo cambiar: las alertas se recalculan
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo importar');
        } finally {
            setOcupado(null);
        }
    };

    const descargar = async (accion: () => Promise<void>) => {
        setOcupado('descargando');
        setError(null);
        try {
            await accion();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo descargar');
        } finally {
            setOcupado(null);
        }
    };

    const filas = resultado?.filas.filter((f) => filtro === 'TODAS' || f.accion === filtro) ?? [];
    const validas = resultado ? resultado.nuevos + resultado.actualizados : 0;

    const tabCls = (activo: boolean) =>
        activo
            ? 'bg-black text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md transition'
            : 'bg-white text-gray-700 border border-gray-200 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition';

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Importar desde Excel</h1>
                <p className="text-sm text-gray-500">Carga o actualiza muchos registros de una sola vez</p>
            </div>

            <div className="flex flex-wrap gap-3">
                {TIPOS.map((t) => (
                    <button key={t.id} onClick={() => cambiarTipo(t.id)} className={tabCls(tipo === t.id)} disabled={ocupado !== null}>
                        {t.nombre}
                    </button>
                ))}
            </div>

            {/* ---------------- Paso 1: plantilla ---------------- */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="flex gap-4">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-black text-white font-bold flex items-center justify-center">1</span>
                        <div>
                            <h2 className="font-bold text-gray-900">Prepara tu archivo</h2>
                            <p className="text-sm text-gray-500 mt-1 max-w-2xl">{info.ayuda}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Puedes usar tu propio Excel: se reconocen títulos como “Precio”, “Código”, “Cantidad”, “Celular”, “Correo”…
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => descargar(() => importacionService.descargarPlantilla(tipo))} disabled={ocupado !== null}
                                className="flex items-center gap-2 bg-white text-gray-800 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Plantilla
                        </button>
                        <button onClick={() => descargar(() => importacionService.exportar(tipo))} disabled={ocupado !== null}
                                title="Descarga lo que ya tienes registrado, edítalo en Excel y vuelve a subirlo"
                                className="flex items-center gap-2 bg-white text-gray-800 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50">
                            <Download className="w-4 h-4" /> Mis {info.nombre.toLowerCase()}
                        </button>
                    </div>
                </div>
            </section>

            {/* ---------------- Paso 2: subir ---------------- */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex gap-4 mb-4">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-black text-white font-bold flex items-center justify-center">2</span>
                    <div>
                        <h2 className="font-bold text-gray-900">Sube el Excel y revisa</h2>
                        <p className="text-sm text-gray-500 mt-1">Primero verás una vista previa: todavía no se guarda nada.</p>
                    </div>
                </div>

                <input ref={inputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                       className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files?.[0]); }}
                    disabled={ocupado !== null}
                    className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition ${arrastrando ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'} disabled:opacity-60`}
                >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    {archivo ? (
                        <>
                            <p className="font-semibold text-gray-800">{archivo.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{(archivo.size / 1024).toFixed(0)} KB · haz clic para elegir otro</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-gray-800">Arrastra aquí tu archivo o haz clic para buscarlo</p>
                            <p className="text-xs text-gray-400 mt-1">.xlsx o .xls · máximo 10 MB · se lee la primera hoja</p>
                        </>
                    )}
                </button>

                {ocupado === 'leyendo' && <p className="mt-4 text-sm text-gray-500">Leyendo el archivo…</p>}
                {error && (
                    <div className="mt-4 flex gap-2 items-start bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm">
                        <XCircle className="w-5 h-5 shrink-0" /> <span>{error}</span>
                    </div>
                )}
            </section>

            {/* ---------------- Paso 3: vista previa / resultado ---------------- */}
            {resultado && (
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    {resultado.confirmado ? (
                        <div className="flex gap-3 items-start bg-green-50 border border-green-100 rounded-xl p-4">
                            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                            <div className="flex-1">
                                <p className="font-bold text-green-800">Importación terminada</p>
                                <p className="text-sm text-green-700">
                                    {resultado.nuevos} nuevos y {resultado.actualizados} actualizados.
                                    {resultado.conError > 0 && ` ${resultado.conError} fila(s) no se importaron: corrígelas y vuelve a subir el archivo.`}
                                </p>
                            </div>
                            <Link to={info.ruta} className="text-sm font-bold text-green-800 underline shrink-0">Ver {info.nombre.toLowerCase()}</Link>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <span className="w-8 h-8 shrink-0 rounded-full bg-black text-white font-bold flex items-center justify-center">3</span>
                            <div>
                                <h2 className="font-bold text-gray-900">Vista previa</h2>
                                <p className="text-sm text-gray-500 mt-1">Revisa lo que se hará con cada fila y confirma.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Resumen titulo="Filas leídas" valor={resultado.total} activo={filtro === 'TODAS'} onClick={() => setFiltro('TODAS')} />
                        <Resumen titulo={resultado.confirmado ? 'Creados' : 'Nuevos'} valor={resultado.nuevos} color="text-green-600"
                                 activo={filtro === 'CREAR'} onClick={() => setFiltro('CREAR')} />
                        <Resumen titulo="Actualizados" valor={resultado.actualizados} color="text-blue-600"
                                 activo={filtro === 'ACTUALIZAR'} onClick={() => setFiltro('ACTUALIZAR')} />
                        <Resumen titulo="Con error" valor={resultado.conError} color="text-red-600"
                                 activo={filtro === 'ERROR'} onClick={() => setFiltro('ERROR')} />
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="max-h-[28rem] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="text-left px-4 py-3 w-20">Fila</th>
                                        <th className="text-left px-4 py-3 w-32">Acción</th>
                                        <th className="text-left px-4 py-3">{info.nombre.slice(0, -1)}</th>
                                        <th className="text-left px-4 py-3">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filas.map((f) => (
                                        <tr key={f.numero} className={f.accion === 'ERROR' ? 'bg-red-50/40' : ''}>
                                            <td className="px-4 py-3 font-mono text-gray-500">{f.numero}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ACCION[f.accion].clase}`}>
                                                    {ACCION[f.accion].texto}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{f.descripcion ?? <span className="text-gray-400">(sin nombre)</span>}</td>
                                            <td className="px-4 py-3 space-y-1">
                                                {f.errores.map((m, i) => (
                                                    <p key={`e${i}`} className="flex gap-1.5 text-red-700"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />{m}</p>
                                                ))}
                                                {f.avisos.map((m, i) => (
                                                    <p key={`a${i}`} className="flex gap-1.5 text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{m}</p>
                                                ))}
                                                {f.errores.length === 0 && f.avisos.length === 0 && (
                                                    <p className="flex gap-1.5 text-gray-400"><Info className="w-4 h-4 shrink-0 mt-0.5" />Sin observaciones</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filas.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay filas en este filtro</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        <button onClick={reiniciar} disabled={ocupado !== null}
                                className="flex items-center gap-2 bg-white text-gray-800 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50">
                            <RotateCcw className="w-4 h-4" /> {resultado.confirmado ? 'Importar otro archivo' : 'Cancelar'}
                        </button>
                        {!resultado.confirmado && (
                            <button onClick={confirmar} disabled={ocupado !== null || validas === 0}
                                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition disabled:opacity-50">
                                <Upload className="w-4 h-4" />
                                {ocupado === 'guardando' ? 'Importando…' : `Importar ${validas} ${validas === 1 ? 'fila' : 'filas'}`}
                            </button>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

function Resumen({ titulo, valor, color = 'text-gray-900', activo, onClick }: {
    titulo: string; valor: number; color?: string; activo: boolean; onClick: () => void;
}) {
    return (
        <button onClick={onClick}
                className={`text-left rounded-xl border p-4 transition ${activo ? 'border-black ring-1 ring-black' : 'border-gray-100 hover:border-gray-300'}`}>
            <p className="text-xs text-gray-500 font-medium">{titulo}</p>
            <p className={`text-2xl font-bold ${color}`}>{valor}</p>
        </button>
    );
}
