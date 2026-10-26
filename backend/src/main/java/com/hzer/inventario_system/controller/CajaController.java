package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.AbrirCajaRequest;
import com.hzer.inventario_system.dto.CajaResponse;
import com.hzer.inventario_system.dto.CerrarCajaRequest;
import com.hzer.inventario_system.service.CajaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pos/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;

    // 200 con la caja abierta, o 204 si no hay ninguna abierta
    @GetMapping("/actual")
    public ResponseEntity<CajaResponse> actual() {
        return cajaService.actual()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/abrir")
    public ResponseEntity<CajaResponse> abrir(@Valid @RequestBody AbrirCajaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cajaService.abrir(request));
    }

    @PostMapping("/cerrar")
    public CajaResponse cerrar(@Valid @RequestBody CerrarCajaRequest request) {
        return cajaService.cerrar(request);
    }

    @GetMapping("/historial")
    public List<CajaResponse> historial() {
        return cajaService.historial();
    }

    @GetMapping("/{id}")
    public CajaResponse obtener(@PathVariable Long id) {
        return cajaService.obtener(id);
    }
}