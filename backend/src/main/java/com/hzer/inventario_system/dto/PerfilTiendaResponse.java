package com.hzer.inventario_system.dto;

public record PerfilTiendaResponse(
        String nombre,
        String ruc,
        String direccion,
        String telefono,
        String mensajeTicket,
        Integer anchoTicket,
        String logo          // data URL lista para <img src>, o null
) {
}
