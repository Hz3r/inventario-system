package com.hzer.inventario_system.entities;

/** Cómo se le pagó al proveedor. Coincide con el CHECK de compras.metodo_pago (V2) */
public enum MetodoPagoCompra {
    EFECTIVO, YAPE, PLIN, TARJETA, TRANSFERENCIA,
    CREDITO     // se le paga después al proveedor
}
