package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.Rol;
import com.hzer.inventario_system.entities.Usuario;

/** Datos del usuario que se pueden mostrar (NUNCA la contraseña) */
public record UsuarioResponse(Long id, String email, String nombre, Rol rol) {

    public static UsuarioResponse desde(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getEmail(), u.getNombre() != null ? u.getNombre() : u.getEmail(), u.getRol());
    }
}
