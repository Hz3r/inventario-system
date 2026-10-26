package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.PresentacionRequest;
import com.hzer.inventario_system.dto.PresentacionResponse;
import com.hzer.inventario_system.service.ProductoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory/presentaciones")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class PresentacionController {

    private final ProductoService productoService;

    @PutMapping("/{id}")
    public PresentacionResponse actualizar(@PathVariable Long id, @Valid @RequestBody PresentacionRequest request) {
        return productoService.actualizarPresentacion(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        productoService.desactivarPresentacion(id);
        return ResponseEntity.noContent().build();
    }
}