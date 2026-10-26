package com.hzer.inventario_system.service;

import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Quién está usando el sistema.
 * TEMPORAL: mientras no haya JWT, todo se registra a nombre del admin.
 * Cuando exista el login con token, solo se cambia este método.
 */
@Service
@RequiredArgsConstructor
public class UsuarioActualService {

    private final UsuarioRepository usuarioRepository;

    public Usuario obtener() {
        return usuarioRepository.findByEmail("admin@tienda.com")
                .orElseThrow(() -> new ReglaNegocioException("No existe el usuario administrador"));
    }
}