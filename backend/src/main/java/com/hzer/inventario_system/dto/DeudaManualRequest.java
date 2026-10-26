package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/** Para pasar al sistema deudas que estaban anotadas en el cuaderno */
@Data
public class DeudaManualRequest {

    @NotNull(message = "Indica el monto que debe")
    @Positive(message = "El monto debe ser mayor a 0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal monto;

    @Size(max = 255)
    private String nota;
}
