package com.hzer.inventario_system.repository;

/** Resultado de contar productos agrupados por categoría */
public interface ConteoPorCategoria {
    Long getCategoriaId();
    Long getTotal();
}