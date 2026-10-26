package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;

import java.math.BigDecimal;
import java.util.List;

/** Todo lo que muestra el Tablero, en una sola respuesta */
public record DashboardResponse(
        // Ventas
        BigDecimal ventasHoy,
        long ventasHoyCantidad,
        BigDecimal ventasAyer,
        // Mes
        BigDecimal ventasMes,
        BigDecimal gananciaMes,          // neta: ventas − costo − gastos
        BigDecimal margenMes,
        // Alertas
        long stockBajoCantidad,
        List<ProductoAlerta> stockBajo,  // los 5 más urgentes
        BigDecimal fiadosTotal,
        long clientesConDeuda,
        long pedidosPorLlegar,
        BigDecimal pedidosPorLlegarMonto,
        // Caja abierta ahora (null si no hay)
        CajaResponse caja,
        // Gráfico, top y últimas ventas
        List<GananciaResponse.Dia> ultimos7Dias,
        List<GananciaResponse.ProductoRentable> topSemana,
        List<VentaResponse> ultimasVentas
) {
    public record ProductoAlerta(Long id, String nombre, BigDecimal stockActual, BigDecimal stockMinimo,
                                 UnidadMedida unidadMedida) {
    }
}
