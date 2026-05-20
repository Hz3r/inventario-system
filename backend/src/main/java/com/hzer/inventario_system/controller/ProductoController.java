package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.ProductRequest;
import com.hzer.inventario_system.entities.Producto;
import com.hzer.inventario_system.service.ProductoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory/productos")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000","http://localhost:5173"})
public class ProductoController {

    private final ProductoService productoService;

    // Crear producto
    @PostMapping
    public ResponseEntity<Producto> crearProducto(@RequestBody ProductRequest request) {

        Producto producto = productoService.crearProducto(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(producto);
    }

}