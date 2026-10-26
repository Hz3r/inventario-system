package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.DashboardResponse;
import com.hzer.inventario_system.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse resumen() {
        return dashboardService.resumen();
    }
}
