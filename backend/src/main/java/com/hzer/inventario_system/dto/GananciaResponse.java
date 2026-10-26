package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.CategoriaGasto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Ganancia de un periodo:
 *   ventas − costo de lo vendido = ganancia bruta
 *   ganancia bruta − gastos     = ganancia neta (lo que de verdad quedó)
 */
public record GananciaResponse(
        LocalDate desde,
        LocalDate hasta,
        long cantidadVentas,
        BigDecimal ventas,
        BigDecimal costoVendido,
        BigDecimal gananciaBruta,
        BigDecimal margen,                          // % de ganancia bruta sobre ventas
        BigDecimal gastos,
        BigDecimal gananciaNeta,
        Map<CategoriaGasto, BigDecimal> gastosPorCategoria,
        List<Dia> porDia,
        List<ProductoRentable> topProductos,        // los que más ganancia dejaron
        List<ProductoQuieto> sinMovimiento,         // con stock pero sin ventas en el periodo
        int productosSinCosto                       // vendidos sin precio de costo (la ganancia sale inflada)
) {
    public record Dia(LocalDate fecha, BigDecimal ventas, BigDecimal costo, BigDecimal gastos, BigDecimal ganancia) {
    }

    public record ProductoRentable(Long productoId, String nombre, BigDecimal cantidad, BigDecimal ventas,
                                   BigDecimal costo, BigDecimal ganancia) {
    }

    public record ProductoQuieto(Long productoId, String nombre, BigDecimal stock, BigDecimal valorEnStock) {
    }
}
