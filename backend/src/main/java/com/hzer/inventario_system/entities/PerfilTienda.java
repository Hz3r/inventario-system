package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Datos de la bodega (una sola fila). Salen en el ticket y en los mensajes de WhatsApp.
 */
@Entity
@Table(name = "perfil_tienda")
@Getter
@Setter
public class PerfilTienda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String ruc;
    private String direccion;

    @Column(length = 20)
    private String telefono;

    @Column(name = "mensaje_ticket")
    private String mensajeTicket;

    /** 80 o 58 (milimetros del papel de la ticketera) */
    @Column(name = "ancho_ticket", nullable = false)
    private Integer anchoTicket = 80;

    /** Imagen PNG/JPG chica (BYTEA). El frontend la reduce a 256 px antes de subirla */
    private byte[] logo;
}
