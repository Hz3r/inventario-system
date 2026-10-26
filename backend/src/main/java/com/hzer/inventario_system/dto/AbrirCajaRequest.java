package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AbrirCajaRequest {

    @NotNull(message = "Indica con cuánto sencillo abres la caja")
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal montoInicial;

    @Size(max = 255)
    private String nota;
}