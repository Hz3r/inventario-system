package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.DashboardResponse;
import com.hzer.inventario_system.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse resumen() {
        return dashboardService.resumen();
    }
}
