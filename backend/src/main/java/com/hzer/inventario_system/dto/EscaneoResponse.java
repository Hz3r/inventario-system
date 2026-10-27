package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;

/**
 * Resultado de escanear un código: puede ser la unidad (botella),
 * una presentación (caja) o una etiqueta de balanza (trae la cantidad pesada).
 * factor dice cuántas unidades base descuenta.
 */
public record EscaneoResponse(
        Long productoId,
        String productoNombre,
        Long presentacionId,      // null = unidad base
        String presentacionNombre,
        BigDecimal factor,
        BigDecimal precioVenta,
        UnidadMedida unidadMedida,
        BigDecimal stockActual,
        BigDecimal cantidad,      // solo en etiquetas de balanza: los kilos de la etiqueta (null = 1 unidad)
        BigDecimal importe        // solo en etiquetas con precio: lo que dice la etiqueta en soles
) {
}