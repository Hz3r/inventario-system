package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.ProductRequest;
import com.hzer.inventario_system.entities.Categoria;
import com.hzer.inventario_system.entities.Producto;
import com.hzer.inventario_system.repository.CategoryRepository;
import com.hzer.inventario_system.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoryRepository categoryRepository;

    public Producto crearProducto(ProductRequest request) {

        Categoria categoria = categoryRepository.findById(request.getCategoriaId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        Producto producto = new Producto();

        producto.setNombre(request.getNombre());
        producto.setCodigoBarras(request.getCodigoBarras());
        producto.setPrecioCosto(request.getPrecioCosto());
        producto.setPrecioVenta(request.getPrecioVenta());
        producto.setStockInicial(request.getStockInicial());
        producto.setUnidadMedida(request.getUnidadMedida());
        producto.setIgv(request.getIgv());
        producto.setStockMinimo(request.getStockMinimo());
        producto.setVencimiento(request.getVencimiento());
        producto.setImagenURL(request.getImagenURL());

        producto.setCategoria(categoria);

        return productoRepository.save(producto);
    }

    public List<Producto> listar() {
        return productoRepository.findAll();
    }

    public Producto obtener(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    public void eliminar(Long id) {
        productoRepository.deleteById(id);
    }

}