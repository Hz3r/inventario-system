package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CompraItemRequest {

    @NotNull
    private Long productoId;

    // null = por unidad base; si no, ej. la "Caja x12"
    private Long presentacionId;

    @NotNull
    @Positive(message = "La cantidad debe ser mayor a 0")
    @Digits(integer = 9, fraction = 3)
    private BigDecimal cantidad;

    // Lo que cuesta UNA presentación (la caja, la botella, el kilo)
    @NotNull(message = "Indica el costo")
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal costoUnitario;
}
