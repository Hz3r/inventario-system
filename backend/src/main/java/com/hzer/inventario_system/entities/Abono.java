package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Un pago a cuenta de un fiado. Si el cliente paga S/ 20 y eso cubre dos deudas,
 * se guardan dos abonos (uno por cada fiado al que se aplicó).
 */
@Entity
@Table(name = "abonos")
@Getter
@Setter
@NoArgsConstructor
public class Abono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "fiado_id", nullable = false)
    private Fiado fiado;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now(ZoneId.of("America/Lima"));

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    // EFECTIVO, YAPE, PLIN, TARJETA o TRANSFERENCIA (nunca FIADO)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private MetodoPago metodo;

    @Column(length = 50)
    private String referencia;

    // Caja abierta en el momento del abono (el efectivo entra al cierre)
    @ManyToOne
    @JoinColumn(name = "caja_id")
    private Caja caja;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
}
