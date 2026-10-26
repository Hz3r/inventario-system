package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.NivelNotificacion;
import com.hzer.inventario_system.entities.TipoNotificacion;

import java.time.LocalDateTime;

/**
 * Una alerta para la campanita.
 * La "clave" identifica la situación (ej. STOCK_BAJO:12:3): si el stock cambia, la clave cambia
 * y la alerta vuelve a aparecer como nueva aunque la anterior se haya marcado como leída.
 */
public record NotificacionResponse(
        String clave,
        TipoNotificacion tipo,
        NivelNotificacion nivel,
        String titulo,
        String mensaje,
        String enlace,          // ruta del frontend a la que lleva (ej. /inventario)
        LocalDateTime fecha,
        boolean leida
) {
}
