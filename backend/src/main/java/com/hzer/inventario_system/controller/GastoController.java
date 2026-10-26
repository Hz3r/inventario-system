package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.GastoRequest;
import com.hzer.inventario_system.dto.GastoResponse;
import com.hzer.inventario_system.service.GastoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/gastos")
@RequiredArgsConstructor
public class GastoController {

    private final GastoService gastoService;

    // GET /api/gastos?desde=2026-10-01&hasta=2026-10-26   (sin fechas = hoy)
    @GetMapping
    public List<GastoResponse> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Lima"));
        return gastoService.listar(desde != null ? desde : hoy, hasta != null ? hasta : hoy);
    }

    @PostMapping
    public ResponseEntity<GastoResponse> crear(@Valid @RequestBody GastoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gastoService.crear(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        gastoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
