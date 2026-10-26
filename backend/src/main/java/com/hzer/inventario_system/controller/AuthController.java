package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.CambiarClaveRequest;
import com.hzer.inventario_system.dto.LoginRequest;
import com.hzer.inventario_system.dto.LoginResponse;
import com.hzer.inventario_system.dto.UsuarioResponse;
import com.hzer.inventario_system.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Único endpoint abierto: devuelve el token
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Quién soy (con el token)
    @GetMapping("/yo")
    public UsuarioResponse yo() {
        return authService.yo();
    }

    @PostMapping("/cambiar-clave")
    public ResponseEntity<Void> cambiarClave(@Valid @RequestBody CambiarClaveRequest request) {
        authService.cambiarClave(request);
        return ResponseEntity.noContent().build();
    }
}
