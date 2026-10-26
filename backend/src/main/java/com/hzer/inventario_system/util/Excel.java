package com.hzer.inventario_system.util;

import com.hzer.inventario_system.exception.ReglaNegocioException;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Leer y escribir hojas de Excel (.xlsx y .xls) para la importación masiva.
 * Los títulos de las columnas se reconocen sin importar mayúsculas, tildes ni espacios:
 * "Precio de Venta", "precio venta" y "PRECIOVENTA" son la misma columna.
 */
public final class Excel {

    private Excel() {
    }

    /** Una columna de la plantilla */
    public record Columna(String campo, String titulo, boolean obligatoria, String descripcion, String ejemplo,
                          List<String> opciones, List<String> alias) {

        public Columna(String campo, String titulo, boolean obligatoria, String descripcion, String ejemplo,
                       String... alias) {
            this(campo, titulo, obligatoria, descripcion, ejemplo, List.of(), List.of(alias));
        }

        /** Columna con lista desplegable en la plantilla (ej. UND / KG / LT) */
        public Columna conOpciones(String... valores) {
            return new Columna(campo, titulo, obligatoria, descripcion, ejemplo, List.of(valores), alias);
        }

        boolean reconoce(String tituloNormalizado) {
            return normalizar(titulo).equals(tituloNormalizado)
                    || alias.stream().anyMatch(a -> normalizar(a).equals(tituloNormalizado));
        }
    }

    // ============================ LECTURA ============================

    /**
     * Una fila leída. Los métodos de lectura no lanzan error: si el valor está mal,
     * lo anotan en {@link #errores()} y devuelven null, para mostrar todos los problemas juntos.
     */
    public static final class Fila {
        private final int numero;
        private final Map<String, Object> valores;
        private final Map<String, String> titulos;
        private final List<String> errores = new ArrayList<>();

        Fila(int numero, Map<String, Object> valores, Map<String, String> titulos) {
            this.numero = numero;
            this.valores = valores;
            this.titulos = titulos;
        }

        /** Número de fila tal como se ve en Excel (la primera es 1) */
        public int numero() {
            return numero;
        }

        public List<String> errores() {
            return errores;
        }

        public boolean tiene(String campo) {
            return valores.get(campo) != null;
        }

        public String texto(String campo) {
            Object v = valores.get(campo);
            if (v == null) return null;
            if (v instanceof BigDecimal n) return n.stripTrailingZeros().toPlainString();   // 7750182000123, no 7.75E+12
            if (v instanceof LocalDate d) return d.toString();
            String s = v.toString().trim();
            return s.isEmpty() ? null : s;
        }

        public BigDecimal numero(String campo) {
            Object v = valores.get(campo);
            if (v == null) return null;
            if (v instanceof BigDecimal n) return n;
            String s = v.toString().trim().replaceAll("(?i)s/\\.?|\\s", "");
            if (s.isEmpty()) return null;
            if (s.contains(",") && s.contains(".")) s = s.replace(",", "");   // 1,250.50
            else s = s.replace(",", ".");                                     // 12,50
            try {
                return new BigDecimal(s);
            } catch (NumberFormatException e) {
                return invalido(campo, v, "debe ser un número");
            }
        }

        public LocalDate fecha(String campo) {
            Object v = valores.get(campo);
            if (v == null) return null;
            if (v instanceof LocalDate d) return d;
            String s = v.toString().trim();
            for (DateTimeFormatter f : FORMATOS_FECHA) {
                try {
                    return LocalDate.parse(s, f);
                } catch (DateTimeParseException ignored) {
                    // se prueba el siguiente formato
                }
            }
            return invalido(campo, v, "debe ser una fecha (dd/mm/aaaa)");
        }

        /** SI / NO, true / false, 1 / 0, X */
        public Boolean siNo(String campo) {
            String s = texto(campo);
            if (s == null) return null;
            return switch (normalizar(s)) {
                case "si", "s", "true", "verdadero", "1", "x" -> true;
                case "no", "n", "false", "falso", "0" -> false;
                default -> invalido(campo, s, "debe ser SI o NO");
            };
        }

        public <T> T invalido(String campo, Object valor, String motivo) {
            errores.add("'" + titulos.getOrDefault(campo, campo) + "' " + motivo + " (se leyó: " + valor + ")");
            return null;
        }
    }

    private static final List<DateTimeFormatter> FORMATOS_FECHA = List.of(
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("yyyy/M/d"));

