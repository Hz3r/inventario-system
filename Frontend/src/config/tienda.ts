// src/config/tienda.ts
// Datos de la bodega que salen en el ticket y en los mensajes de WhatsApp.
// Se editan en "Configuraciones" y viven en el backend (tabla perfil_tienda).
//
// Aquí se guarda una COPIA en memoria (y en localStorage) para que el ticket
// se imprima al instante, sin esperar al backend en cada venta.
import { configuracionService } from '../services/configuracionService';
import type { PerfilTienda } from '../types/configuracion';

const CLAVE = 'perfil_tienda';

const POR_DEFECTO: PerfilTienda = {
    nombre: 'MI BODEGA',
    razonSocial: null,
    ruc: null,
    desglosaIgv: true,
    direccion: 'Tacna, Perú',
    telefono: null,
    mensajeTicket: '¡Gracias por su compra!',
    anchoTicket: 80,
    logo: null,
    balanzaEtiquetas: false,
    balanzaPrefijo: '20',
    balanzaDigitosPlu: 5,
    balanzaTipoValor: 'PESO',
};

function leerCopia(): PerfilTienda {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado) return { ...POR_DEFECTO, ...JSON.parse(guardado) };
    } catch { /* sin almacenamiento o dato roto: usamos los valores por defecto */ }
    return POR_DEFECTO;
}

let actual: PerfilTienda = leerCopia();

/** Datos actuales de la bodega (lectura inmediata, sin esperar al backend) */
export function tienda(): PerfilTienda {
    return actual;
}

/** Actualiza la copia (se llama al guardar en Configuraciones) */
export function establecerTienda(datos: PerfilTienda): void {
    actual = datos;
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* solo queda en memoria */ }
}

/** Trae los datos del backend al iniciar sesión. Si falla, se queda con la última copia */
export async function cargarTienda(): Promise<void> {
    try {
        establecerTienda(await configuracionService.obtenerTienda());
    } catch { /* sin conexión: seguimos con la copia local */ }
}
