// src/components/common/SplashScreen.tsx
export function SplashScreen() {
    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100]">
            {/* Logo Pulsante */}
            <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mb-8 animate-pulse shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>

            {/* Puntos de carga (Loading dots) */}
            <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>

            <p className="text-gray-400 font-medium text-sm tracking-widest uppercase animate-pulse">
                Preparando tu espacio...
            </p>
        </div>
    );
} 