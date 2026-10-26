package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.EstadoCaja;
import com.hzer.inventario_system.entities.MetodoPago;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

public record CajaResponse(
        Long id,
        EstadoCaja estado,
        LocalDateTime abiertaEn,
        LocalDateTime cerradaEn,
        BigDecimal montoInicial,
        long cantidadVentas,
        BigDecimal totalVendido,                 // suma de todos los métodos
        Map<MetodoPago, BigDecimal> porMetodo,   // EFECTIVO: 320.50, YAPE: 150.00, FIADO: 30.00
        BigDecimal abonosEfectivo,               // abonos de fiados cobrados en efectivo en esta caja
        BigDecimal gastosEfectivo,               // gastos pagados con plata del cajón
        BigDecimal efectivoEsperado,             // inicial + ventas en efectivo + abonos − gastos del cajón
        BigDecimal montoContado,                 // solo si está cerrada
        BigDecimal diferencia,                   // contado − esperado
        String nota
) {
}