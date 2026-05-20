package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @ManyToOne
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    private String codigoBarras;

    private BigDecimal precioCosto;

    private BigDecimal precioVenta;

    @Column(columnDefinition = "int default 0")
    private Integer stockInicial = 0;

    @Enumerated(EnumType.STRING)
    private UnidadMedida unidadMedida;

    private Boolean igv = true;

    private Integer stockMinimo = 5;

    private LocalDateTime vencimiento;

    private String imagenURL;
}