package com.hzer.inventario_system.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class MarcarLeidasRequest {

    @NotEmpty(message = "Indica qué notificaciones marcar")
    @Size(max = 500)
    private List<@Size(max = 150) String> claves;
}
