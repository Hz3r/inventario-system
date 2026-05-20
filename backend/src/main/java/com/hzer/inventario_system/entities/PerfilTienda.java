package com.hzer.inventario_system.entities;

import jakarta.persistence.*;

@Entity
public class PerfilTienda {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    private byte[] logo;

    private String nombre;
    private String ruc;
    private String direccion;



}
