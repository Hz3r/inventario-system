package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "movimientos_inventario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // Hora de Perú, aunque el servidor esté en otro país (Railway usa UTC)
    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now(ZoneId.of("America/Lima"));

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MotivoMovimiento motivo;

    // Con signo: +12 si entra, -3 si sale. Siempre en unidad base (UND, KG, LT)
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal cantidad;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal stockAnterior;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal stockResultante;

    @Column(precision = 10, scale = 2)
    private BigDecimal costoUnitario;

    // Por ahora solo guardamos el id; cuando existan Venta y Compra se vuelven relaciones
    @Column(name = "venta_id")
    private Long ventaId;

    @Column(name = "compra_id")
    private Long compraId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    private String nota;
}