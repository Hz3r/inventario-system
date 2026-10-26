package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MotivoMovimiento;
import com.hzer.inventario_system.entities.MovimientoInventario;
import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MovimientoResponse(
        Long id,
        LocalDateTime fecha,
        Long productoId,
        String productoNombre,
        UnidadMedida unidadMedida,
        MotivoMovimiento motivo,
        BigDecimal cantidad,
        BigDecimal stockAnterior,
        BigDecimal stockResultante,
        BigDecimal costoUnitario,
        Long ventaId,
        Long compraId,
        String nota
) {
    public static MovimientoResponse desde(MovimientoInventario m) {
        return new MovimientoResponse(
                m.getId(), m.getFecha(),
                m.getProducto().getId(), m.getProducto().getNombre(), m.getProducto().getUnidadMedida(),
                m.getMotivo(), m.getCantidad(), m.getStockAnterior(), m.getStockResultante(),
                m.getCostoUnitario(), m.getVentaId(), m.getCompraId(), m.getNota()
        );
    }
}