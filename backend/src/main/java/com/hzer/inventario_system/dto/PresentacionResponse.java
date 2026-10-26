package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.ProductoPresentacion;

import java.math.BigDecimal;

public record PresentacionResponse(
        Long id,
        String nombre,
        BigDecimal factor,
        BigDecimal precioVenta,
        String codigoBarras
) {
    public static PresentacionResponse desde(ProductoPresentacion p) {
        return new PresentacionResponse(p.getId(), p.getNombre(), p.getFactor(),
                p.getPrecioVenta(), p.getCodigoBarras());
    }
}