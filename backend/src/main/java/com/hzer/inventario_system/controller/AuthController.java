package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.LoginRequest;
import com.hzer.inventario_system.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        boolean esValido = authService.autenticar(loginRequest);

        if (esValido) {
            return ResponseEntity.ok("{\"mensaje\": \"Bienvenido al sistema\"}");
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Credenciales incorrectas\"}");
        }
    }
}