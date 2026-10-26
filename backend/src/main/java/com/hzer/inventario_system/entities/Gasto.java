package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "gastos")
@Getter
@Setter
@NoArgsConstructor
public class Gasto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now(ZoneId.of("America/Lima"));

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaGasto categoria;

    private String descripcion;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    // EFECTIVO, YAPE, PLIN, TARJETA o TRANSFERENCIA (nunca FIADO)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private MetodoPago metodoPago = MetodoPago.EFECTIVO;

    // Si se pagó con plata del cajón: se resta del efectivo esperado al cerrar
    @ManyToOne
    @JoinColumn(name = "caja_id")
    private Caja caja;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
}
