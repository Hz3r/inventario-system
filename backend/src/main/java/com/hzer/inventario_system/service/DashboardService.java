package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.entities.EstadoCompra;
import com.hzer.inventario_system.entities.EstadoVenta;
import com.hzer.inventario_system.entities.Producto;
import com.hzer.inventario_system.repository.CompraRepository;
import com.hzer.inventario_system.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Arma el Tablero reutilizando los servicios que ya existen
 * (ganancia, fiados, caja, ventas): no repite ninguna regla de negocio.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final GananciaService gananciaService;
    private final FiadoService fiadoService;
    private final CajaService cajaService;
    private final VentaService ventaService;
    private final ProductoRepository productoRepository;
    private final CompraRepository compraRepository;

    public DashboardResponse resumen() {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Lima"));

        // Últimos 7 días (incluye hoy y ayer) y el mes en curso
        GananciaResponse semana = gananciaService.calcular(hoy.minusDays(6), hoy);
        GananciaResponse mes = gananciaService.calcular(hoy.withDayOfMonth(1), hoy);

        List<GananciaResponse.Dia> dias = semana.porDia();
        GananciaResponse.Dia diaHoy = dias.get(dias.size() - 1);
        GananciaResponse.Dia diaAyer = dias.get(dias.size() - 2);

        List<VentaResponse> ventasHoy = ventaService.entreFechas(hoy, hoy);
        long cantidadHoy = ventasHoy.stream().filter(v -> v.estado() == EstadoVenta.COMPLETADA).count();

        List<Producto> bajos = productoRepository.findStockBajo();   // ya viene ordenado por stock
        List<DashboardResponse.ProductoAlerta> alertas = bajos.stream().limit(5)
                .map(p -> new DashboardResponse.ProductoAlerta(p.getId(), p.getNombre(), p.getStockActual(),
                        p.getStockMinimo(), p.getUnidadMedida()))
                .toList();

        List<DeudaClienteResponse> deudas = fiadoService.resumen();
        BigDecimal fiadosTotal = deudas.stream().map(DeudaClienteResponse::deuda).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardResponse(
                diaHoy.ventas(), cantidadHoy, diaAyer.ventas(),
                mes.ventas(), mes.gananciaNeta(), mes.margen(),
                bajos.size(), alertas,
                fiadosTotal, deudas.size(),
                compraRepository.countByEstado(EstadoCompra.PEDIDO),
                compraRepository.sumaPorEstado(EstadoCompra.PEDIDO),
                cajaService.actual().orElse(null),
                dias,
                semana.topProductos(),
                ventasHoy.stream().limit(8).toList());
    }
}
