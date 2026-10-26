package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.EstadoFiado;
import com.hzer.inventario_system.entities.Fiado;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record FiadoResponse(
        Long id,
        LocalDateTime fecha,
        Long ventaId,
        Long ventaNumero,
        BigDecimal montoTotal,
        BigDecimal saldo,
        EstadoFiado estado,
        String nota,
        List<VentaItemResponse> items     // qué llevó (vacío si es una deuda antigua)
) {
    public static FiadoResponse desde(Fiado f) {
        var v = f.getVenta();
        return new FiadoResponse(
                f.getId(), f.getFecha(),
                v != null ? v.getId() : null,
                v != null ? v.getNumero() : null,
                f.getMontoTotal(), f.getSaldo(), f.getEstado(), f.getNota(),
                v != null ? v.getDetalles().stream().map(VentaItemResponse::desde).toList() : List.of());
    }
}
