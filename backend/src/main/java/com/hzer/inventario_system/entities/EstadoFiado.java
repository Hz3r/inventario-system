package com.hzer.inventario_system.entities;

public enum EstadoFiado {
    PENDIENTE,  // no ha pagado nada
    PARCIAL,    // abonó una parte
    PAGADO,     // saldo 0
    ANULADO     // la venta se anuló
}