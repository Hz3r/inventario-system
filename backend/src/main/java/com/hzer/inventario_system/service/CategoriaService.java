package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.CategoriaRequest;
import com.hzer.inventario_system.dto.CategoriaResponse;
import com.hzer.inventario_system.entities.Categoria;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.CategoryRepository;
import com.hzer.inventario_system.repository.ConteoPorCategoria;
import com.hzer.inventario_system.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoriaService {

    private final CategoryRepository categoryRepository;
    private final ProductoRepository productoRepository;

    public List<CategoriaResponse> listar() {
        Map<Long, Long> conteo = productoRepository.contarPorCategoria().stream()
                .collect(Collectors.toMap(ConteoPorCategoria::getCategoriaId, ConteoPorCategoria::getTotal));
        return categoryRepository.findAllByOrderByNombreAsc().stream()
                .map(c -> new CategoriaResponse(c.getId(), c.getNombre(), conteo.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CategoriaResponse crear(CategoriaRequest req) {
        String nombre = normalizar(req.getNombre());
        if (categoryRepository.existsByNombreIgnoreCase(nombre)) {
            throw new ReglaNegocioException("Ya existe la categoría '" + nombre + "'");
        }
        Categoria c = new Categoria();
        c.setNombre(nombre);
        c = categoryRepository.save(c);
        return new CategoriaResponse(c.getId(), c.getNombre(), 0);
    }

    @Transactional
    public CategoriaResponse renombrar(Long id, CategoriaRequest req) {
        Categoria c = buscar(id);
        String nombre = normalizar(req.getNombre());
        if (categoryRepository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw new ReglaNegocioException("Ya existe la categoría '" + nombre + "'");
        }
        c.setNombre(nombre);
        return new CategoriaResponse(c.getId(), c.getNombre(), productoRepository.countByCategoriaIdAndActivoTrue(id));
    }

    @Transactional
    public void eliminar(Long id) {
        Categoria c = buscar(id);
        long activos = productoRepository.countByCategoriaIdAndActivoTrue(id);
        if (activos > 0) {
            throw new ReglaNegocioException("La categoría '" + c.getNombre() + "' tiene " + activos
                    + " producto(s). Muévelos a otra categoría antes de eliminarla.");
        }
        productoRepository.quitarCategoriaAInactivos(id);
        categoryRepository.delete(c);
    }

    private Categoria buscar(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría", id));
    }

    /** "  bebidas   frías " -> "bebidas frías" */
    private String normalizar(String nombre) {
        return nombre.trim().replaceAll("\\s+", " ");
    }
}