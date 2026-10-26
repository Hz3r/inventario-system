package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "cajas")
@Getter
@Setter
@NoArgsConstructor
public class Caja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime abiertaEn = LocalDateTime.now(ZoneId.of("America/Lima"));

    private LocalDateTime cerradaEn;

    // El sencillo con el que se abre la caja
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montoInicial = BigDecimal.ZERO;

    // Al cerrar: efectivo que DEBERÍA haber (inicial + ventas en efectivo + abonos - gastos)
    @Column(precision = 10, scale = 2)
    private BigDecimal montoEsperado;

    // Al cerrar: lo que se contó de verdad
    @Column(precision = 10, scale = 2)
    private BigDecimal montoContado;

    // contado - esperado (negativo = falta plata)
    @Column(precision = 10, scale = 2)
    private BigDecimal diferencia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoCaja estado = EstadoCaja.ABIERTA;

    private String nota;
}