package com.hzer.inventario_system.seguridad;

/** Correo o contraseña incorrectos → 401 */
public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException() {
        super("Correo o contraseña incorrectos");
    }
}
