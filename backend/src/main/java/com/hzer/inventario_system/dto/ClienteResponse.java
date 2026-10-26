package com.hzer.inventario_system.dto;

import java.math.BigDecimal;

public record ClienteResponse(
        Long id,
        String nombre,
        String dni,
        String telefono,
        String direccion,
        BigDecimal limiteCredito,
        BigDecimal deudaActual,     // suma de sus fiados pendientes
        String nota
) {
}