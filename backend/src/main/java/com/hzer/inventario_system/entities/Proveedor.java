package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "proveedores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 11, unique = true)
    private String ruc;

    private String contacto;

    @Column(length = 20)
    private String telefono;

    private String email;

    private String direccion;

    @Column(nullable = false)
    private Boolean activo = true;

    // La base de datos pone la fecha sola (DEFAULT en la V2)
    @Column(name = "creado_en", nullable = false, insertable = false, updatable = false)
    private LocalDateTime creadoEn;
}