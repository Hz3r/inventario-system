package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.TipoValorEtiqueta;

public record PerfilTiendaResponse(
        String nombre,
        String ruc,
        String direccion,
        String telefono,
        String mensajeTicket,
        Integer anchoTicket,
        String logo,         // data URL lista para <img src>, o null
        boolean balanzaEtiquetas,
        String balanzaPrefijo,
        int balanzaDigitosPlu,
        TipoValorEtiqueta balanzaTipoValor
) {
}
