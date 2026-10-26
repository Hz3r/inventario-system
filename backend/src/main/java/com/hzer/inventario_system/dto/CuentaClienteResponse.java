package com.hzer.inventario_system.dto;

import java.util.List;

/** Todo lo de un cliente: sus datos (con deuda actual), sus fiados y sus abonos */
public record CuentaClienteResponse(
        ClienteResponse cliente,
        List<FiadoResponse> fiados,
        List<AbonoResponse> abonos
) {
}
