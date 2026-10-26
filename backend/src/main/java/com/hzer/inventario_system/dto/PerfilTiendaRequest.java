package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PerfilTiendaRequest {

    @NotBlank(message = "Escribe el nombre de la bodega")
    @Size(max = 100, message = "Máximo 100 caracteres")
    private String nombre;

    /** Vacío, DNI (8 dígitos) o RUC (11 dígitos) */
    @Pattern(regexp = "^$|^\\d{8}$|^\\d{11}$", message = "El RUC tiene 11 dígitos (o DNI de 8)")
    private String ruc;

    @Size(max = 255, message = "Máximo 255 caracteres")
    private String direccion;

    @Size(max = 20, message = "Máximo 20 caracteres")
    private String telefono;

    @Size(max = 255, message = "Máximo 255 caracteres")
    private String mensajeTicket;

    @NotNull(message = "Elige el ancho del papel")
    private Integer anchoTicket;

    /** Imagen como data URL ("data:image/png;base64,..."). null = sin logo */
    private String logo;
}
