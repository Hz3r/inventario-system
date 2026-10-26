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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VentaService {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;
    private final ProductoPresentacionRepository presentacionRepository;
    private final FiadoRepository fiadoRepository;
    private final CajaService cajaService;
    private final ClienteService clienteService;
    private final KardexService kardexService;
    private final UsuarioActualService usuarioActual;

    // =========================== COBRAR ===========================

    @Transactional
    public VentaResponse registrar(VentaRequest req) {
        Caja caja = cajaService.cajaAbiertaObligatoria();

        Venta venta = new Venta();
        venta.setCaja(caja);
        venta.setUsuario(usuarioActual.obtener());
        venta.setNumero(ventaRepository.siguienteNumero());
        venta.setNota(limpiar(req.getNota()));

        // ---- 1. Líneas: el precio y el costo salen de la base de datos ----
        for (VentaItemRequest item : req.getItems()) {
            venta.agregarDetalle(armarLinea(item));
        }

        // ---- 2. Totales ----
        BigDecimal subtotal = venta.getDetalles().stream()
                .map(VentaDetalle::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal descuento = dinero(req.getDescuento());
        if (descuento.compareTo(subtotal) > 0) {
            throw new ReglaNegocioException("El descuento no puede ser mayor que el subtotal");
        }
        BigDecimal total = subtotal.subtract(descuento);
        if (total.signum() <= 0) {
            throw new ReglaNegocioException("El total de la venta debe ser mayor a 0");
        }
        venta.setSubtotal(subtotal);
        venta.setDescuento(descuento);
        venta.setTotal(total);

        // ---- 3. Pagos: deben sumar exactamente el total ----
        BigDecimal sumaPagos = BigDecimal.ZERO;
        BigDecimal efectivo = BigDecimal.ZERO;
        BigDecimal fiado = BigDecimal.ZERO;
        for (VentaPagoRequest p : req.getPagos()) {
            VentaPago pago = new VentaPago();
            pago.setMetodo(p.getMetodo());
            pago.setMonto(dinero(p.getMonto()));
            pago.setReferencia(limpiar(p.getReferencia()));
            venta.agregarPago(pago);

            sumaPagos = sumaPagos.add(pago.getMonto());
            if (p.getMetodo() == MetodoPago.EFECTIVO) efectivo = efectivo.add(pago.getMonto());
            if (p.getMetodo() == MetodoPago.FIADO) fiado = fiado.add(pago.getMonto());
        }
        if (sumaPagos.compareTo(total) != 0) {
            throw new ReglaNegocioException("Los pagos suman S/ " + sumaPagos + " pero el total es S/ " + total);
        }

        // ---- 4. Cliente y fiado ----
        Cliente cliente = (req.getClienteId() != null) ? clienteService.buscar(req.getClienteId()) : null;
        if (fiado.signum() > 0) {
            if (cliente == null) {
                throw new ReglaNegocioException("Para fiar hay que elegir un cliente");
            }
            validarLimiteCredito(cliente, fiado);
        }
        venta.setCliente(cliente);

        // ---- 5. Vuelto ----
        if (req.getEfectivoRecibido() != null && efectivo.signum() > 0) {
            BigDecimal recibido = dinero(req.getEfectivoRecibido());
            if (recibido.compareTo(efectivo) < 0) {
                throw new ReglaNegocioException("El cliente entregó S/ " + recibido
                        + " pero debe pagar S/ " + efectivo + " en efectivo");
            }
            venta.setEfectivoRecibido(recibido);
            venta.setVuelto(recibido.subtract(efectivo));
        }

        // ---- 6. Guardar (cascade guarda líneas y pagos) ----
        venta = ventaRepository.save(venta);

        // ---- 7. Descontar stock: una fila de kardex por línea ----
        for (VentaDetalle d : venta.getDetalles()) {
            kardexService.registrar(d.getProducto().getId(), MotivoMovimiento.VENTA,
                    d.getCantidadBase().negate(), d.getCostoUnitario(),
                    venta.getId(), null, "Venta #" + venta.getNumero());
        }

        // ---- 8. Crear la deuda si se fió una parte ----
        if (fiado.signum() > 0) {
            Fiado f = new Fiado();
            f.setCliente(cliente);
            f.setVenta(venta);
            f.setMontoTotal(fiado);
            f.setSaldo(fiado);
            f.setNota("Venta #" + venta.getNumero());
            fiadoRepository.save(f);
        }

        return VentaResponse.desde(venta);
    }

    private VentaDetalle armarLinea(VentaItemRequest item) {
        Producto producto = productoRepository.findById(item.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", item.getProductoId()));
        if (!Boolean.TRUE.equals(producto.getActivo())) {
            throw new ReglaNegocioException(producto.getNombre() + " está desactivado");
        }

        ProductoPresentacion pres = null;
        if (item.getPresentacionId() != null) {
            pres = presentacionRepository.findById(item.getPresentacionId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Presentación", item.getPresentacionId()));
            if (!pres.getProducto().getId().equals(producto.getId()) || !Boolean.TRUE.equals(pres.getActivo())) {
                throw new ReglaNegocioException("La presentación no corresponde a " + producto.getNombre());
            }
            if (item.getCantidad().stripTrailingZeros().scale() > 0) {
                throw new ReglaNegocioException("No se puede vender media " + pres.getNombre());
            }
        }

        BigDecimal precio = (pres != null) ? pres.getPrecioVenta() : producto.getPrecioVenta();
        if (precio == null) {
            throw new ReglaNegocioException(producto.getNombre() + " no tiene precio de venta");
        }
        BigDecimal factor = (pres != null) ? pres.getFactor() : BigDecimal.ONE;

        BigDecimal bruto = dinero(precio.multiply(item.getCantidad()));
        BigDecimal descLinea = dinero(item.getDescuento());
        if (descLinea.compareTo(bruto) > 0) {
            throw new ReglaNegocioException("El descuento de " + producto.getNombre() + " es mayor que su precio");
        }

        VentaDetalle d = new VentaDetalle();
        d.setProducto(producto);
        d.setPresentacion(pres);
        d.setDescripcion(producto.getNombre() + (pres != null ? " - " + pres.getNombre() : ""));
        d.setCantidad(item.getCantidad());
        d.setFactor(factor);
        d.setCantidadBase(item.getCantidad().multiply(factor).setScale(3, RoundingMode.HALF_UP));
        d.setPrecioUnitario(precio);
        d.setCostoUnitario(producto.getPrecioCosto() != null ? producto.getPrecioCosto() : BigDecimal.ZERO);
        d.setDescuento(descLinea);
        d.setSubtotal(bruto.subtract(descLinea));
        return d;
    }

    private void validarLimiteCredito(Cliente cliente, BigDecimal nuevoFiado) {
        if (!Boolean.TRUE.equals(cliente.getActivo())) {
            throw new ReglaNegocioException("El cliente " + cliente.getNombre() + " está desactivado");
        }
        if (cliente.getLimiteCredito() == null) return;   // sin límite
        BigDecimal deuda = clienteService.deudaActual(cliente.getId());
        if (deuda.add(nuevoFiado).compareTo(cliente.getLimiteCredito()) > 0) {
            throw new ReglaNegocioException(cliente.getNombre() + " ya debe S/ " + deuda
                    + " y su límite es S/ " + cliente.getLimiteCredito());
        }
    }

    // =========================== ANULAR ===========================

    @Transactional
    public VentaResponse anular(Long ventaId, AnularVentaRequest req) {
        Venta venta = buscar(ventaId);
        if (venta.getEstado() == EstadoVenta.ANULADA) {
            throw new ReglaNegocioException("La venta #" + venta.getNumero() + " ya estaba anulada");
        }
        if (venta.getCaja().getEstado() == EstadoCaja.CERRADA) {
            throw new ReglaNegocioException("No se puede anular una venta de una caja ya cerrada");
        }

        // Si se fió una parte y el cliente ya abonó algo, no se puede anular así nomás
        fiadoRepository.findByVentaId(venta.getId()).ifPresent(f -> {
            if (f.getSaldo().compareTo(f.getMontoTotal()) < 0) {
                throw new ReglaNegocioException("El fiado de esta venta ya tiene abonos; no se puede anular");
            }
            f.setEstado(EstadoFiado.ANULADO);
            f.setSaldo(BigDecimal.ZERO);
        });

        // Devolver el stock
        for (VentaDetalle d : venta.getDetalles()) {
            kardexService.registrar(d.getProducto().getId(), MotivoMovimiento.ANULACION_VENTA,
                    d.getCantidadBase(), d.getCostoUnitario(),
                    venta.getId(), null, "Anulación venta #" + venta.getNumero());
        }

        venta.setEstado(EstadoVenta.ANULADA);
        venta.setAnuladaEn(LocalDateTime.now(LIMA));
        venta.setMotivoAnulacion(req.getMotivo().trim());
        return VentaResponse.desde(venta);
    }

    // =========================== CONSULTAS ===========================

    public VentaResponse obtener(Long id) {
        return VentaResponse.desde(buscar(id));
    }

    public VentaResponse porNumero(Long numero) {
        return VentaResponse.desde(ventaRepository.findByNumero(numero)
                .orElseThrow(() -> new RecursoNoEncontradoException("Venta", "#" + numero)));
    }

    public List<VentaResponse> entreFechas(LocalDate desde, LocalDate hasta) {
        return ventaRepository.findByFechaBetweenOrderByFechaDesc(
                        desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay().minusNanos(1))
                .stream().map(VentaResponse::desde).toList();
    }

    public List<VentaResponse> deCaja(Long cajaId) {
        return ventaRepository.findByCajaIdOrderByFechaDesc(cajaId).stream().map(VentaResponse::desde).toList();
    }

    // =========================== AYUDANTES ===========================

    private Venta buscar(Long id) {
        return ventaRepository.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Venta", id));
    }

    /** Redondea a 2 decimales (céntimos). null → 0.00 */
    private BigDecimal dinero(BigDecimal n) {
        return (n == null ? BigDecimal.ZERO : n).setScale(2, RoundingMode.HALF_UP);
    }

    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}