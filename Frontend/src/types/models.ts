export interface Proveedor {
    id: string;
    nombre: string;
    ruc: string;
    contacto: string;
    telefono: string;
}

export interface Fiado {
    id: string;
    cliente: string;
    montoTotal: number;
    montoPagado: number;
    fechaCreacion: string;
    estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
}

export interface KardexEntry {
    id: string;
    fecha: string;
    tipo: 'ENTRADA' | 'SALIDA';
    productoId: string;
    productoNombre: string;
    cantidad: number;
    saldo: number;
    motivo: string; // ej. "Venta #0012", "Compra a Makro"
}