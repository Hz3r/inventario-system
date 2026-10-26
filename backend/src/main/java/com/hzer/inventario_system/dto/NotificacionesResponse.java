package com.hzer.inventario_system.dto;

import java.util.List;

public record NotificacionesResponse(
        long noLeidas,
        long criticas,          // no leídas y de nivel CRITICA
        List<NotificacionResponse> notificaciones
) {
}
