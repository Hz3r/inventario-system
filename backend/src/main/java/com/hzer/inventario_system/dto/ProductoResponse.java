package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.Producto;
import com.hzer.inventario_system.entities.ProductoPresentacion;
import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProductoResponse(
        Long id,
        String nombre,
        String codigoBarras,
        String plu,
        Long categoriaId,
        String categoriaNombre,
        Long proveedorId,
        String proveedorNombre,
        BigDecimal precioCosto,
        BigDecimal precioVenta,
        BigDecimal stockActual,
        BigDecimal stockMinimo,
        UnidadMedida unidadMedida,
        EstadoStock estadoStock,
        LocalDate vencimiento,
        String imagenURL,
        Boolean igv,
        Boolean activo,
        List<PresentacionResponse> presentaciones
) {
    public static ProductoResponse desde(Producto p, List<ProductoPresentacion> presentaciones) {
        return new ProductoResponse(
                p.getId(),
                p.getNombre(),
                p.getCodigoBarras(),
                p.getPlu(),
                p.getCategoria() != null ? p.getCategoria().getId() : null,
                p.getCategoria() != null ? p.getCategoria().getNombre() : null,
                p.getProveedor() != null ? p.getProveedor().getId() : null,
                p.getProveedor() != null ? p.getProveedor().getNombre() : null,
                p.getPrecioCosto(),
                p.getPrecioVenta(),
                p.getStockActual(),
                p.getStockMinimo(),
                p.getUnidadMedida(),
                calcularEstado(p),
                p.getVencimiento(),
                p.getImagenURL(),
                p.getIgv(),
                p.getActivo(),
                presentaciones.stream().map(PresentacionResponse::desde).toList()
        );
    }

    private static EstadoStock calcularEstado(Producto p) {
        BigDecimal stock = p.getStockActual() != null ? p.getStockActual() : BigDecimal.ZERO;
        if (stock.signum() <= 0) return EstadoStock.SIN_STOCK;
        if (p.getStockMinimo() != null && stock.compareTo(p.getStockMinimo()) <= 0) return EstadoStock.BAJO_STOCK;
        return EstadoStock.EN_STOCK;
    }
}