// src/App.tsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Componentes
import { Sidebar } from './components/layout/Sidebar';
import { SplashScreen } from './components/common/SplashScreen';

// Páginas
import  Proveedores  from './pages/Proveedores';
import  Fiados  from './pages/Fiados';
import  Kardex  from './pages/Kardex';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Ventas } from './pages/Ventas';
import { Ganancia } from './pages/Ganancia';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

function App() {
    // 1. ESTADO INICIAL LEYENDO EL DISCO DURO DEL NAVEGADOR
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('sesionIniciada') === 'true';
    });

    const [isSplashVisible, setIsSplashVisible] = useState(false);

    // Función de Login
    const handleLoginSuccess = () => {
        setIsSplashVisible(true);

        setTimeout(() => {
            setIsSplashVisible(false);
            setIsAuthenticated(true);
            // 2. GUARDAMOS LA SESIÓN
            localStorage.setItem('sesionIniciada', 'true');
        }, 2000);
    };

    // 3. FUNCIÓN DE CERRAR SESIÓN (LOGOUT)
    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('sesionIniciada'); // Borramos la sesión
    };

    if (isSplashVisible) {
        return <SplashScreen />;
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <BrowserRouter>
            <div className="flex min-h-screen bg-gray-50">

                {/* 4. LE PASAMOS LA FUNCIÓN AL SIDEBAR */}
                <Sidebar onLogout={handleLogout} />

                <main className="ml-64 w-full p-8">
                    <Routes>
                        <Route path="/" element={
                            <>
                                <header className="flex justify-between items-center mb-8">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">Tablero Principal</h1>
                                        <p className="text-sm text-gray-500">Resumen general de tu tienda</p>
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 text-sm font-medium text-gray-600">
                                        📅 Hoy, {new Date().toLocaleDateString()}
                                    </div>
                                </header>
                                <Dashboard />
                            </>
                        } />
                        <Route path="/inventario" element={<Inventory />} />
                        <Route path="/ventas" element={<Ventas />} />
                        <Route path="/ganancia" element={<Ganancia />} />
                        <Route path="/configuraciones" element={<Settings />} />
                        <Route path="/proveedores" element={<Proveedores />} />
                        <Route path="/fiados" element={<Fiados />} />
                        <Route path="/kardex" element={<Kardex />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;