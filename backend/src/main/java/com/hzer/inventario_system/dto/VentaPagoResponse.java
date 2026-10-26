package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.MetodoPago;
import com.hzer.inventario_system.entities.VentaPago;

import java.math.BigDecimal;

public record VentaPagoResponse(MetodoPago metodo, BigDecimal monto, String referencia) {

    public static VentaPagoResponse desde(VentaPago p) {
        return new VentaPagoResponse(p.getMetodo(), p.getMonto(), p.getReferencia());
    }
}