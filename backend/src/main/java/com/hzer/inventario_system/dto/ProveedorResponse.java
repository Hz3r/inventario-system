package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.Proveedor;

public record ProveedorResponse(
        Long id, String nombre, String ruc, String contacto, String telefono,
        String email, String direccion, Boolean activo
) {
    public static ProveedorResponse desde(Proveedor p) {
        return new ProveedorResponse(p.getId(), p.getNombre(), p.getRuc(), p.getContacto(), p.getTelefono(),
                p.getEmail(), p.getDireccion(), p.getActivo());
    }
}