    /**
     * Lee la primera hoja del archivo. La fila de títulos es la primera (de las 10 primeras)
     * en la que se reconoce alguna columna; las columnas desconocidas se ignoran.
     */
    public static List<Fila> leer(InputStream archivo, List<Columna> columnas, int maxFilas) {
        try (Workbook libro = WorkbookFactory.create(archivo)) {
            if (libro.getNumberOfSheets() == 0) throw new ReglaNegocioException("El archivo no tiene hojas");
            Sheet hoja = libro.getSheetAt(0);
            FormulaEvaluator evaluador = libro.getCreationHelper().createFormulaEvaluator();

            // 1) Buscar la fila de títulos
            Map<Integer, Columna> porIndice = new HashMap<>();
            int filaTitulos = -1;
            for (int r = hoja.getFirstRowNum(); r <= Math.min(hoja.getLastRowNum(), hoja.getFirstRowNum() + 9) && filaTitulos < 0; r++) {
                Row row = hoja.getRow(r);
                if (row == null) continue;
                for (Cell c : row) {
                    Object v = valor(c, evaluador);
                    if (v == null) continue;
                    String t = normalizar(v.toString());
                    columnas.stream().filter(col -> col.reconoce(t)).findFirst()
                            .ifPresent(col -> porIndice.putIfAbsent(c.getColumnIndex(), col));
                }
                if (!porIndice.isEmpty()) filaTitulos = r;
            }
            if (filaTitulos < 0) {
                throw new ReglaNegocioException("No se encontró la fila de títulos. Usa la plantilla: la primera fila debe tener "
                        + "títulos como " + columnas.stream().limit(3).map(c -> "'" + c.titulo() + "'").toList());
            }
            List<String> faltan = columnas.stream().filter(Columna::obligatoria)
                    .filter(col -> !porIndice.containsValue(col)).map(Columna::titulo).toList();
            if (!faltan.isEmpty()) {
                throw new ReglaNegocioException("Falta la columna obligatoria: " + String.join(", ", faltan));
            }

            Map<String, String> titulos = new HashMap<>();
            columnas.forEach(c -> titulos.put(c.campo(), c.titulo()));

            // 2) Leer los datos (las filas vacías se saltan)
            List<Fila> filas = new ArrayList<>();
            for (int r = filaTitulos + 1; r <= hoja.getLastRowNum(); r++) {
                Row row = hoja.getRow(r);
                if (row == null) continue;
                Map<String, Object> valores = new HashMap<>();
                porIndice.forEach((idx, col) -> {
                    Object v = valor(row.getCell(idx), evaluador);
                    if (v != null) valores.put(col.campo(), v);
                });
                if (valores.isEmpty()) continue;
                if (filas.size() >= maxFilas) {
                    throw new ReglaNegocioException("El archivo tiene más de " + maxFilas
                            + " filas con datos. Divídelo en varios archivos.");
                }
                filas.add(new Fila(r + 1, valores, titulos));
            }
            if (filas.isEmpty()) throw new ReglaNegocioException("El archivo no tiene filas con datos debajo de los títulos");
            return filas;
        } catch (EncryptedDocumentException e) {
            throw new ReglaNegocioException("El archivo tiene contraseña. Quítasela y vuelve a intentarlo.");
        } catch (IOException | RuntimeException e) {
            if (e instanceof ReglaNegocioException r) throw r;
            throw new ReglaNegocioException("No se pudo leer el archivo. Asegúrate de que sea un Excel (.xlsx o .xls).");
        }
    }

    /** Valor de una celda: String, BigDecimal, LocalDate o Boolean (null si está vacía) */
    private static Object valor(Cell c, FormulaEvaluator evaluador) {
        if (c == null) return null;
        CellType tipo = c.getCellType();
        if (tipo == CellType.FORMULA) {
            try {
                tipo = evaluador.evaluateFormulaCell(c);
            } catch (RuntimeException e) {
                tipo = c.getCachedFormulaResultType();   // fórmula que POI no sabe calcular: usa lo guardado
            }
        }
        return switch (tipo) {
            case STRING -> {
                String s = c.getStringCellValue().trim();
                yield s.isEmpty() ? null : s;
            }
            case NUMERIC -> DateUtil.isCellDateFormatted(c)
                    ? c.getLocalDateTimeCellValue().toLocalDate()
                    : BigDecimal.valueOf(c.getNumericCellValue());
            case BOOLEAN -> c.getBooleanCellValue() ? "SI" : "NO";
            default -> null;
        };
    }

