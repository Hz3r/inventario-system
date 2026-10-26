package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.CambiarClaveRequest;
import com.hzer.inventario_system.dto.LoginRequest;
import com.hzer.inventario_system.dto.LoginResponse;
import com.hzer.inventario_system.dto.UsuarioResponse;
import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.UsuarioRepository;
import com.hzer.inventario_system.seguridad.CredencialesInvalidasException;
import com.hzer.inventario_system.seguridad.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioActualService usuarioActual;

    /** Correo + contraseña correctos → token de sesión. Si algo falla, el mismo mensaje (no revela cuál) */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        Usuario u = usuarioRepository.findByEmail(req.getEmail().trim().toLowerCase())
                .filter(x -> Boolean.TRUE.equals(x.getActivo()))
                .filter(x -> passwordEncoder.matches(req.getPassword(), x.getPassword()))
                .orElseThrow(CredencialesInvalidasException::new);

        JwtService.TokenGenerado t = jwtService.generar(u);
        return new LoginResponse(t.token(), t.expiraEn(), UsuarioResponse.desde(u));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse yo() {
        return UsuarioResponse.desde(usuarioActual.obtener());
    }

    @Transactional
    public void cambiarClave(CambiarClaveRequest req) {
        Usuario u = usuarioActual.obtener();
        if (!passwordEncoder.matches(req.getClaveActual(), u.getPassword())) {
            throw new ReglaNegocioException("La contraseña actual no es correcta");
        }
        if (req.getClaveActual().equals(req.getClaveNueva())) {
            throw new ReglaNegocioException("La nueva contraseña debe ser distinta a la actual");
        }
        u.setPassword(passwordEncoder.encode(req.getClaveNueva()));
    }
}
