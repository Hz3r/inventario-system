// src/components/balanza/useBalanza.ts
import { useEffect, useSyncExternalStore } from 'react';
import { balanza } from '../../utils/balanza';

/** Estado de la balanza (conexión, último peso, configuración). Se actualiza con cada lectura */
export function useBalanza() {
    const snapshot = useSyncExternalStore(balanza.suscribir, balanza.obtener);

    // Si ya se dio permiso antes, se conecta sola al abrir la pantalla
    useEffect(() => {
        void balanza.reconectar();
    }, []);

    return snapshot;
}
