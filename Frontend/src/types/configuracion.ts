// src/types/configuracion.ts
// Espejo de PerfilTiendaResponse / PerfilTiendaRequest del backend

export type AnchoTicket = 58 | 80;

export interface PerfilTienda {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    mensajeTicket: string | null;
    anchoTicket: AnchoTicket;
    logo: string | null;          // data URL ("data:image/png;base64,...")
}
