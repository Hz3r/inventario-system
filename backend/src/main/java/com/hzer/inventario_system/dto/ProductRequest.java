package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ProductRequest {

    private String nombre;

    private String codigoBarras;

    private BigDecimal precioCosto;

    private BigDecimal precioVenta;

    /** Stock con el que se registra el producto (en unidad base). */
    private BigDecimal stockInicial;

    private UnidadMedida unidadMedida;

    private Boolean igv;

    private BigDecimal stockMinimo;

    private LocalDate vencimiento;

    private String imagenURL;

    private Long categoriaId;

}
