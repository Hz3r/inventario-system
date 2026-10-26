// src/components/settings/SeguridadTab.tsx
import { useState } from 'react';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition';

export function SeguridadTab() {
    const usuario = authService.usuario();
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [repetir, setRepetir] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const noCoinciden = repetir !== '' && nueva !== repetir;

    const cambiar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (noCoinciden) return;
        setGuardando(true);
        setError(null);
        setExito(false);
        try {
            await authService.cambiarClave(actual, nueva);
            setExito(true);
            setActual('');
            setNueva('');
            setRepetir('');
        } catch (err) {
            setError(err instanceof ApiError ? (err.campos ? Object.values(err.campos)[0] : err.message) : 'No se pudo cambiar la contraseña');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Tu cuenta</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                        <input value={usuario?.nombre ?? ''} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Correo (para iniciar sesión)</label>
                        <input value={usuario?.email ?? ''} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    La sesión dura 30 días en cada equipo (esta PC, tu celular...). "Cerrar sesión" la termina en este equipo.
                </p>
            </div>

            <form onSubmit={cambiar} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">Cambiar contraseña</h2>
                {exito && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
                        ✓ Contraseña actualizada. Úsala la próxima vez que inicies sesión.
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña actual</label>
                        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} className={inputCls} autoComplete="current-password" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva contraseña</label>
                        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={inputCls} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Repite la nueva</label>
                        <input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)}
                               className={`${inputCls} ${noCoinciden ? 'border-red-300' : ''}`} autoComplete="new-password" />
                        {noCoinciden && <p className="text-xs text-red-600 mt-1">No coinciden</p>}
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={guardando || !actual || nueva.length < 6 || noCoinciden || !repetir}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-30"
                >
                    {guardando ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
            </form>
        </div>
    );
}
