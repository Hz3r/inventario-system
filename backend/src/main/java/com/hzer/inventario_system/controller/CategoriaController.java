package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.entities.Categoria;
import com.hzer.inventario_system.repository.CategoryRepository;
import com.hzer.inventario_system.service.CategoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class CategoriaController {

    private final CategoriaService categoriaService;
    private final CategoryRepository categoryRepository;

    // 1. Crear una categoría nueva
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Categoria categoria) {
        boolean creado = categoriaService.crearCategoria(categoria.getNombre());

        if (creado) {
            return new ResponseEntity<>("{\"mensaje\": \"Categoría creada correctamente\"}", HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>("{\"error\": \"La categoría ya existe\"}", HttpStatus.BAD_REQUEST);
        }
    }

    // 2. Listar todas (Útil para llenar el SELECT en React)
    @GetMapping
    public ResponseEntity<List<Categoria>> listar() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }
}