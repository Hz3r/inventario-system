package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.GananciaResponse;
import com.hzer.inventario_system.dto.GananciaResponse.Dia;
import com.hzer.inventario_system.dto.GananciaResponse.ProductoQuieto;
import com.hzer.inventario_system.dto.GananciaResponse.ProductoRentable;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.GastoRepository;
import com.hzer.inventario_system.repository.ProductoRepository;
import com.hzer.inventario_system.repository.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Calcula la ganancia real de un periodo:
 *   ventas − costo de lo vendido = ganancia bruta
 *   ganancia bruta − gastos     = ganancia neta
 * El costo sale de VentaDetalle.costoUnitario: el costo que tenía el producto EL DÍA de la venta.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GananciaService {

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private final VentaRepository ventaRepository;
    private final GastoRepository gastoRepository;
    private final ProductoRepository productoRepository;

    /** Acumulador por producto mientras se recorren las ventas */
    private static class Acum {
        String nombre;
        BigDecimal cantidad = BigDecimal.ZERO;
        BigDecimal ventas = BigDecimal.ZERO;
        BigDecimal costo = BigDecimal.ZERO;
    }

    public GananciaResponse calcular(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) throw new ReglaNegocioException("La fecha 'hasta' no puede ser anterior a 'desde'");
        if (desde.plusDays(366).isBefore(hasta)) throw new ReglaNegocioException("El periodo no puede ser mayor a un año");

        var inicio = desde.atStartOfDay();
        var fin = hasta.plusDays(1).atStartOfDay().minusNanos(1);
        List<Venta> ventas = ventaRepository.findByFechaBetweenAndEstado(inicio, fin, EstadoVenta.COMPLETADA);
        List<Gasto> gastos = gastoRepository.findByFechaBetweenOrderByFechaDescIdDesc(inicio, fin);

        // Un "casillero" por día del periodo: [ventas, costo, gastos]
        Map<LocalDate, BigDecimal[]> dias = new TreeMap<>();
        for (LocalDate d = desde; !d.isAfter(hasta); d = d.plusDays(1)) {
            dias.put(d, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
        }

        BigDecimal totalVentas = BigDecimal.ZERO;
        BigDecimal totalCosto = BigDecimal.ZERO;
        Map<Long, Acum> porProducto = new HashMap<>();
        Set<Long> sinCosto = new HashSet<>();

        // ---- Ventas y su costo ----
        for (Venta v : ventas) {
            BigDecimal[] dia = dias.get(v.getFecha().toLocalDate());
            totalVentas = totalVentas.add(v.getTotal());
            dia[0] = dia[0].add(v.getTotal());

            for (VentaDetalle d : v.getDetalles()) {
                BigDecimal costo = d.getCostoUnitario().multiply(d.getCantidadBase()).setScale(2, RoundingMode.HALF_UP);
                totalCosto = totalCosto.add(costo);
                dia[1] = dia[1].add(costo);
                if (d.getCostoUnitario().signum() == 0) sinCosto.add(d.getProducto().getId());

                Acum a = porProducto.computeIfAbsent(d.getProducto().getId(), k -> new Acum());
                a.nombre = d.getProducto().getNombre();
                a.cantidad = a.cantidad.add(d.getCantidadBase());
                a.ventas = a.ventas.add(d.getSubtotal());
                a.costo = a.costo.add(costo);
            }
        }

        // ---- Gastos ----
        BigDecimal totalGastos = BigDecimal.ZERO;
        Map<CategoriaGasto, BigDecimal> porCategoria = new EnumMap<>(CategoriaGasto.class);
        for (Gasto g : gastos) {
            totalGastos = totalGastos.add(g.getMonto());
            porCategoria.merge(g.getCategoria(), g.getMonto(), BigDecimal::add);
            BigDecimal[] dia = dias.get(g.getFecha().toLocalDate());
            if (dia != null) dia[2] = dia[2].add(g.getMonto());
        }

        BigDecimal bruta = totalVentas.subtract(totalCosto);
        BigDecimal neta = bruta.subtract(totalGastos);
        BigDecimal margen = totalVentas.signum() == 0 ? BigDecimal.ZERO
                : bruta.multiply(CIEN).divide(totalVentas, 1, RoundingMode.HALF_UP);

        List<Dia> porDia = dias.entrySet().stream()
                .map(e -> {
                    BigDecimal[] x = e.getValue();
                    return new Dia(e.getKey(), x[0], x[1], x[2], x[0].subtract(x[1]).subtract(x[2]));
                })
                .toList();

        // ---- Top 5 productos que más ganancia dejaron ----
        List<ProductoRentable> top = porProducto.entrySet().stream()
                .map(e -> {
                    Acum a = e.getValue();
                    return new ProductoRentable(e.getKey(), a.nombre, a.cantidad, a.ventas, a.costo, a.ventas.subtract(a.costo));
                })
                .sorted(Comparator.comparing(ProductoRentable::ganancia).reversed())
                .limit(5)
                .toList();

        // ---- Productos con stock que no se vendieron en el periodo (plata "dormida") ----
        List<ProductoQuieto> quietos = productoRepository.findByActivoTrueOrderByNombreAsc().stream()
                .filter(p -> p.getStockActual().signum() > 0 && !porProducto.containsKey(p.getId()))
                .map(p -> new ProductoQuieto(p.getId(), p.getNombre(), p.getStockActual(),
                        p.getStockActual().multiply(p.getPrecioCosto() != null ? p.getPrecioCosto() : BigDecimal.ZERO)
                                .setScale(2, RoundingMode.HALF_UP)))
                .sorted(Comparator.comparing(ProductoQuieto::valorEnStock).reversed())
                .limit(5)
                .toList();

        return new GananciaResponse(desde, hasta, ventas.size(), totalVentas, totalCosto, bruta, margen,
                totalGastos, neta, porCategoria, porDia, top, quietos, sinCosto.size());
    }
}
