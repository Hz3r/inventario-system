package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "venta_detalle")
@Getter
@Setter
@NoArgsConstructor
public class VentaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    @ManyToOne(optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // null = se vendió por unidad base (botella, kg)
    @ManyToOne
    @JoinColumn(name = "presentacion_id")
    private ProductoPresentacion presentacion;

    // Cómo salió en el ticket: "Pilsen 630ml - Caja x12"
    @Column(nullable = false)
    private String descripcion;

    // Cantidad en la presentación vendida (ej. 1 caja)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal cantidad;

    // Unidades base por presentación (ej. 12)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal factor = BigDecimal.ONE;

    // Lo que se descuenta del stock: cantidad × factor (ej. 12)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal cantidadBase;

    // Precio de la presentación EN ESE MOMENTO
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    // Costo por unidad base EN ESE MOMENTO (para calcular la ganancia)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    // Rebaja en esta línea (la palta a S/ 5 en vez de S/ 5.60)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal descuento = BigDecimal.ZERO;

    // precioUnitario × cantidad − descuento
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;
}