package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.service.ProductoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory/productos")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ProductoController {

    private final ProductoService productoService;

    // GET /api/inventory/productos            -> todos
    // GET /api/inventory/productos?buscar=pil -> buscador
    @GetMapping
    public List<ProductoResponse> listar(@RequestParam(required = false) String buscar) {
        return productoService.listar(buscar);
    }

    @GetMapping("/stock-bajo")
    public List<ProductoResponse> stockBajo() {
        return productoService.stockBajo();
    }

    // GET /api/inventory/productos/escanear?codigo=7750182000123
    @GetMapping("/escanear")
    public EscaneoResponse escanear(@RequestParam String codigo) {
        return productoService.escanear(codigo);
    }

    @GetMapping("/{id}")
    public ProductoResponse obtener(@PathVariable Long id) {
        return productoService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<ProductoResponse> crear(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productoService.crear(request));
    }

    @PutMapping("/{id}")
    public ProductoResponse actualizar(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productoService.actualizar(id, request);
    }

    // No borra: desactiva
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        productoService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    // Ajustes manuales: merma, ajuste de entrada / salida
    @PostMapping("/{id}/ajustes")
    public ResponseEntity<MovimientoResponse> ajustar(@PathVariable Long id,
                                                      @Valid @RequestBody AjusteStockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productoService.ajustarStock(id, request));
    }

    @PostMapping("/{id}/presentaciones")
    public ResponseEntity<PresentacionResponse> agregarPresentacion(@PathVariable Long id,
                                                                    @Valid @RequestBody PresentacionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productoService.agregarPresentacion(id, request));
    }
}