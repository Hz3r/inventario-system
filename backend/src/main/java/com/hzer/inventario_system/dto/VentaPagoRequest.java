package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MetodoPago;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class VentaPagoRequest {

    @NotNull(message = "Indica el método de pago")
    private MetodoPago metodo;

    @NotNull
    @Positive(message = "El monto debe ser mayor a 0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal monto;

    @Size(max = 50)
    private String referencia;
}