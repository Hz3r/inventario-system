package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MetodoPago;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AbonoRequest {

    @NotNull(message = "Indica cuánto abona")
    @Positive(message = "El monto debe ser mayor a 0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal monto;

    @NotNull(message = "Indica cómo paga")
    private MetodoPago metodo;

    @Size(max = 50)
    private String referencia;
}
