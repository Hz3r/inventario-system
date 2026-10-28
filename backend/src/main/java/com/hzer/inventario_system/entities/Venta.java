package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ventas")
@Getter
@Setter
@NoArgsConstructor
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // N° de ticket (1, 2, 3...). Lo saca el servicio de la secuencia de PostgreSQL
    @Column(nullable = false, unique = true)
    private Long numero;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now(ZoneId.of("America/Lima"));

    @ManyToOne(optional = false)
    @JoinColumn(name = "caja_id", nullable = false)
    private Caja caja;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Obligatorio solo si una parte se paga con FIADO
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    // Descuento general del ticket ("dame 20 soles y listo")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal descuento = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    // ---- Resumen tributario (total = opGravada + igv + opExonerada) ----
    @Column(name = "op_gravada", nullable = false, precision = 10, scale = 2)
    private BigDecimal opGravada = BigDecimal.ZERO;

    @Column(name = "op_exonerada", nullable = false, precision = 10, scale = 2)
    private BigDecimal opExonerada = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal igv = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal efectivoRecibido;

    @Column(precision = 10, scale = 2)
    private BigDecimal vuelto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private EstadoVenta estado = EstadoVenta.COMPLETADA;

    private LocalDateTime anuladaEn;

    private String motivoAnulacion;

    private String nota;

    // Una venta tiene varias líneas y varios pagos. Se guardan junto con la venta (cascade)
    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VentaDetalle> detalles = new ArrayList<>();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VentaPago> pagos = new ArrayList<>();

    public void agregarDetalle(VentaDetalle detalle) {
        detalle.setVenta(this);
        detalles.add(detalle);
    }

    public void agregarPago(VentaPago pago) {
        pago.setVenta(this);
        pagos.add(pago);
    }
}