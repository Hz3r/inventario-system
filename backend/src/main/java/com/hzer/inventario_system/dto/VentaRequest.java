package com.hzer.inventario_system.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class VentaRequest {

    @NotEmpty(message = "El carrito está vacío")
    @Valid                          // valida también cada línea
    private List<VentaItemRequest> items;

    @NotEmpty(message = "Indica cómo se paga")
    @Valid
    private List<VentaPagoRequest> pagos;

    // Descuento general del ticket
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal descuento;

    // Obligatorio si algún pago es FIADO
    private Long clienteId;

    // Con cuánto pagó en efectivo (para calcular el vuelto)
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal efectivoRecibido;

    @Size(max = 255)
    private String nota;
}