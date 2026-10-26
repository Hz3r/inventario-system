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
@Table(name = "compras")
@Getter
@Setter
@NoArgsConstructor
public class Compra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private Proveedor proveedor;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fechaPedido = LocalDateTime.now(ZoneId.of("America/Lima"));

    // Cuando llegó la mercadería (y subió el stock)
    private LocalDateTime fechaRecepcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoCompra estado = EstadoCompra.PEDIDO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    // Se define al recibir
    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    private MetodoPagoCompra metodoPago;

    private String nota;

    // Si se pagó en efectivo con plata del cajón (columna agregada en la V3)
    @ManyToOne
    @JoinColumn(name = "caja_id")
    private Caja caja;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompraDetalle> detalles = new ArrayList<>();

    public void agregarDetalle(CompraDetalle d) {
        d.setCompra(this);
        detalles.add(d);
    }
}
