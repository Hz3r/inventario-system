package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MetodoPagoCompra;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class RecibirCompraRequest {

    /** Lo que REALMENTE llegó. null = llegó exactamente lo pedido */
    @Valid
    private List<CompraItemRequest> items;

    @NotNull(message = "Indica cómo se pagó")
    private MetodoPagoCompra metodoPago;

    /** true = se pagó con plata del cajón (solo EFECTIVO) */
    private boolean deCaja = true;

    /** true = el precio de costo del producto se actualiza con el de esta compra */
    private boolean actualizarCostos = true;

    @Size(max = 255)
    private String nota;
}
