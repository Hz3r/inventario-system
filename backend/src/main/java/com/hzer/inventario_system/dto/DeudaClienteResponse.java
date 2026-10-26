package com.hzer.inventario_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Una fila de la pantalla de Fiados */
public record DeudaClienteResponse(
        Long clienteId,
        String nombre,
        String telefono,
        BigDecimal limiteCredito,
        BigDecimal totalFiado,    // lo que se le fió (de los fiados aún abiertos)
        BigDecimal abonado,       // lo que ya pagó de esos fiados
        BigDecimal deuda,         // lo que falta
        long fiadosPendientes,
        LocalDateTime deudaDesde
) {
}
