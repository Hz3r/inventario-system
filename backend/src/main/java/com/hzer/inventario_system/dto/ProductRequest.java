package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.UnidadMedida;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProductRequest {

    private String nombre;

    private String codigoBarras;

    private BigDecimal precioCosto;

    private BigDecimal precioVenta;

    private Integer stockInicial;

    private UnidadMedida unidadMedida;

    private Boolean igv;

    private Integer stockMinimo;

    private LocalDateTime vencimiento;

    private String imagenURL;

    private Long categoriaId;

}