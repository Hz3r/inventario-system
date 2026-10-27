package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.*;
import com.hzer.inventario_system.util.EtiquetaBalanza;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)   // por defecto solo lectura; los que escriben lo indican
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final ProductoPresentacionRepository presentacionRepository;
    private final CategoryRepository categoryRepository;
    private final ProveedorRepository proveedorRepository;
    private final KardexService kardexService;
    private final ConfiguracionService configuracionService;

    // ============================ CONSULTAS ============================

    public List<ProductoResponse> listar(String buscar) {
        String texto = limpiar(buscar);
        List<Producto> productos = (texto == null)
                ? productoRepository.findByActivoTrueOrderByNombreAsc()
                : productoRepository.findByActivoTrueAndNombreContainingIgnoreCaseOrderByNombreAsc(texto);
        return aResponses(productos);
    }

    public List<ProductoResponse> stockBajo() {
        return aResponses(productoRepository.findStockBajo());
    }

    public ProductoResponse obtener(Long id) {
        return aResponse(buscarProducto(id));
    }

    /** Lo que pasa cuando la pistola lee un código: puede ser una botella, una caja o una etiqueta de balanza */
    public EscaneoResponse escanear(String codigo) {
        String c = limpiar(codigo);
        if (c == null) throw new ReglaNegocioException("El código está vacío");

        Optional<Producto> unidad = productoRepository.findByCodigoBarrasAndActivoTrue(c);
        if (unidad.isPresent()) {
            Producto p = unidad.get();
            return new EscaneoResponse(p.getId(), p.getNombre(), null, p.getUnidadMedida().name(),
                    BigDecimal.ONE, p.getPrecioVenta(), p.getUnidadMedida(), p.getStockActual(), null, null);
        }

        Optional<ProductoPresentacion> caja = presentacionRepository.findByCodigoBarrasAndActivoTrue(c)
                .filter(x -> Boolean.TRUE.equals(x.getProducto().getActivo()));
        if (caja.isPresent()) {
            ProductoPresentacion pr = caja.get();
            Producto p = pr.getProducto();
            return new EscaneoResponse(p.getId(), p.getNombre(), pr.getId(), pr.getNombre(),
                    pr.getFactor(), pr.getPrecioVenta(), p.getUnidadMedida(), p.getStockActual(), null, null);
        }

        return escanearEtiquetaBalanza(c)
                .orElseThrow(() -> new RecursoNoEncontradoException("No hay ningún producto con el código " + c));
    }

    /** Etiqueta impresa por la balanza: el PLU dice el producto y el resto, el peso o el importe */
    private Optional<EscaneoResponse> escanearEtiquetaBalanza(String codigo) {
        EtiquetaBalanza.Lectura lectura;
        try {
            lectura = EtiquetaBalanza.leer(codigo, configuracionService.configEtiquetas()).orElse(null);
        } catch (IllegalArgumentException e) {
            throw new ReglaNegocioException(e.getMessage() + ". Vuelve a escanear la etiqueta.");
        }
        if (lectura == null) return Optional.empty();

        Producto p = productoRepository.findByPluAndActivoTrue(lectura.plu())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etiqueta de balanza con PLU " + lectura.plu() + ": ningún producto tiene ese PLU"));
        if (lectura.valor().signum() <= 0) {
            throw new ReglaNegocioException("La etiqueta de " + p.getNombre() + " marca 0. Vuelve a pesar el producto.");
        }

        BigDecimal cantidad;
        BigDecimal importe = null;
        if (lectura.tipo() == TipoValorEtiqueta.PESO) {
            cantidad = lectura.valor();
        } else {
            if (p.getPrecioVenta() == null || p.getPrecioVenta().signum() <= 0) {
                throw new ReglaNegocioException(p.getNombre() + " no tiene precio de venta: no se puede calcular el peso");
            }
            importe = lectura.valor();
            cantidad = importe.divide(p.getPrecioVenta(), 3, RoundingMode.HALF_UP);
        }
        if (p.getUnidadMedida() == UnidadMedida.UND) {
            if (cantidad.stripTrailingZeros().scale() > 0) {
                throw new ReglaNegocioException(p.getNombre() + " se vende por unidad, pero la etiqueta trae "
                        + cantidad.stripTrailingZeros().toPlainString() + ". Revisa su unidad de medida o su PLU.");
            }
        }
        return Optional.of(new EscaneoResponse(p.getId(), p.getNombre(), null, p.getUnidadMedida().name(),
                BigDecimal.ONE, p.getPrecioVenta(), p.getUnidadMedida(), p.getStockActual(), cantidad, importe));
    }

    // ============================ PRODUCTOS ============================

    @Transactional
    public ProductoResponse crear(ProductRequest req) {
        String codigo = limpiar(req.getCodigoBarras());
        validarCodigoLibre(codigo, null, null);
        validarPluLibre(EtiquetaBalanza.normalizarPlu(req.getPlu()), null);

        Producto p = new Producto();
        copiarDatos(req, p, codigo);
        p.setStockActual(BigDecimal.ZERO);            // arranca en 0...
        p = productoRepository.save(p);

        BigDecimal inicial = req.getStockInicial();
        if (inicial != null && inicial.signum() > 0) { // ...y el stock inicial entra por el kardex
            kardexService.registrar(p.getId(), MotivoMovimiento.INICIAL, inicial,
                    p.getPrecioCosto(), null, null, "Stock inicial al registrar el producto");
        }
        return aResponse(p);
    }

    @Transactional
    public ProductoResponse actualizar(Long id, ProductRequest req) {
        Producto p = buscarProducto(id);
        String codigo = limpiar(req.getCodigoBarras());
        validarCodigoLibre(codigo, p.getId(), null);
        validarPluLibre(EtiquetaBalanza.normalizarPlu(req.getPlu()), p.getId());

        if (req.getUnidadMedida() != null && req.getUnidadMedida() != p.getUnidadMedida()
                && p.getStockActual().signum() != 0) {
            throw new ReglaNegocioException(
                    "No se puede cambiar la unidad de medida mientras el producto tenga stock");
        }
        copiarDatos(req, p, codigo);   // stockInicial se ignora a propósito: el stock va por el kardex
        return aResponse(p);           // no hace falta save(): Hibernate guarda los cambios al terminar
    }

    /** No se borra: se desactiva, para no romper ventas y kardex antiguos */
    @Transactional
    public void desactivar(Long id) {
        buscarProducto(id).setActivo(false);
    }

    @Transactional
    public MovimientoResponse ajustarStock(Long productoId, AjusteStockRequest req) {
        Producto p = buscarProducto(productoId);
        if (!Boolean.TRUE.equals(p.getActivo())) {
            throw new ReglaNegocioException("El producto está desactivado");
        }
        BigDecimal cantidad = switch (req.getMotivo()) {
            case AJUSTE_ENTRADA -> req.getCantidad();
            case AJUSTE_SALIDA, MERMA -> req.getCantidad().negate();
            default -> throw new ReglaNegocioException(
                    "Motivo no permitido para un ajuste manual: " + req.getMotivo());
        };
        MovimientoInventario mov = kardexService.registrar(productoId, req.getMotivo(), cantidad,
                p.getPrecioCosto(), null, null, limpiar(req.getNota()));
        return MovimientoResponse.desde(mov);
    }

    // ========================== PRESENTACIONES ==========================

    @Transactional
    public PresentacionResponse agregarPresentacion(Long productoId, PresentacionRequest req) {
        Producto producto = buscarProducto(productoId);
        String nombre = req.getNombre().trim();
        String codigo = limpiar(req.getCodigoBarras());
        validarFactor(producto, req.getFactor());

        // Si ya existió con ese nombre y estaba desactivada, se reactiva
        ProductoPresentacion pr = presentacionRepository.findByProductoIdAndNombre(productoId, nombre)
                .orElseGet(ProductoPresentacion::new);
        if (pr.getId() != null && Boolean.TRUE.equals(pr.getActivo())) {
            throw new ReglaNegocioException("El producto ya tiene una presentación llamada '" + nombre + "'");
        }
        validarCodigoLibre(codigo, null, pr.getId());

        pr.setProducto(producto);
        pr.setNombre(nombre);
        pr.setFactor(req.getFactor());
        pr.setPrecioVenta(req.getPrecioVenta());
        pr.setCodigoBarras(codigo);
        pr.setActivo(true);
        return PresentacionResponse.desde(presentacionRepository.save(pr));
    }

    @Transactional
    public PresentacionResponse actualizarPresentacion(Long presentacionId, PresentacionRequest req) {
        ProductoPresentacion pr = buscarPresentacion(presentacionId);
        String codigo = limpiar(req.getCodigoBarras());
        validarFactor(pr.getProducto(), req.getFactor());
        validarCodigoLibre(codigo, null, pr.getId());

        pr.setNombre(req.getNombre().trim());
        pr.setFactor(req.getFactor());
        pr.setPrecioVenta(req.getPrecioVenta());
        pr.setCodigoBarras(codigo);
        return PresentacionResponse.desde(pr);
    }

    @Transactional
    public void desactivarPresentacion(Long presentacionId) {
        buscarPresentacion(presentacionId).setActivo(false);
    }

    // ============================ AYUDANTES ============================

    private Producto buscarProducto(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
    }

    private ProductoPresentacion buscarPresentacion(Long id) {
        return presentacionRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Presentación", id));
    }

    private void copiarDatos(ProductRequest req, Producto p, String codigo) {
        p.setNombre(req.getNombre().trim());
        p.setCodigoBarras(codigo);
        p.setPlu(EtiquetaBalanza.normalizarPlu(req.getPlu()));
        p.setPrecioCosto(req.getPrecioCosto());
        p.setPrecioVenta(req.getPrecioVenta());
        if (req.getUnidadMedida() != null) p.setUnidadMedida(req.getUnidadMedida());
        if (req.getIgv() != null) p.setIgv(req.getIgv());
        if (req.getStockMinimo() != null) p.setStockMinimo(req.getStockMinimo());
        p.setVencimiento(req.getVencimiento());
        p.setImagenURL(limpiar(req.getImagenURL()));

        p.setCategoria(req.getCategoriaId() == null ? null
                : categoryRepository.findById(req.getCategoriaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría", req.getCategoriaId())));

        p.setProveedor(req.getProveedorId() == null ? null
                : proveedorRepository.findById(req.getProveedorId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor", req.getProveedorId())));
    }

    /** Un código de barras no puede repetirse ni entre productos ni entre presentaciones */
    private void validarCodigoLibre(String codigo, Long productoIdActual, Long presentacionIdActual) {
        if (codigo == null) return;
        boolean usadoPorProducto = (productoIdActual == null)
                ? productoRepository.existsByCodigoBarras(codigo)
                : productoRepository.existsByCodigoBarrasAndIdNot(codigo, productoIdActual);
        boolean usadoPorPresentacion = (presentacionIdActual == null)
                ? presentacionRepository.existsByCodigoBarras(codigo)
                : presentacionRepository.existsByCodigoBarrasAndIdNot(codigo, presentacionIdActual);
        if (usadoPorProducto || usadoPorPresentacion) {
            throw new ReglaNegocioException("El código de barras " + codigo + " ya está en uso");
        }
    }

    /** Dos productos no pueden tener el mismo PLU: la balanza no sabría cuál es */
    private void validarPluLibre(String plu, Long productoIdActual) {
        if (plu == null) return;
        productoRepository.findByPlu(plu)
                .filter(otro -> !otro.getId().equals(productoIdActual))
                .ifPresent(otro -> {
                    throw new ReglaNegocioException("El PLU " + plu + " ya lo tiene " + otro.getNombre()
                            + (Boolean.TRUE.equals(otro.getActivo()) ? "" : " (producto eliminado)"));
                });
    }

    /** Una caja de un producto por unidades no puede traer 6.5 botellas */
    private void validarFactor(Producto producto, BigDecimal factor) {
        if (producto.getUnidadMedida() == UnidadMedida.UND
                && factor.stripTrailingZeros().scale() > 0) {
            throw new ReglaNegocioException("El factor debe ser un número entero para productos por unidad");
        }
    }

    /** Convierte "" y "   " en null, para no chocar con el UNIQUE de la base de datos */
    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private ProductoResponse aResponse(Producto p) {
        return ProductoResponse.desde(p,
                presentacionRepository.findByProductoIdAndActivoTrueOrderByFactorAsc(p.getId()));
    }

    /** 2 consultas en total, sin importar cuántos productos haya (evita el N+1) */
    private List<ProductoResponse> aResponses(List<Producto> productos) {
        if (productos.isEmpty()) return List.of();
        List<Long> ids = productos.stream().map(Producto::getId).toList();
        Map<Long, List<ProductoPresentacion>> porProducto = presentacionRepository
                .findByProductoIdInAndActivoTrueOrderByFactorAsc(ids).stream()
                .collect(Collectors.groupingBy(pr -> pr.getProducto().getId()));
        return productos.stream()
                .map(p -> ProductoResponse.desde(p, porProducto.getOrDefault(p.getId(), List.of())))
                .toList();
    }
}