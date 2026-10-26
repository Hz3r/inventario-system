package com.hzer.inventario_system.exception;

/** Se lanza cuando algo es válido técnicamente pero no tiene sentido para la tienda → 400 */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}