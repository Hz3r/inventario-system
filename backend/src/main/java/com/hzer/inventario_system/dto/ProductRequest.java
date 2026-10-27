package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ProductRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 255)
    private String nombre;

    @Size(max = 255)
    private String codigoBarras;

    /** Código del producto en la balanza de etiquetas (1 a 6 dígitos) */
    @Pattern(regexp = "^$|^\\d{1,6}$", message = "El PLU son de 1 a 6 dígitos")
    private String plu;

    @PositiveOrZero(message = "El costo no puede ser negativo")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal precioCosto;

    @NotNull(message = "El precio de venta es obligatorio")
    @PositiveOrZero(message = "El precio no puede ser negativo")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal precioVenta;

    /** Solo se usa al CREAR. Al editar se ignora: el stock solo cambia con el kardex. */
    @PositiveOrZero(message = "El stock inicial no puede ser negativo")
    @Digits(integer = 9, fraction = 3)
    private BigDecimal stockInicial;

    private UnidadMedida unidadMedida;

    private Boolean igv;

    @PositiveOrZero
    @Digits(integer = 9, fraction = 3)
    private BigDecimal stockMinimo;

    private LocalDate vencimiento;

    private String imagenURL;

    private Long categoriaId;

    private Long proveedorId;
}