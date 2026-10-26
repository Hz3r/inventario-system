package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "compra_detalle")
@Getter
@Setter
@NoArgsConstructor
public class CompraDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "compra_id", nullable = false)
    private Compra compra;

    @ManyToOne(optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // null = se compró por unidad base; si no, ej. "Caja x12"
    @ManyToOne
    @JoinColumn(name = "presentacion_id")
    private ProductoPresentacion presentacion;

    // 3 (cajas)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal cantidad;

    // 12 (unidades por caja)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal factor = BigDecimal.ONE;

    // 36 (lo que entra al stock)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal cantidadBase;

    // Costo de UNA presentación comprada (ej. S/ 62.40 la caja)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitario;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;
}
