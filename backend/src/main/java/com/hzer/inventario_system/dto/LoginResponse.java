package com.hzer.inventario_system.dto;

import java.time.Instant;

public record LoginResponse(String token, Instant expiraEn, UsuarioResponse usuario) {
}
