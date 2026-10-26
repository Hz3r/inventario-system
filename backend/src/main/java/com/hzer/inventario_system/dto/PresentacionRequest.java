package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PresentacionRequest {

    @NotBlank(message = "El nombre es obligatorio (ej. Caja x12)")
    @Size(max = 50)
    private String nombre;

    @NotNull(message = "Indica cuántas unidades trae")
    @Positive(message = "El factor debe ser mayor a 0")
    @Digits(integer = 9, fraction = 3)
    private BigDecimal factor;

    @NotNull(message = "El precio es obligatorio")
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal precioVenta;

    @Size(max = 255)
    private String codigoBarras;
}