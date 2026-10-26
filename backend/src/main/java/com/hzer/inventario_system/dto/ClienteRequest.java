package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ClienteRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150)
    private String nombre;

    @Pattern(regexp = "^$|^\\d{8}$", message = "El DNI debe tener 8 dígitos")
    private String dni;

    @Size(max = 20)
    private String telefono;

    @Size(max = 255)
    private String direccion;

    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal limiteCredito;

    @Size(max = 255)
    private String nota;
}