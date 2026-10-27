// src/components/balanza/BalanzaEstado.tsx
// Indicador de la balanza conectada: estado, peso en vivo y botón para conectar.
import { Link } from 'react-router-dom';
import { Plug, Scale, Unplug } from 'lucide-react';
import { useBalanza } from './useBalanza';
import { balanza } from '../../utils/balanza';

export function BalanzaEstado({ compacto = false }: { compacto?: boolean }) {
    const { estado, lectura, error } = useBalanza();

    if (estado === 'no-disponible') {
        return (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-500 px-4 py-2.5 rounded-xl text-sm">
                <Scale className="w-4 h-4 shrink-0" />
                <span>
                    La balanza por cable funciona en <b>Chrome o Edge</b> de la computadora donde está conectada
                    (abriendo el sistema en <code>localhost</code> o con <code>https</code>).
                </span>
            </div>
        );
    }

    const conectada = estado === 'conectada';
    const peso = lectura ? `${lectura.kg.toFixed(3)} kg` : '— kg';

    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border ${
            conectada ? 'bg-white border-gray-200' : estado === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <Scale className={`w-5 h-5 shrink-0 ${conectada ? 'text-gray-900' : 'text-gray-400'}`} />

            {conectada ? (
                <>
                    <span className={`font-mono text-lg font-bold tabular-nums ${lectura?.estable ? 'text-gray-900' : 'text-gray-400'}`}>{peso}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        !lectura ? 'bg-gray-100 text-gray-500' : lectura.estable ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {!lectura ? 'esperando datos…' : lectura.estable ? 'estable' : 'moviéndose…'}
                    </span>
                    {compacto && <span className="text-xs text-gray-400 hidden md:inline">F4 vuelve a pesar</span>}
                    <button onClick={() => balanza.desconectar()} title="Desconectar"
                            className="ml-auto p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Unplug className="w-4 h-4" />
                    </button>
                </>
            ) : (
                <>
                    <span className={estado === 'error' ? 'text-red-700' : 'text-amber-800'}>
                        {estado === 'conectando' ? 'Conectando con la balanza…' : error ?? 'Balanza desconectada'}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        {compacto && (
                            <Link to="/configuraciones" state={{ tab: 'balanza' }} className="text-xs font-semibold text-gray-500 hover:text-black">
                                Configurar
                            </Link>
                        )}
                        <button onClick={() => balanza.conectar()} disabled={estado === 'conectando'}
                                className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-800 disabled:opacity-50">
                            <Plug className="w-3.5 h-3.5" /> Conectar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