    /** "Precio de Venta (S/)" → "preciodeventas" (minúsculas, sin tildes ni símbolos) */
    public static String normalizar(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    // ============================ ESCRITURA ============================

    /**
     * Crea un .xlsx con una hoja de datos (títulos + filas) y una hoja de instrucciones.
     * Las celdas de las filas pueden ser String, BigDecimal, LocalDate, LocalDateTime o null.
     */
    public static byte[] escribir(String nombreHoja, List<Columna> columnas, List<List<Object>> filas) {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Font negrita = libro.createFont();
            negrita.setBold(true);
            negrita.setColor(IndexedColors.WHITE.getIndex());

            CellStyle titulo = libro.createCellStyle();
            titulo.setFont(negrita);
            titulo.setFillForegroundColor(IndexedColors.BLACK.getIndex());
            titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle texto = libro.createCellStyle();
            texto.setDataFormat(libro.createDataFormat().getFormat("@"));   // códigos largos no se vuelven 7.75E+12
            CellStyle fecha = libro.createCellStyle();
            fecha.setDataFormat(libro.createDataFormat().getFormat("dd/mm/yyyy"));
            CellStyle decimal = libro.createCellStyle();
            decimal.setDataFormat(libro.createDataFormat().getFormat("0.00"));

            // ---- Hoja de datos ----
            Sheet hoja = libro.createSheet(nombreHoja);
            Row cabecera = hoja.createRow(0);
            boolean[] esTexto = new boolean[columnas.size()];
            for (int i = 0; i < columnas.size(); i++) {
                Cell c = cabecera.createCell(i);
                c.setCellValue(columnas.get(i).titulo() + (columnas.get(i).obligatoria() ? " *" : ""));
                c.setCellStyle(titulo);
                hoja.setColumnWidth(i, Math.max(14, columnas.get(i).titulo().length() + 6) * 256);
                // Las columnas de texto (códigos, DNI, RUC, teléfonos) se formatean como texto
                esTexto[i] = columnas.get(i).ejemplo() != null && columnas.get(i).ejemplo().matches("\\d{6,}");
                if (esTexto[i]) hoja.setDefaultColumnStyle(i, texto);
            }
            hoja.createFreezePane(0, 1);

            for (int r = 0; r < filas.size(); r++) {
                Row row = hoja.createRow(r + 1);
                List<Object> fila = filas.get(r);
                for (int i = 0; i < fila.size() && i < columnas.size(); i++) {
                    Object v = fila.get(i);
                    if (v == null) continue;
                    Cell c = row.createCell(i);
                    switch (v) {
                        case BigDecimal n -> {
                            c.setCellValue(n.doubleValue());
                            if (n.scale() == 2) c.setCellStyle(decimal);
                        }
                        case LocalDate d -> {
                            c.setCellValue(d);
                            c.setCellStyle(fecha);
                        }
                        case LocalDateTime d -> {
                            c.setCellValue(d.toLocalDate());
                            c.setCellStyle(fecha);
                        }
                        default -> {
                            c.setCellValue(v.toString());
                            if (esTexto[i]) c.setCellStyle(texto);
                        }
                    }
                }
            }

            // Listas desplegables (ej. Unidad: UND / KG / LT)
            DataValidationHelper ayuda = hoja.getDataValidationHelper();
            for (int i = 0; i < columnas.size(); i++) {
                List<String> opciones = columnas.get(i).opciones();
                if (opciones.isEmpty()) continue;
                DataValidation v = ayuda.createValidation(
                        ayuda.createExplicitListConstraint(opciones.toArray(String[]::new)),
                        new CellRangeAddressList(1, 5000, i, i));
                v.setShowErrorBox(true);
                hoja.addValidationData(v);
            }

            // ---- Hoja de instrucciones ----
            Sheet ayudaHoja = libro.createSheet("Instrucciones");
            Row t = ayudaHoja.createRow(0);
            String[] encabezados = {"Columna", "¿Obligatoria?", "Qué poner", "Ejemplo"};
            for (int i = 0; i < encabezados.length; i++) {
                Cell c = t.createCell(i);
                c.setCellValue(encabezados[i]);
                c.setCellStyle(titulo);
            }
            for (int i = 0; i < columnas.size(); i++) {
                Columna col = columnas.get(i);
                Row row = ayudaHoja.createRow(i + 1);
                row.createCell(0).setCellValue(col.titulo());
                row.createCell(1).setCellValue(col.obligatoria() ? "SÍ" : "no");
                row.createCell(2).setCellValue(col.descripcion()
                        + (col.opciones().isEmpty() ? "" : " Valores: " + String.join(", ", col.opciones())));
                row.createCell(3).setCellValue(col.ejemplo() == null ? "" : col.ejemplo());
            }
            int nota = columnas.size() + 2;
            ayudaHoja.createRow(nota).createCell(0).setCellValue(
                    "Llena la hoja '" + nombreHoja + "' desde la fila 2. Las columnas con * son obligatorias.");
            ayudaHoja.createRow(nota + 1).createCell(0).setCellValue(
                    "Si un registro ya existe, se actualiza; las celdas vacías no borran lo que ya tenías.");
            ayudaHoja.setColumnWidth(0, 24 * 256);
            ayudaHoja.setColumnWidth(1, 14 * 256);
            ayudaHoja.setColumnWidth(2, 80 * 256);
            ayudaHoja.setColumnWidth(3, 22 * 256);

            libro.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el Excel", e);
        }
    }
}
