package com.hzer.inventario_system.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * IGV del Perú (18 %: 16 % IGV + 2 % IPM).
 * Los precios de la bodega INCLUYEN el IGV; aquí se separan la base y el impuesto.
 *
 *   precio con IGV = 11.80  →  base = 11.80 / 1.18 = 10.00  →  IGV = 1.80
 */
public final class Igv {

    public static final BigDecimal TASA = new BigDecimal("0.18");
    private static final BigDecimal FACTOR = BigDecimal.ONE.add(TASA);   // 1.18

    private Igv() {
    }

    /** Valor sin IGV de un monto que ya incluye IGV */
    public static BigDecimal base(BigDecimal conIgv) {
        if (conIgv == null) return BigDecimal.ZERO.setScale(2);
        return conIgv.divide(FACTOR, 2, RoundingMode.HALF_UP);
    }

    /** Cuánto de ese monto es IGV (siempre cuadra: base + igv = monto) */
    public static BigDecimal impuesto(BigDecimal conIgv) {
        if (conIgv == null) return BigDecimal.ZERO.setScale(2);
        return conIgv.setScale(2, RoundingMode.HALF_UP).subtract(base(conIgv));
    }
}
