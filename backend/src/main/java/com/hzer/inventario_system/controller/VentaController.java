package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.AnularVentaRequest;
import com.hzer.inventario_system.dto.VentaRequest;
import com.hzer.inventario_system.dto.VentaResponse;
import com.hzer.inventario_system.service.VentaService;
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
@RequestMapping("/api/pos/ventas")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class VentaController {

    private final VentaService ventaService;

    // Cobrar
    @PostMapping
    public ResponseEntity<VentaResponse> registrar(@Valid @RequestBody VentaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaService.registrar(request));
    }

    // GET /api/pos/ventas                                    -> hoy
    // GET /api/pos/ventas?desde=2026-10-01&hasta=2026-10-25  -> rango
    @GetMapping
    public List<VentaResponse> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Lima"));
        return ventaService.entreFechas(desde != null ? desde : hoy, hasta != null ? hasta : hoy);
    }

    @GetMapping("/caja/{cajaId}")
    public List<VentaResponse> deCaja(@PathVariable Long cajaId) {
        return ventaService.deCaja(cajaId);
    }

    @GetMapping("/numero/{numero}")
    public VentaResponse porNumero(@PathVariable Long numero) {
        return ventaService.porNumero(numero);
    }

    @GetMapping("/{id}")
    public VentaResponse obtener(@PathVariable Long id) {
        return ventaService.obtener(id);
    }

    @PostMapping("/{id}/anular")
    public VentaResponse anular(@PathVariable Long id, @Valid @RequestBody AnularVentaRequest request) {
        return ventaService.anular(id, request);
    }
}