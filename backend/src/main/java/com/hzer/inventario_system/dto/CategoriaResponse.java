package com.hzer.inventario_system.dto;

/** productos = cuántos productos activos tiene */
public record CategoriaResponse(Long id, String nombre, long productos) {
}