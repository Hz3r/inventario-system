package com.hzer.inventario_system.util;

import com.hzer.inventario_system.entities.TipoValorEtiqueta;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class EtiquetaBalanzaTest {

    private static final EtiquetaBalanza.Config PESO = new EtiquetaBalanza.Config(true, "20", 5, TipoValorEtiqueta.PESO);
    private static final EtiquetaBalanza.Config PRECIO = new EtiquetaBalanza.Config(true, "2", 6, TipoValorEtiqueta.PRECIO);

    @Test
    void leePesoEnKilos() {
        // 20 | 00123 | 01250 | control
        String codigo = conControl("200012301250");
        EtiquetaBalanza.Lectura l = EtiquetaBalanza.leer(codigo, PESO).orElseThrow();
        assertEquals("123", l.plu());
        assertEquals(0, new BigDecimal("1.250").compareTo(l.valor()));
        assertEquals(TipoValorEtiqueta.PESO, l.tipo());
    }

    @Test
    void leeImporteEnSoles() {
        // 2 | 000045 | 00875 | control
        String codigo = conControl("200004500875");
        EtiquetaBalanza.Lectura l = EtiquetaBalanza.leer(codigo, PRECIO).orElseThrow();
        assertEquals("45", l.plu());
        assertEquals(0, new BigDecimal("8.75").compareTo(l.valor()));
    }

    @Test
    void ignoraCodigosNormalesYConfigDesactivada() {
        assertTrue(EtiquetaBalanza.leer("7750182000123", PESO).isEmpty());          // EAN de fábrica
        assertTrue(EtiquetaBalanza.leer("12345", PESO).isEmpty());                  // corto
        var apagada = new EtiquetaBalanza.Config(false, "20", 5, TipoValorEtiqueta.PESO);
        assertTrue(EtiquetaBalanza.leer(conControl("200012301250"), apagada).isEmpty());
    }

    @Test
    void rechazaDigitoDeControlIncorrecto() {
        String bueno = conControl("200012301250");
        char malo = (char) ('0' + ((bueno.charAt(12) - '0' + 1) % 10));
        assertThrows(IllegalArgumentException.class, () -> EtiquetaBalanza.leer(bueno.substring(0, 12) + malo, PESO));
    }

    @Test
    void digitoDeControlDeUnEanReal() {
        assertTrue(EtiquetaBalanza.digitoControlValido("4006381333931"));   // EAN-13 de ejemplo conocido
        assertFalse(EtiquetaBalanza.digitoControlValido("4006381333932"));
    }

    @Test
    void normalizaPlu() {
        assertEquals("123", EtiquetaBalanza.normalizarPlu("00123"));
        assertNull(EtiquetaBalanza.normalizarPlu("000"));
        assertNull(EtiquetaBalanza.normalizarPlu(null));
    }

    private static String conControl(String doce) {
        for (int d = 0; d <= 9; d++) {
            if (EtiquetaBalanza.digitoControlValido(doce + d)) return doce + d;
        }
        throw new IllegalStateException();
    }
}
