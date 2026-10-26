package com.hzer.inventario_system.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class CompraRequest {

    @NotNull(message = "Elige el proveedor")
    private Long proveedorId;

    @NotEmpty(message = "Agrega al menos un producto")
    @Valid
    private List<CompraItemRequest> items;

    @Size(max = 255)
    private String nota;
}
