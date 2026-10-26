package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Pedidos a proveedores:
 *   crear (PEDIDO) → recibir (RECIBIDO: sube el stock por el kardex) o cancelar (CANCELADO)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompraService {

    private final CompraRepository compraRepository;
    private final ProductoRepository productoRepository;
    private final ProductoPresentacionRepository presentacionRepository;
    private final CajaRepository cajaRepository;
    private final ProveedorService proveedorService;
    private final KardexService kardexService;
    private final UsuarioActualService usuarioActual;
    private final CajaService cajaService;

    public List<CompraResponse> listar() {
        return compraRepository.findTop100ByOrderByFechaPedidoDescIdDesc().stream().map(CompraResponse::desde).toList();
    }

    public CompraResponse obtener(Long id) {
        return CompraResponse.desde(buscar(id));
    }

    // ============================ PEDIR ============================

    @Transactional
    public CompraResponse crear(CompraRequest req) {
        Proveedor proveedor = proveedorService.buscar(req.getProveedorId());
        if (!Boolean.TRUE.equals(proveedor.getActivo())) {
            throw new ReglaNegocioException("El proveedor " + proveedor.getNombre() + " está desactivado");
        }
        Compra c = new Compra();
        c.setProveedor(proveedor);
        c.setUsuario(usuarioActual.obtener());
        c.setNota(limpiar(req.getNota()));
        for (CompraItemRequest item : req.getItems()) c.agregarDetalle(armarLinea(item));
        c.setTotal(sumar(c));
        return CompraResponse.desde(compraRepository.save(c));
    }

    // ============================ RECIBIR ============================

    @Transactional
    public CompraResponse recibir(Long id, RecibirCompraRequest req) {
        Compra c = buscar(id);
        if (c.getEstado() != EstadoCompra.PEDIDO) {
            throw new ReglaNegocioException("La compra #" + id + " ya está " + c.getEstado().name().toLowerCase());
        }

        // Si llegó distinto a lo pedido (faltó algo, cambió el precio), se reemplaza el detalle
        if (req.getItems() != null && !req.getItems().isEmpty()) {
            c.getDetalles().clear();
            for (CompraItemRequest item : req.getItems()) c.agregarDetalle(armarLinea(item));
            c.setTotal(sumar(c));
        }

        c.setMetodoPago(req.getMetodoPago());
        c.setFechaRecepcion(LocalDateTime.now(ZoneId.of("America/Lima")));
        c.setEstado(EstadoCompra.RECIBIDO);
        if (limpiar(req.getNota()) != null) c.setNota(limpiar(req.getNota()));

        // Pagado con plata del cajón: el cierre de caja lo descuenta
        if (req.getMetodoPago() == MetodoPagoCompra.EFECTIVO && req.isDeCaja()) {
            Caja caja = cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA)
                    .orElseThrow(() -> new ReglaNegocioException(
                            "No hay caja abierta. Ábrela, o desmarca \"Salió del cajón\" si pagaste con otra plata."));
            cajaService.validarSalidaDeEfectivo(caja, c.getTotal(), "la compra");
            c.setCaja(caja);
        }
        compraRepository.saveAndFlush(c);   // asegura los ids del detalle antes de ir al kardex

        // Sube el stock (kardex) y, si se pidió, actualiza el costo del producto
        for (CompraDetalle d : c.getDetalles()) {
            BigDecimal costoBase = d.getCostoUnitario().divide(d.getFactor(), 2, RoundingMode.HALF_UP);
            kardexService.registrar(d.getProducto().getId(), MotivoMovimiento.COMPRA, d.getCantidadBase(),
                    costoBase, null, c.getId(), "Compra #" + c.getId() + " - " + c.getProveedor().getNombre());
            if (req.isActualizarCostos() && costoBase.signum() > 0) {
                d.getProducto().setPrecioCosto(costoBase);
            }
        }
        return CompraResponse.desde(c);
    }

    @Transactional
    public CompraResponse cancelar(Long id) {
        Compra c = buscar(id);
        if (c.getEstado() != EstadoCompra.PEDIDO) {
            throw new ReglaNegocioException("Solo se puede cancelar un pedido que todavía no llegó");
        }
        c.setEstado(EstadoCompra.CANCELADO);
        return CompraResponse.desde(c);
    }

    // ============================ AYUDANTES ============================

    private CompraDetalle armarLinea(CompraItemRequest item) {
        Producto producto = productoRepository.findById(item.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", item.getProductoId()));

        ProductoPresentacion pres = null;
        if (item.getPresentacionId() != null) {
            pres = presentacionRepository.findById(item.getPresentacionId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Presentación", item.getPresentacionId()));
            if (!pres.getProducto().getId().equals(producto.getId())) {
                throw new ReglaNegocioException("La presentación no corresponde a " + producto.getNombre());
            }
        }
        BigDecimal factor = pres != null ? pres.getFactor() : BigDecimal.ONE;
        BigDecimal cantidadBase = item.getCantidad().multiply(factor).setScale(3, RoundingMode.HALF_UP);

        if ((pres != null || producto.getUnidadMedida() == UnidadMedida.UND)
                && item.getCantidad().stripTrailingZeros().scale() > 0) {
            throw new ReglaNegocioException("La cantidad de " + producto.getNombre() + " debe ser un número entero");
        }

        CompraDetalle d = new CompraDetalle();
        d.setProducto(producto);
        d.setPresentacion(pres);
        d.setCantidad(item.getCantidad());
        d.setFactor(factor);
        d.setCantidadBase(cantidadBase);
        d.setCostoUnitario(item.getCostoUnitario().setScale(2, RoundingMode.HALF_UP));
        d.setSubtotal(item.getCostoUnitario().multiply(item.getCantidad()).setScale(2, RoundingMode.HALF_UP));
        return d;
    }

    private BigDecimal sumar(Compra c) {
        return c.getDetalles().stream().map(CompraDetalle::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Compra buscar(Long id) {
        return compraRepository.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Compra", id));
    }

    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
