package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MotivoMovimiento;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AjusteStockRequest {

    /** AJUSTE_ENTRADA, AJUSTE_SALIDA o MERMA */
    @NotNull(message = "Indica el motivo")
    private MotivoMovimiento motivo;

    /** Siempre positiva; el signo lo pone el motivo */
    @NotNull(message = "Indica la cantidad")
    @Positive(message = "La cantidad debe ser mayor a 0")
    @Digits(integer = 9, fraction = 3)
    private BigDecimal cantidad;

    @Size(max = 255)
    private String nota;
}