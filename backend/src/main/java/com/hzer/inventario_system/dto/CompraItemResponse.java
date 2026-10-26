package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.CompraDetalle;
import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;

public record CompraItemResponse(
        Long productoId, String productoNombre, UnidadMedida unidadMedida,
        Long presentacionId, String presentacionNombre,
        BigDecimal cantidad, BigDecimal factor, BigDecimal cantidadBase,
        BigDecimal costoUnitario, BigDecimal subtotal
) {
    public static CompraItemResponse desde(CompraDetalle d) {
        var pr = d.getPresentacion();
        return new CompraItemResponse(d.getProducto().getId(), d.getProducto().getNombre(), d.getProducto().getUnidadMedida(),
                pr != null ? pr.getId() : null, pr != null ? pr.getNombre() : null,
                d.getCantidad(), d.getFactor(), d.getCantidadBase(), d.getCostoUnitario(), d.getSubtotal());
    }
}
