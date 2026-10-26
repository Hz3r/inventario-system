package com.hzer.inventario_system.entities;

/**
 * Por qué cambió el stock.
 * Deben coincidir con el CHECK de la tabla movimientos_inventario (V2).
 */
public enum MotivoMovimiento {
    INICIAL,          // stock con el que se registra el producto
    VENTA,            // sale por una venta
    ANULACION_VENTA,  // vuelve al anular una venta
    COMPRA,           // entra al recibir un pedido del proveedor
    AJUSTE_ENTRADA,   // se contó y había más de lo registrado
    AJUSTE_SALIDA,    // se contó y había menos
    MERMA,            // se malogró, venció o rompió
    DEVOLUCION        // el cliente devolvió algo
}