package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** Una notificación que el usuario ya marcó como leída (las notificaciones en sí se calculan al vuelo) */
@Entity
@Table(name = "notificaciones_leidas")
@Getter
@Setter
@NoArgsConstructor
public class NotificacionLeida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 150)
    private String clave;

    @Column(nullable = false)
    private LocalDateTime leidaEn = LocalDateTime.now(ZoneId.of("America/Lima"));

    public NotificacionLeida(Usuario usuario, String clave) {
        this.usuario = usuario;
        this.clave = clave;
    }
}
