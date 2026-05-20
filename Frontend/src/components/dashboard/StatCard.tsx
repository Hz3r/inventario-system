// src/components/dashboard/StatCard.tsx

interface StatCardProps {
    title: string;
    amount: string;
    items: string;
    iconPath: string;
    color: string;
    bgColor: string;
    onAction?: () => void; // <--- 1. AGREGAMOS ESTO PARA RECIBIR EL CLIC
}

export function StatCard({ title, amount, items, iconPath, color, bgColor, onAction }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between h-56 hover:shadow-xl transition-shadow duration-300">

            {/* PARTE SUPERIOR: Icono y Título ALINEADOS HORIZONTALMENTE */}
            <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    <img src={iconPath} alt={title} className="w-8 h-8 opacity-80" />
                </div>

                <h3 className="text-gray-600 font-bold text-xl leading-tight">
                    {title}
                </h3>
            </div>

            {/* PARTE CENTRAL: Monto Gigante */}
            <div className="mt-2 pl-1">
                <p className={`text-4xl font-semibold tracking-tight ${color}`}>{amount}</p>
            </div>

            {/* PARTE INFERIOR: Texto pequeño y Botón GRIS */}
            <div className="flex justify-between items-center mt-4">
                <span className="text-gray-400 font-medium text-sm pl-1">{items}</span>

                {/* 2. LE ASIGNAMOS EL EVENTO AL BOTÓN */}
                <button
                    onClick={onAction}
                    className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                    Ver más
                </button>
            </div>
        </div>
    );
}