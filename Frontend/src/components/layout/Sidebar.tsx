import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const getLinkClass = (path: string) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            isActive(path)
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-gray-900'
        }`;

    const getIconClass = (path: string) =>
        `w-5 h-5 transition-all ${
            isActive(path)
                ? 'brightness-0'
                : 'group-hover:opacity-80'
        }`;

    return (
        <div className="h-screen w-64 bg-black text-white flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center border border-gray-500">
                    👤
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Gerente</p>
                    <p className="text-xs text-gray-400">admin@grocery.co</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <Link to="/" className={getLinkClass('/')}>
                    <img src="/icons/dashboard.svg" alt="Tablero" className={getIconClass('/')} />
                    <span>Tablero</span>
                </Link>
                <Link to="/ventas" className={getLinkClass('/ventas')}>
                    <img src="/icons/ventas.svg" alt="Ventas" className={getIconClass('/ventas')} />
                    <span>Ventas</span>
                </Link>
                <Link to="/ganancia" className={getLinkClass('/ganancia')}>
                    <img src="/icons/ganancia.svg" alt="Ganancia" className={getIconClass('/ganancia')} />
                    <span>Ganancia</span>
                </Link>
                <Link to="/inventario" className={getLinkClass('/inventario')}>
                    <img src="/icons/inventario.svg" alt="Inventario" className={getIconClass('/inventario')} />
                    <span>Inventario</span>
                </Link>
                <Link to="/kardex" className={getLinkClass('/kardex')}>
                    <img src="/icons/list.svg" alt="Kardex" className={getIconClass('/kardex')} />
                    <span>Kardex</span>
                </Link>
                <Link to="/proveedores" className={getLinkClass('/proveedores')}>
                    <img src="/icons/store.svg" alt="Proveedores" className={getIconClass('/proveedores')} />
                    <span>Proveedores</span>
                </Link>
                <Link to="/fiados" className={getLinkClass('/fiados')}>
                    <img src="/icons/fiados.svg" alt="Fiados" className={getIconClass('/fiados')} />
                    <span>Fiados</span>
                </Link>
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-2">
                <Link to="/configuraciones" className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-900 rounded-lg transition-colors">
                    <img src="/icons/settings.svg" alt="Config" className="w-5 h-5" />
                    Configuraciones
                </Link>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-900 rounded-lg transition-colors text-left"
                >
                    <img src="/icons/logout.svg" alt="Salir" className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}