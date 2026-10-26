package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.Compra;
import com.hzer.inventario_system.entities.EstadoCompra;
import com.hzer.inventario_system.entities.MetodoPagoCompra;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CompraResponse(
        Long id,
        Long proveedorId,
        String proveedorNombre,
        LocalDateTime fechaPedido,
        LocalDateTime fechaRecepcion,
        EstadoCompra estado,
        BigDecimal total,
        MetodoPagoCompra metodoPago,
        boolean deCaja,
        String nota,
        List<CompraItemResponse> items
) {
    public static CompraResponse desde(Compra c) {
        return new CompraResponse(c.getId(), c.getProveedor().getId(), c.getProveedor().getNombre(),
                c.getFechaPedido(), c.getFechaRecepcion(), c.getEstado(), c.getTotal(), c.getMetodoPago(),
                c.getCaja() != null, c.getNota(),
                c.getDetalles().stream().map(CompraItemResponse::desde).toList());
    }
}
