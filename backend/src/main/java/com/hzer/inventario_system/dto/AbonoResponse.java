package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.Abono;
import com.hzer.inventario_system.entities.MetodoPago;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AbonoResponse(
        Long id,
        LocalDateTime fecha,
        BigDecimal monto,
        MetodoPago metodo,
        String referencia,
        Long fiadoId,
        Long ventaNumero     // a qué venta se aplicó (null si era deuda antigua)
) {
    public static AbonoResponse desde(Abono a) {
        var v = a.getFiado().getVenta();
        return new AbonoResponse(a.getId(), a.getFecha(), a.getMonto(), a.getMetodo(), a.getReferencia(),
                a.getFiado().getId(), v != null ? v.getNumero() : null);
    }
}
