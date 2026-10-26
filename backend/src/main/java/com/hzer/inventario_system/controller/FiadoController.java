package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.AbonoRequest;
import com.hzer.inventario_system.dto.CuentaClienteResponse;
import com.hzer.inventario_system.dto.DeudaClienteResponse;
import com.hzer.inventario_system.dto.DeudaManualRequest;
import com.hzer.inventario_system.service.FiadoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fiados")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class FiadoController {

    private final FiadoService fiadoService;

    // Quién debe y cuánto
    @GetMapping
    public List<DeudaClienteResponse> resumen() {
        return fiadoService.resumen();
    }

    // Cuenta completa de un cliente
    @GetMapping("/clientes/{clienteId}")
    public CuentaClienteResponse cuenta(@PathVariable Long clienteId) {
        return fiadoService.cuenta(clienteId);
    }

    @PostMapping("/clientes/{clienteId}/abonos")
    public ResponseEntity<CuentaClienteResponse> abonar(@PathVariable Long clienteId,
                                                        @Valid @RequestBody AbonoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fiadoService.abonar(clienteId, request));
    }

    // Pasar una deuda del cuaderno al sistema
    @PostMapping("/clientes/{clienteId}/deudas")
    public ResponseEntity<CuentaClienteResponse> deudaManual(@PathVariable Long clienteId,
                                                             @Valid @RequestBody DeudaManualRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fiadoService.registrarDeudaManual(clienteId, request));
    }
}
