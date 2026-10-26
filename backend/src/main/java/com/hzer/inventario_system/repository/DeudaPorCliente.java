package com.hzer.inventario_system.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Resumen de lo que debe cada cliente (solo fiados pendientes o parciales) */
public interface DeudaPorCliente {
    Long getClienteId();
    BigDecimal getDeuda();        // suma de saldos
    BigDecimal getTotalFiado();   // suma de montos originales
    Long getCantidad();           // cuántos fiados pendientes
    LocalDateTime getDesde();     // fecha del fiado más antiguo sin pagar
}
