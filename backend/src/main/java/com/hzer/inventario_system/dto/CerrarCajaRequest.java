package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CerrarCajaRequest {

    @NotNull(message = "Indica cuánto efectivo contaste")
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal montoContado;

    @Size(max = 255)
    private String nota;
}