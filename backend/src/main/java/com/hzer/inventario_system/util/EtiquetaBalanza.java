package com.hzer.inventario_system.util;

import com.hzer.inventario_system.entities.TipoValorEtiqueta;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Lee los códigos de barras que imprimen las balanzas de etiquetas (EAN-13 de uso interno).
 *
 * Ejemplo con prefijo "20", PLU de 5 dígitos y peso:
 * <pre>
 *   20 00123 01250 8
 *   │  │     │     └ dígito de control
 *   │  │     └ valor: 01250 gramos = 1.250 kg   (o 01250 céntimos = S/ 12.50)
 *   │  └ PLU del producto (123)
 *   └ prefijo que indica "etiqueta de balanza"
 * </pre>
 */
public final class EtiquetaBalanza {

    private EtiquetaBalanza() {
    }

    public record Config(boolean activa, String prefijo, int digitosPlu, TipoValorEtiqueta tipoValor) {

        /** Cuántos dígitos quedan para el valor (13 - prefijo - PLU - control) */
        public int digitosValor() {
            return 12 - prefijo.length() - digitosPlu;
        }
    }

    /**
     * @param plu   sin ceros a la izquierda ("00123" → "123"), igual que se guarda en productos.plu
     * @param valor kilos (PESO, 3 decimales) o soles (PRECIO, 2 decimales)
     */
    public record Lectura(String plu, TipoValorEtiqueta tipo, BigDecimal valor) {
    }

    /** ¿Este código tiene forma de etiqueta de balanza? (no valida el dígito de control) */
    public static boolean pareceEtiqueta(String codigo, Config config) {
        return config.activa() && codigo != null && codigo.length() == 13
                && codigo.chars().allMatch(Character::isDigit) && codigo.startsWith(config.prefijo());
    }

    /**
     * Lee la etiqueta. Vacío si no tiene forma de etiqueta.
     *
     * @throws IllegalArgumentException si tiene forma de etiqueta pero el dígito de control no cuadra (mala lectura)
     */
    public static Optional<Lectura> leer(String codigo, Config config) {
        if (!pareceEtiqueta(codigo, config)) return Optional.empty();
        if (!digitoControlValido(codigo)) {
            throw new IllegalArgumentException("El código " + codigo + " está mal leído (dígito de control incorrecto)");
        }
        int inicioPlu = config.prefijo().length();
        int inicioValor = inicioPlu + config.digitosPlu();
        String plu = normalizarPlu(codigo.substring(inicioPlu, inicioValor));
        BigDecimal numero = new BigDecimal(codigo.substring(inicioValor, 12));
        BigDecimal valor = config.tipoValor() == TipoValorEtiqueta.PESO
                ? numero.movePointLeft(3)     // gramos → kilos
                : numero.movePointLeft(2);    // céntimos → soles
        return Optional.of(new Lectura(plu, config.tipoValor(), valor));
    }

    /** "00123" → "123" ; "0" o vacío → null */
    public static String normalizarPlu(String plu) {
        if (plu == null) return null;
        String s = plu.trim().replaceFirst("^0+", "");
        return s.isEmpty() ? null : s;
    }

    /** Dígito de control EAN-13: pesos 1 y 3 alternados sobre los 12 primeros */
    public static boolean digitoControlValido(String codigo) {
        int suma = 0;
        for (int i = 0; i < 12; i++) {
            int d = codigo.charAt(i) - '0';
            suma += (i % 2 == 0) ? d : d * 3;
        }
        int control = (10 - suma % 10) % 10;
        return control == codigo.charAt(12) - '0';
    }
}
