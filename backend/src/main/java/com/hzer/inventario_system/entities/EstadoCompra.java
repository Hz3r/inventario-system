package com.hzer.inventario_system.entities;

public enum EstadoCompra {
    PEDIDO,     // se pidió, todavía no llega (el stock no cambia)
    RECIBIDO,   // llegó: el stock subió por el kardex
    CANCELADO   // no llegó / se anuló el pedido
}
