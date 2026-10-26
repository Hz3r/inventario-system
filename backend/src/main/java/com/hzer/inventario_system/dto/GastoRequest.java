package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.CategoriaGasto;
import com.hzer.inventario_system.entities.MetodoPago;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class GastoRequest {

    @NotNull(message = "Elige la categoría")
    private CategoriaGasto categoria;

    @Size(max = 255)
    private String descripcion;

    @NotNull(message = "Indica el monto")
    @Positive(message = "El monto debe ser mayor a 0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal monto;

    @NotNull(message = "Indica cómo se pagó")
    private MetodoPago metodoPago;

    /** null = hoy. Permite registrar gastos de días anteriores (ej. el recibo de luz) */
    @PastOrPresent(message = "La fecha no puede ser futura")
    private LocalDate fecha;

    /** true = salió del cajón de la caja abierta (solo aplica a EFECTIVO de hoy) */
    private boolean deCaja = true;
}
