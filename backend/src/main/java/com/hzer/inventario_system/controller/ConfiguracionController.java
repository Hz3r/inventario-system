package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.PerfilTiendaRequest;
import com.hzer.inventario_system.dto.PerfilTiendaResponse;
import com.hzer.inventario_system.service.ConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracion")
@RequiredArgsConstructor
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;

    // GET /api/configuracion/tienda  → datos de la bodega (el frontend los usa en el ticket)
    @GetMapping("/tienda")
    public PerfilTiendaResponse obtener() {
        return configuracionService.obtener();
    }

    // PUT /api/configuracion/tienda  → guarda todo de una vez (incluido el logo)
    @PutMapping("/tienda")
    public PerfilTiendaResponse actualizar(@Valid @RequestBody PerfilTiendaRequest request) {
        return configuracionService.actualizar(request);
    }
}
