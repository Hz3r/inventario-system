package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.GananciaResponse;
import com.hzer.inventario_system.service.GananciaService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/ganancia")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class GananciaController {

    private final GananciaService gananciaService;

    // GET /api/ganancia?desde=2026-10-01&hasta=2026-10-26   (sin fechas = hoy)
    @GetMapping
    public GananciaResponse calcular(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Lima"));
        return gananciaService.calcular(desde != null ? desde : hoy, hasta != null ? hasta : hoy);
    }
}
