package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.CompraRequest;
import com.hzer.inventario_system.dto.CompraResponse;
import com.hzer.inventario_system.dto.RecibirCompraRequest;
import com.hzer.inventario_system.service.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    @GetMapping
    public List<CompraResponse> listar() {
        return compraService.listar();
    }

    @GetMapping("/{id}")
    public CompraResponse obtener(@PathVariable Long id) {
        return compraService.obtener(id);
    }

    // Crear pedido (todavía no sube el stock)
    @PostMapping
    public ResponseEntity<CompraResponse> crear(@Valid @RequestBody CompraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(compraService.crear(request));
    }

    // Llegó la mercadería: sube el stock
    @PostMapping("/{id}/recibir")
    public CompraResponse recibir(@PathVariable Long id, @Valid @RequestBody RecibirCompraRequest request) {
        return compraService.recibir(id, request);
    }

    @PostMapping("/{id}/cancelar")
    public CompraResponse cancelar(@PathVariable Long id) {
        return compraService.cancelar(id);
    }
}
