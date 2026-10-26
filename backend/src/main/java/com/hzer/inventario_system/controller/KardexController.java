package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.MovimientoResponse;
import com.hzer.inventario_system.service.KardexService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/inventory/kardex")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class KardexController {

    private final KardexService kardexService;

    // GET /api/inventory/kardex                                   -> últimos 7 días
    // GET /api/inventory/kardex?desde=2026-10-01&hasta=2026-10-25 -> rango
    @GetMapping
    public List<MovimientoResponse> general(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Lima"));
        LocalDate h = (hasta != null) ? hasta : hoy;
        LocalDate d = (desde != null) ? desde : h.minusDays(6);
        return kardexService.entreFechas(d, h);
    }

    // GET /api/inventory/kardex/producto/5 -> historial completo de un producto
    @GetMapping("/producto/{productoId}")
    public List<MovimientoResponse> deProducto(@PathVariable Long productoId) {
        return kardexService.deProducto(productoId);
    }
}