package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.dto.ImportacionResponse.Accion;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.*;
import com.hzer.inventario_system.util.EtiquetaBalanza;
import com.hzer.inventario_system.util.Excel;
import com.hzer.inventario_system.util.Excel.Columna;
import com.hzer.inventario_system.util.Excel.Fila;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Importación masiva desde Excel: productos, clientes y proveedores.
 *
 * Funciona en dos pasos:
 *  1. Vista previa (confirmar = false): lee y valida TODO, dice qué se va a crear / actualizar
 *     y qué filas tienen errores. No guarda nada.
 *  2. Confirmar (confirmar = true): guarda las filas correctas. Cada fila se guarda por separado
 *     (con los mismos servicios que usan las pantallas), así una fila con error no tumba a las demás
 *     y el stock siempre entra por el kardex.
 *
 * Si el registro ya existe (mismo código de barras / DNI / RUC, o mismo nombre) se actualiza,
 * y las celdas vacías conservan lo que ya tenía.
 *
 * Esta clase NO es @Transactional a propósito: cada servicio abre y cierra su propia transacción.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportacionService {

    public static final int MAX_FILAS = 3000;
    private static final String NOTA_KARDEX = "Importado desde Excel";

    public enum Tipo { PRODUCTOS, CLIENTES, PROVEEDORES }

    private final ProductoService productoService;
    private final ClienteService clienteService;
    private final ProveedorService proveedorService;
    private final ProductoRepository productoRepository;
    private final ProductoPresentacionRepository presentacionRepository;
    private final CategoryRepository categoryRepository;
    private final ProveedorRepository proveedorRepository;
    private final ClienteRepository clienteRepository;
    private final Validator validator;

    // ============================ COLUMNAS ============================

    static final List<Columna> COLUMNAS_PRODUCTOS = List.of(
            new Columna("nombre", "Nombre", true, "Nombre del producto como aparecerá en la venta.",
                    "Cerveza Pilsen 630ml", "producto", "descripcion", "nombre del producto"),
            new Columna("codigo", "Código de barras", false,
                    "Código que lee la pistola. Si ya existe un producto con ese código, se actualiza.",
                    "7750182000123", "codigo", "codigo barras", "cod barras", "ean", "barcode"),
            new Columna("plu", "PLU balanza", false,
                    "Código del producto en la balanza de etiquetas (1 a 6 dígitos). Solo para productos que se pesan.",
                    "123", "plu", "codigo balanza", "cod balanza"),
            new Columna("categoria", "Categoría", false, "Si la categoría no existe, se crea.",
                    "Cervezas", "categoria", "rubro", "familia"),
            new Columna("precioCosto", "Precio costo", false, "Lo que te cuesta a ti (S/).",
                    "5.20", "costo", "precio compra", "precio de compra", "p costo"),
            new Columna("precioVenta", "Precio venta", true, "Precio al público (S/).",
                    "7.00", "precio", "pventa", "p venta", "precio de venta", "precio publico"),
            new Columna("stock", "Stock", false,
                    "Cantidad que tienes ahora. En productos existentes, la diferencia se registra como ajuste en el kardex.",
                    "24", "stock actual", "cantidad", "existencias", "stock inicial"),
            new Columna("stockMinimo", "Stock mínimo", false, "Cuando el stock llegue a este número, te avisa.",
                    "6", "minimo", "stock min"),
            new Columna("unidad", "Unidad", false, "Unidad en la que se cuenta el stock. Por defecto UND.",
                    "UND", "unidad medida", "unidad de medida", "um").conOpciones("UND", "KG", "LT"),
            new Columna("igv", "IGV", false, "¿El precio incluye IGV? Por defecto SI.", "SI", "afecto igv")
                    .conOpciones("SI", "NO"),
            new Columna("vencimiento", "Vencimiento", false, "Fecha de vencimiento (dd/mm/aaaa).",
                    "31/12/2026", "fecha vencimiento", "fecha de vencimiento", "vence"),
            new Columna("proveedor", "Proveedor", false,
                    "Nombre o RUC de un proveedor ya registrado.", "Backus", "proveedor", "ruc proveedor"));

    static final List<Columna> COLUMNAS_CLIENTES = List.of(
            new Columna("nombre", "Nombre", true, "Nombre del cliente.", "Rosa Quispe",
                    "cliente", "nombres", "nombre completo"),
            new Columna("dni", "DNI", false, "8 dígitos. Si ya existe un cliente con ese DNI, se actualiza.",
                    "45678912", "documento", "nro documento"),
            new Columna("telefono", "Teléfono", false, "Celular o teléfono.", "987654321", "celular", "telf"),
            new Columna("direccion", "Dirección", false, "Dónde vive.", "Av. Bolognesi 123", "domicilio"),
            new Columna("limiteCredito", "Límite de crédito", false,
                    "Hasta cuánto se le puede fiar (S/). Vacío = sin límite.", "200", "limite", "credito"),
            new Columna("nota", "Nota", false, "Cualquier comentario.", "Paga los sábados",
                    "notas", "observacion", "observaciones", "comentario"));

    static final List<Columna> COLUMNAS_PROVEEDORES = List.of(
            new Columna("nombre", "Nombre", true, "Nombre o razón social.", "Backus y Johnston",
                    "razon social", "proveedor", "empresa"),
            new Columna("ruc", "RUC", false, "11 dígitos. Si ya existe un proveedor con ese RUC, se actualiza.",
                    "20100113610", "nro ruc"),
            new Columna("contacto", "Contacto", false, "Persona con la que hablas (vendedor).", "Juan Pérez",
                    "vendedor", "persona de contacto"),
            new Columna("telefono", "Teléfono", false, "Celular o teléfono.", "952111222", "celular", "telf"),
            new Columna("email", "Email", false, "Correo electrónico.", "ventas@backus.pe", "correo", "e-mail"),
            new Columna("direccion", "Dirección", false, "Dirección del proveedor.", "Av. Industrial 456",
                    "domicilio"));

    public static List<Columna> columnas(Tipo tipo) {
        return switch (tipo) {
            case PRODUCTOS -> COLUMNAS_PRODUCTOS;
            case CLIENTES -> COLUMNAS_CLIENTES;
            case PROVEEDORES -> COLUMNAS_PROVEEDORES;
        };
    }

    // ============================ PLANTILLAS ============================

    /** Plantilla vacía con una fila de ejemplo */
    public byte[] plantilla(Tipo tipo) {
        List<Object> ejemplo = columnas(tipo).stream().map(c -> valorDeEjemplo(c.ejemplo())).toList();
        return Excel.escribir(nombreHoja(tipo), columnas(tipo), List.of(ejemplo));
    }

    /** "7.00" se escribe como número y "31/12/2026" como fecha; códigos, DNI y RUC quedan como texto */
    private Object valorDeEjemplo(String ejemplo) {
        if (ejemplo.matches("\\d{1,5}(\\.\\d+)?")) return new BigDecimal(ejemplo);
        if (ejemplo.matches("\\d{2}/\\d{2}/\\d{4}")) {
            return LocalDate.parse(ejemplo, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        return ejemplo;
    }

    /** Los datos actuales en el mismo formato: se descargan, se editan en Excel y se vuelven a importar */
    public byte[] exportar(Tipo tipo) {
        List<List<Object>> filas = switch (tipo) {
            case PRODUCTOS -> productoService.listar(null).stream()
                    .map(p -> Arrays.<Object>asList(p.nombre(), p.codigoBarras(), p.plu(), p.categoriaNombre(),
                            p.precioCosto(), p.precioVenta(), p.stockActual().stripTrailingZeros(),
                            p.stockMinimo() == null ? null : p.stockMinimo().stripTrailingZeros(),
                            p.unidadMedida().name(), Boolean.FALSE.equals(p.igv()) ? "NO" : "SI",
                            p.vencimiento(), p.proveedorNombre()))
                    .toList();
            case CLIENTES -> clienteService.listar(null).stream()
                    .map(c -> Arrays.<Object>asList(c.nombre(), c.dni(), c.telefono(), c.direccion(),
                            c.limiteCredito(), c.nota()))
                    .toList();
            case PROVEEDORES -> proveedorService.listar().stream()
                    .map(p -> Arrays.<Object>asList(p.nombre(), p.ruc(), p.contacto(), p.telefono(),
                            p.email(), p.direccion()))
                    .toList();
        };
        return Excel.escribir(nombreHoja(tipo), columnas(tipo), filas);
    }

    private String nombreHoja(Tipo tipo) {
        return switch (tipo) {
            case PRODUCTOS -> "Productos";
            case CLIENTES -> "Clientes";
            case PROVEEDORES -> "Proveedores";
        };
    }

    // ============================ IMPORTAR ============================

    public ImportacionResponse importar(Tipo tipo, InputStream archivo, boolean confirmar) {
        List<Fila> filas = Excel.leer(archivo, columnas(tipo), MAX_FILAS);
        List<ImportacionResponse.Fila> resultado = switch (tipo) {
            case PRODUCTOS -> procesar(filas, confirmar, this::planProducto);
            case CLIENTES -> procesar(filas, confirmar, this::planCliente);
            case PROVEEDORES -> procesar(filas, confirmar, this::planProveedor);
        };
        int nuevos = (int) resultado.stream().filter(f -> f.accion() == Accion.CREAR).count();
        int actualizados = (int) resultado.stream().filter(f -> f.accion() == Accion.ACTUALIZAR).count();
        return new ImportacionResponse(tipo.name(), confirmar, resultado.size(), nuevos, actualizados,
                resultado.size() - nuevos - actualizados, resultado);
    }

    /** Lo que se hará con una fila: crear o actualizar, y la acción que lo guarda */
    private record Plan(Accion accion, String descripcion, List<String> errores, List<String> avisos,
                        Runnable guardar) {
    }

    /** Planifica todas las filas (para detectar repetidos dentro del archivo) y, si se confirma, guarda */
    private List<ImportacionResponse.Fila> procesar(List<Fila> filas, boolean confirmar,
                                                    PlanFila planificador) {
        Map<String, Integer> vistos = new HashMap<>();   // clave única → fila donde apareció primero
        List<ImportacionResponse.Fila> salida = new ArrayList<>();
        for (Fila fila : filas) {
            Plan plan = planificador.planificar(fila, vistos);
            List<String> errores = new ArrayList<>(fila.errores());
            errores.addAll(plan.errores());
            Accion accion = errores.isEmpty() ? plan.accion() : Accion.ERROR;

            if (confirmar && accion != Accion.ERROR) {
                try {
                    plan.guardar().run();
                } catch (ReglaNegocioException | RecursoNoEncontradoException e) {
                    accion = Accion.ERROR;
                    errores.add(e.getMessage());
                } catch (DataIntegrityViolationException e) {
                    accion = Accion.ERROR;
                    errores.add("Choca con un registro existente (¿código, DNI o RUC repetido?)");
                } catch (RuntimeException e) {
                    log.error("Error al importar la fila {}", fila.numero(), e);
                    accion = Accion.ERROR;
                    errores.add("No se pudo guardar esta fila");
                }
            }
            salida.add(new ImportacionResponse.Fila(fila.numero(), accion, plan.descripcion(), errores, plan.avisos()));
        }
        return salida;
    }

    @FunctionalInterface
    private interface PlanFila {
        Plan planificar(Fila fila, Map<String, Integer> vistos);
    }

    // ---------------------------- Productos ----------------------------

    private Plan planProducto(Fila f, Map<String, Integer> vistos) {
        List<String> errores = new ArrayList<>();
        List<String> avisos = new ArrayList<>();
        String nombre = f.texto("nombre");
        String codigo = f.texto("codigo");

        // ¿Ya existe? Primero por código de barras, luego por nombre
        Producto existente = null;
        if (codigo != null) {
            existente = productoRepository.findByCodigoBarras(codigo).orElse(null);
            if (existente != null && !Boolean.TRUE.equals(existente.getActivo())) {
                errores.add("El código " + codigo + " pertenece a un producto eliminado (" + existente.getNombre() + ")");
                existente = null;
            } else if (existente == null && presentacionRepository.existsByCodigoBarras(codigo)) {
                errores.add("El código " + codigo + " ya lo usa la presentación (caja / pack) de otro producto");
            }
        }
        if (existente == null && nombre != null && errores.isEmpty()) {
            existente = productoRepository.findFirstByActivoTrueAndNombreIgnoreCase(nombre).orElse(null);
            if (existente != null && existente.getCodigoBarras() != null && codigo != null
                    && !existente.getCodigoBarras().equals(codigo)) {
                avisos.add("Ya existe '" + existente.getNombre() + "' con otro código ("
                        + existente.getCodigoBarras() + "); se le cambiará al " + codigo);
            }
        }
        repetido(vistos, codigo == null ? null : "codigo:" + codigo, f, "El código " + codigo, errores);

        // PLU de la balanza: no puede tenerlo otro producto
        String plu = EtiquetaBalanza.normalizarPlu(f.texto("plu"));
        if (plu != null && plu.matches("\\d{1,6}")) {
            final Producto actual = existente;
            productoRepository.findByPlu(plu)
                    .filter(otro -> actual == null || !otro.getId().equals(actual.getId()))
                    .ifPresent(otro -> errores.add("El PLU " + plu + " ya lo tiene " + otro.getNombre()));
            repetido(vistos, "plu:" + plu, f, "El PLU " + plu, errores);
        }
        repetido(vistos, nombre == null ? null : "nombre:" + nombre.toLowerCase(Locale.ROOT), f,
                "El producto '" + nombre + "'", errores);

        // Armar el request: lo del Excel, y lo vacío se completa con lo que ya tenía
        ProductRequest req = new ProductRequest();
        req.setNombre(nombre);
        req.setCodigoBarras(codigo != null ? codigo : existente != null ? existente.getCodigoBarras() : null);
        req.setPlu(primero(f.texto("plu"), existente == null ? null : existente.getPlu()));
        req.setPrecioCosto(dinero(f.numero("precioCosto"), existente == null ? null : existente.getPrecioCosto()));
        req.setPrecioVenta(dinero(f.numero("precioVenta"), existente == null ? null : existente.getPrecioVenta()));
        req.setStockMinimo(cantidad(f.numero("stockMinimo"), existente == null ? null : existente.getStockMinimo()));
        req.setIgv(primero(f.siNo("igv"), existente == null ? null : existente.getIgv()));
        req.setVencimiento(primero(f.fecha("vencimiento"), existente == null ? null : existente.getVencimiento()));
        if (existente != null) req.setImagenURL(existente.getImagenURL());

        UnidadMedida unidad = unidad(f);
        req.setUnidadMedida(primero(unidad, existente == null ? UnidadMedida.UND : existente.getUnidadMedida()));
        if (existente != null && unidad != null && unidad != existente.getUnidadMedida()
                && existente.getStockActual().signum() != 0) {
            errores.add("No se puede cambiar la unidad de " + existente.getUnidadMedida() + " a " + unidad
                    + " mientras el producto tenga stock");
        }

        BigDecimal stock = cantidad(f.numero("stock"), null);
        // (en uno nuevo lo revisa la validación de stockInicial)
        if (existente != null && stock != null && stock.signum() < 0) errores.add("El stock no puede ser negativo");
        if (stock != null && req.getUnidadMedida() == UnidadMedida.UND && stock.stripTrailingZeros().scale() > 0) {
            errores.add("El stock debe ser un número entero para productos por unidad (UND)");
        }

        // Categoría por nombre (se crea si no existe)
        String categoria = f.texto("categoria");
        Long categoriaId = existente != null && existente.getCategoria() != null ? existente.getCategoria().getId() : null;
        boolean crearCategoria = false;
        if (categoria != null) {
            Optional<Categoria> cat = categoryRepository.findFirstByNombreIgnoreCase(categoria);
            if (cat.isPresent()) categoriaId = cat.get().getId();
            else if (categoria.length() > 100) errores.add("El nombre de la categoría es muy largo (máx. 100)");
            else {
                crearCategoria = true;
                avisos.add("Se creará la categoría '" + categoria + "'");
            }
        }
        req.setCategoriaId(categoriaId);

        // Proveedor por RUC o por nombre (no se crea: le faltarían datos)
        String proveedor = f.texto("proveedor");
        req.setProveedorId(existente != null && existente.getProveedor() != null ? existente.getProveedor().getId() : null);
        if (proveedor != null) {
            Optional<Proveedor> prov = proveedor.matches("\\d{11}")
                    ? proveedorRepository.findByRuc(proveedor)
                    : proveedorRepository.findFirstByActivoTrueAndNombreIgnoreCase(proveedor);
            if (prov.isPresent()) req.setProveedorId(prov.get().getId());
            else avisos.add("El proveedor '" + proveedor + "' no está registrado; se deja como estaba");
        }

        // Stock: si es nuevo entra como stock inicial; si ya existe, la diferencia va como ajuste
        BigDecimal diferencia = null;
        if (existente == null) {
            req.setStockInicial(stock);
        } else if (stock != null) {
            diferencia = stock.subtract(existente.getStockActual());
            if (diferencia.signum() != 0) {
                avisos.add("Stock: " + existente.getStockActual().stripTrailingZeros().toPlainString() + " → "
                        + stock.stripTrailingZeros().toPlainString() + " (ajuste en el kardex)");
            }
        }

        validar(req, errores);
        final Producto prod = existente;
        final boolean nuevaCategoria = crearCategoria;
        final BigDecimal ajuste = diferencia;
        return new Plan(existente == null ? Accion.CREAR : Accion.ACTUALIZAR, nombre, errores, avisos, () -> {
            if (nuevaCategoria) req.setCategoriaId(categoriaPorNombre(categoria));
            if (prod == null) {
                productoService.crear(req);
                return;
            }
            productoService.actualizar(prod.getId(), req);
            if (ajuste != null && ajuste.signum() != 0) {
                AjusteStockRequest aj = new AjusteStockRequest();
                aj.setMotivo(ajuste.signum() > 0 ? MotivoMovimiento.AJUSTE_ENTRADA : MotivoMovimiento.AJUSTE_SALIDA);
                aj.setCantidad(ajuste.abs());
                aj.setNota(NOTA_KARDEX);
                productoService.ajustarStock(prod.getId(), aj);
            }
        });
    }

    private UnidadMedida unidad(Fila f) {
        String u = f.texto("unidad");
        if (u == null) return null;
        return switch (Excel.normalizar(u)) {
            case "und", "un", "u", "unidad", "unidades", "pza", "pieza" -> UnidadMedida.UND;
            case "kg", "kilo", "kilos", "kilogramo", "kilogramos" -> UnidadMedida.KG;
            case "lt", "l", "litro", "litros" -> UnidadMedida.LT;
            default -> f.invalido("unidad", u, "debe ser UND, KG o LT");
        };
    }

    /** La categoría puede haberla creado una fila anterior de este mismo archivo */
    private Long categoriaPorNombre(String nombre) {
        return categoryRepository.findFirstByNombreIgnoreCase(nombre)
                .orElseGet(() -> {
                    Categoria c = new Categoria();
                    c.setNombre(nombre.trim());
                    return categoryRepository.save(c);
                })
                .getId();
    }

    // ---------------------------- Clientes ----------------------------

    private Plan planCliente(Fila f, Map<String, Integer> vistos) {
        List<String> errores = new ArrayList<>();
        String nombre = f.texto("nombre");
        String dni = f.texto("dni");
        if (dni != null && dni.matches("\\d{6,7}")) dni = "0".repeat(8 - dni.length()) + dni;   // Excel le quita los ceros

        Cliente existente = dni != null ? clienteRepository.findByDni(dni).orElse(null) : null;
        if (existente == null && nombre != null) {
            existente = clienteRepository.findFirstByActivoTrueAndNombreIgnoreCase(nombre).orElse(null);
            if (existente != null && dni != null && existente.getDni() != null && !existente.getDni().equals(dni)) {
                existente = null;   // mismo nombre pero otra persona (otro DNI): es un cliente nuevo
            }
        }
        repetido(vistos, dni == null ? null : "dni:" + dni, f, "El DNI " + dni, errores);
        repetido(vistos, nombre == null ? null : "nombre:" + nombre.toLowerCase(Locale.ROOT) + ":" + dni, f,
                "El cliente '" + nombre + "'", errores);

        Cliente e = existente;
        ClienteRequest req = new ClienteRequest();
        req.setNombre(nombre);
        req.setDni(primero(dni, e == null ? null : e.getDni()));
        req.setTelefono(primero(f.texto("telefono"), e == null ? null : e.getTelefono()));
        req.setDireccion(primero(f.texto("direccion"), e == null ? null : e.getDireccion()));
        req.setLimiteCredito(dinero(f.numero("limiteCredito"), e == null ? null : e.getLimiteCredito()));
        req.setNota(primero(f.texto("nota"), e == null ? null : e.getNota()));
        validar(req, errores);

        return new Plan(e == null ? Accion.CREAR : Accion.ACTUALIZAR, nombre, errores, List.of(), () -> {
            if (e == null) clienteService.crear(req);
            else clienteService.actualizar(e.getId(), req);
        });
    }

    // ---------------------------- Proveedores ----------------------------

    private Plan planProveedor(Fila f, Map<String, Integer> vistos) {
        List<String> errores = new ArrayList<>();
        String nombre = f.texto("nombre");
        String ruc = f.texto("ruc");

        Proveedor existente = null;
        if (ruc != null) {
            existente = proveedorRepository.findByRuc(ruc).orElse(null);
            if (existente != null && !Boolean.TRUE.equals(existente.getActivo())) {
                errores.add("El RUC " + ruc + " pertenece a un proveedor eliminado (" + existente.getNombre() + ")");
                existente = null;
            }
        }
        if (existente == null && nombre != null && errores.isEmpty()) {
            existente = proveedorRepository.findFirstByActivoTrueAndNombreIgnoreCase(nombre)
                    .filter(p -> ruc == null || p.getRuc() == null || p.getRuc().equals(ruc))
                    .orElse(null);
        }
        repetido(vistos, ruc == null ? null : "ruc:" + ruc, f, "El RUC " + ruc, errores);
        repetido(vistos, nombre == null ? null : "nombre:" + nombre.toLowerCase(Locale.ROOT) + ":" + ruc, f,
                "El proveedor '" + nombre + "'", errores);

        Proveedor e = existente;
        ProveedorRequest req = new ProveedorRequest();
        req.setNombre(nombre);
        req.setRuc(primero(ruc, e == null ? null : e.getRuc()));
        req.setContacto(primero(f.texto("contacto"), e == null ? null : e.getContacto()));
        req.setTelefono(primero(f.texto("telefono"), e == null ? null : e.getTelefono()));
        req.setEmail(primero(f.texto("email"), e == null ? null : e.getEmail()));
        req.setDireccion(primero(f.texto("direccion"), e == null ? null : e.getDireccion()));
        validar(req, errores);

        return new Plan(e == null ? Accion.CREAR : Accion.ACTUALIZAR, nombre, errores, List.of(), () -> {
            if (e == null) proveedorService.crear(req);
            else proveedorService.actualizar(e.getId(), req);
        });
    }

    // ============================ AYUDANTES ============================

    /** Las mismas validaciones (@NotBlank, @Size, @Pattern...) que cuando se guarda desde la pantalla */
    private void validar(Object req, List<String> errores) {
        for (ConstraintViolation<Object> v : validator.validate(req)) {
            // Los mensajes propios ya dicen el campo ("El DNI debe tener 8 dígitos"); los genéricos no
            String msg = v.getMessage();
            errores.add(Character.isUpperCase(msg.charAt(0)) ? msg : v.getPropertyPath() + ": " + msg);
        }
    }

    private void repetido(Map<String, Integer> vistos, String clave, Fila f, String que, List<String> errores) {
        if (clave == null) return;
        Integer antes = vistos.putIfAbsent(clave, f.numero());
        if (antes != null) errores.add(que + " está repetido en el archivo (fila " + antes + ")");
    }

    private BigDecimal dinero(BigDecimal valor, BigDecimal siVacio) {
        return valor == null ? siVacio : valor.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal cantidad(BigDecimal valor, BigDecimal siVacio) {
        return valor == null ? siVacio : valor.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private static <T> T primero(T valor, T siVacio) {
        return valor != null ? valor : siVacio;
    }

    public static Tipo tipo(String texto) {
        return Arrays.stream(Tipo.values()).filter(t -> t.name().equalsIgnoreCase(texto)).findFirst()
                .orElseThrow(() -> new ReglaNegocioException(
                        "Tipo de importación desconocido: " + texto + " (usa productos, clientes o proveedores)"));
    }
}
