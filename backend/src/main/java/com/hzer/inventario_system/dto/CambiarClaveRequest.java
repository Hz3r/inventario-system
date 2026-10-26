package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CambiarClaveRequest {

    @NotBlank(message = "Escribe tu contraseña actual")
    private String claveActual;

    @NotBlank(message = "Escribe la nueva contraseña")
    @Size(min = 6, max = 100, message = "La nueva contraseña debe tener al menos 6 caracteres")
    private String claveNueva;
}
