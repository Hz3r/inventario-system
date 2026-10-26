package com.hzer.inventario_system.dto;

import java.util.List;

/**
 * Resultado de leer un Excel.
 * Con confirmado = false es solo la vista previa (no se guardó nada);
 * con confirmado = true dice qué se guardó realmente.
 */
public record ImportacionResponse(
        String tipo,
        boolean confirmado,
        int total,
        int nuevos,
        int actualizados,
        int conError,
        List<Fila> filas
) {
    public enum Accion { CREAR, ACTUALIZAR, ERROR }

    /** numero = número de fila en Excel, para que el usuario la encuentre fácil */
    public record Fila(int numero, Accion accion, String descripcion, List<String> errores, List<String> avisos) {
    }
}
