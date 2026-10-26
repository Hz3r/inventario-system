package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "fiados")
@Getter
@Setter
@NoArgsConstructor
public class Fiado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    // La venta que lo originó (null si es una deuda antigua registrada a mano)
    @OneToOne
    @JoinColumn(name = "venta_id", unique = true)
    private Venta venta;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now(ZoneId.of("America/Lima"));

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montoTotal;

    // Lo que falta pagar
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal saldo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoFiado estado = EstadoFiado.PENDIENTE;

    private String nota;
}