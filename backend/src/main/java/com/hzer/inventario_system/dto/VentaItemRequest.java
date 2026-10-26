package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class VentaItemRequest {

    @NotNull
    private Long productoId;

    // null = se vende por unidad base (botella, kg)
    private Long presentacionId;

    // 3 botellas, 1 caja, 0.750 kg
    @NotNull
    @Positive(message = "La cantidad debe ser mayor a 0")
    @Digits(integer = 9, fraction = 3)
    private BigDecimal cantidad;

    // Rebaja en soles en esta línea (la palta a S/ 5.00 en vez de 5.60 → 0.60)
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal descuento;
}