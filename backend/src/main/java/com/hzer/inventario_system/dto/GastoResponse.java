package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.CategoriaGasto;
import com.hzer.inventario_system.entities.Gasto;
import com.hzer.inventario_system.entities.MetodoPago;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record GastoResponse(
        Long id,
        LocalDateTime fecha,
        CategoriaGasto categoria,
        String descripcion,
        BigDecimal monto,
        MetodoPago metodoPago,
        boolean deCaja
) {
    public static GastoResponse desde(Gasto g) {
        return new GastoResponse(g.getId(), g.getFecha(), g.getCategoria(), g.getDescripcion(),
                g.getMonto(), g.getMetodoPago(), g.getCaja() != null);
    }
}
