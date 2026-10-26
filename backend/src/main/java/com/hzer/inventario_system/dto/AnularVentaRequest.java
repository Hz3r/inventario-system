package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AnularVentaRequest {

    @NotBlank(message = "Indica por qué se anula")
    @Size(max = 255)
    private String motivo;
}