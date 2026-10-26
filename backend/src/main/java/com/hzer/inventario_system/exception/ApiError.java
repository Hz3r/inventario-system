package com.hzer.inventario_system.exception;

import java.time.LocalDateTime;
import java.util.Map;

/** Forma única de todas las respuestas de error de la API */
public record ApiError(
        LocalDateTime fecha,
        int status,
        String error,
        String mensaje,
        Map<String, String> campos   // errores por campo del formulario (puede ser null)
) {
}