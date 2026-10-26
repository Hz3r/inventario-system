package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.MarcarLeidasRequest;
import com.hzer.inventario_system.dto.NotificacionesResponse;
import com.hzer.inventario_system.service.NotificacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    // GET /api/notificaciones -> alertas actuales (el frontend lo consulta cada minuto)
    @GetMapping
    public NotificacionesResponse listar() {
        return notificacionService.listar();
    }

    @PostMapping("/leidas")
    public ResponseEntity<Void> marcarLeidas(@Valid @RequestBody MarcarLeidasRequest request) {
        notificacionService.marcarLeidas(request.getClaves());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/leidas/todas")
    public ResponseEntity<Void> marcarTodasLeidas() {
        notificacionService.marcarTodasLeidas();
        return ResponseEntity.noContent().build();
    }
}
