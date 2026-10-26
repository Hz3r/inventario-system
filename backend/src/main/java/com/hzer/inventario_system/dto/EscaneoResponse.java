package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;

/**
 * Resultado de escanear un código: puede ser la unidad (botella)
 * o una presentación (caja). factor dice cuántas unidades base descuenta.
 */
public record EscaneoResponse(
        Long productoId,
        String productoNombre,
        Long presentacionId,      // null = unidad base
        String presentacionNombre,
        BigDecimal factor,
        BigDecimal precioVenta,
        UnidadMedida unidadMedida,
        BigDecimal stockActual
) {
}