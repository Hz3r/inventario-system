package com.hzer.inventario_system.service;


import com.hzer.inventario_system.dto.ProductRequest;
import com.hzer.inventario_system.entities.Categoria;
import com.hzer.inventario_system.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoryRepository categoryRepository;

    public boolean crearCategoria(String nombreCategoria) {
        // 1. Buscamos si ya existe una con ese nombre
        Optional<Categoria> categoriaOpt = categoryRepository.findByNombre(nombreCategoria);

        // 2. Si YA existe, no la creamos (evitamos duplicados)
        if (categoriaOpt.isPresent()) {
            return false;
        }

        // 3. Si NO existe, la creamos desde cero
        Categoria nuevaCategoria = new Categoria();
        nuevaCategoria.setNombre(nombreCategoria);

        // 4. Guardamos en MySQL
        categoryRepository.save(nuevaCategoria);
        return true;
    }
}