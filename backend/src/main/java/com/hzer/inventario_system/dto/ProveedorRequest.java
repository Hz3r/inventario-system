package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ProveedorRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150)
    private String nombre;

    @Pattern(regexp = "^$|^\\d{11}$", message = "El RUC debe tener 11 dígitos")
    private String ruc;

    @Size(max = 100)
    private String contacto;

    @Size(max = 20)
    private String telefono;

    @Email(message = "Correo inválido")
    @Size(max = 150)
    private String email;

    @Size(max = 255)
    private String direccion;
}
