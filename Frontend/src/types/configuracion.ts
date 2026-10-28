// src/types/configuracion.ts
// Espejo de PerfilTiendaResponse / PerfilTiendaRequest del backend

export type AnchoTicket = 58 | 80;

export interface PerfilTienda {
    nombre: string;               // nombre comercial ("Bodega Don Lucho")
    razonSocial: string | null;   // nombre legal del RUC
    ruc: string | null;
    desglosaIgv: boolean;         // false = Nuevo RUS: el ticket no separa el IGV
    direccion: string | null;
    telefono: string | null;
    mensajeTicket: string | null;
    anchoTicket: AnchoTicket;
    logo: string | null;          // data URL ("data:image/png;base64,...")
    // Etiquetas de la balanza: prefijo + PLU + peso/importe + dígito de control
    balanzaEtiquetas: boolean;
    balanzaPrefijo: string;
    balanzaDigitosPlu: number;
    balanzaTipoValor: TipoValorEtiqueta;
}

export type TipoValorEtiqueta = 'PESO' | 'PRECIO';
