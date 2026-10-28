package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.VentaDetalle;

import java.math.BigDecimal;

public record VentaItemResponse(
        Long productoId,
        Long presentacionId,
        String descripcion,
        BigDecimal cantidad,
        BigDecimal factor,
        BigDecimal cantidadBase,
        BigDecimal precioUnitario,
        BigDecimal descuento,
        BigDecimal subtotal,
        boolean afectoIgv
) {
    public static VentaItemResponse desde(VentaDetalle d) {
        return new VentaItemResponse(
                d.getProducto().getId(),
                d.getPresentacion() != null ? d.getPresentacion().getId() : null,
                d.getDescripcion(), d.getCantidad(), d.getFactor(), d.getCantidadBase(),
                d.getPrecioUnitario(), d.getDescuento(), d.getSubtotal(),
                !Boolean.FALSE.equals(d.getAfectoIgv()));
    }
}