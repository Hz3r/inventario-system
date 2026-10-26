package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "productos")
@Getter
@Setter
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

    @ManyToOne
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @Column(unique = true)
    private String codigoBarras;

    @Column(precision = 10, scale = 2)
    private BigDecimal precioCosto;

    @Column(precision = 10, scale = 2)
    private BigDecimal precioVenta;

    /** Stock en la unidad base (UND, KG o LT). Solo debe cambiar junto con un movimiento de kardex. */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal stockActual = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UnidadMedida unidadMedida = UnidadMedida.UND;

    private Boolean igv = true;

    @Column(precision = 12, scale = 3)
    private BigDecimal stockMinimo = new BigDecimal("5");

    private LocalDate vencimiento;

    private String imagenURL;

    @Column(nullable = false)
    private Boolean activo = true;
}
