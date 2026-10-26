package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.MetodoPago;

import java.math.BigDecimal;

public interface TotalPorMetodo {
    MetodoPago getMetodo();
    BigDecimal getTotal();
}