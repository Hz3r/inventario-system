package com.hzer.inventario_system.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "producto_presentaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductoPresentacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // A qué producto pertenece (ej. "Pilsen 630ml")
    @JsonIgnore
    @ManyToOne(optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // "Media caja", "Caja x12"
    @Column(nullable = false, length = 50)
    private String nombre;

    // Cuántas unidades base trae: media caja = 6, caja = 12
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal factor;

    // Precio de la presentación completa (la caja suele salir más barata por unidad)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precioVenta;

    // La caja puede tener su propio código de barras, distinto al de la botella
    @Column(unique = true)
    private String codigoBarras;

    @Column(nullable = false)
    private Boolean activo = true;
}