package com.hzer.inventario_system.service;

import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.repository.UsuarioRepository;
import com.hzer.inventario_system.seguridad.CredencialesInvalidasException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Quién está usando el sistema: se lee del token de la petición actual.
 * (Antes devolvía siempre al admin; ahora cajas, ventas y gastos quedan a nombre de quien inició sesión.)
 */
@Service
@RequiredArgsConstructor
public class UsuarioActualService {

    private final UsuarioRepository usuarioRepository;

    public Usuario obtener() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new CredencialesInvalidasException();
        }
        // En el token, el "subject" es el correo del usuario
        return usuarioRepository.findByEmail(auth.getName())
                .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                .orElseThrow(CredencialesInvalidasException::new);
    }
}
