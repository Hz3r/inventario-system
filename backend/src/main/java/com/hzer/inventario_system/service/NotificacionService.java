package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.DeudaClienteResponse;
import com.hzer.inventario_system.dto.NotificacionResponse;
import com.hzer.inventario_system.dto.NotificacionesResponse;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.repository.CajaRepository;
import com.hzer.inventario_system.repository.CompraRepository;
import com.hzer.inventario_system.repository.NotificacionLeidaRepository;
import com.hzer.inventario_system.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Calcula las alertas de la bodega al momento, a partir de los datos reales
 * (no hay que "generarlas": si el problema se resuelve, la alerta desaparece sola).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificacionService {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Días antes del vencimiento en que se empieza a avisar */
    static final int DIAS_AVISO_VENCIMIENTO = 7;
    /** Un fiado con más días que esto se considera atrasado */
    static final int DIAS_FIADO_ATRASADO = 30;
    /** Un pedido que no llega en estos días se avisa */
    static final int DIAS_PEDIDO_DEMORADO = 3;
    /** Las marcas de "leída" más antiguas que esto se borran */
    private static final int DIAS_GUARDAR_LEIDAS = 90;

    private final ProductoRepository productoRepository;
    private final CompraRepository compraRepository;
    private final CajaRepository cajaRepository;
    private final FiadoService fiadoService;
    private final NotificacionLeidaRepository leidaRepository;
    private final UsuarioActualService usuarioActualService;

    public NotificacionesResponse listar() {
        List<NotificacionResponse> sinMarcar = calcular();
        Set<String> leidas = sinMarcar.isEmpty() ? Set.of()
                : new HashSet<>(leidaRepository.clavesLeidasEntre(usuarioActualService.obtener().getId(),
                sinMarcar.stream().map(NotificacionResponse::clave).toList()));

        List<NotificacionResponse> todas = sinMarcar.stream()
                .map(n -> leidas.contains(n.clave()) ? marcada(n) : n)
                // Primero las no leídas, luego por urgencia
                .sorted(Comparator.comparing(NotificacionResponse::leida)
                        .thenComparing(NotificacionResponse::nivel))
                .toList();

        long noLeidas = todas.stream().filter(n -> !n.leida()).count();
        long criticas = todas.stream().filter(n -> !n.leida() && n.nivel() == NivelNotificacion.CRITICA).count();
        return new NotificacionesResponse(noLeidas, criticas, todas);
    }

    @Transactional
    public void marcarLeidas(Collection<String> claves) {
        Usuario usuario = usuarioActualService.obtener();
        Set<String> nuevas = new LinkedHashSet<>(claves);
        nuevas.removeIf(c -> c == null || c.isBlank());
        if (nuevas.isEmpty()) return;
        leidaRepository.clavesLeidasEntre(usuario.getId(), nuevas).forEach(nuevas::remove);
        leidaRepository.saveAll(nuevas.stream().map(c -> new NotificacionLeida(usuario, c)).toList());
        leidaRepository.borrarAnterioresA(LocalDateTime.now(LIMA).minusDays(DIAS_GUARDAR_LEIDAS));
    }

    @Transactional
    public void marcarTodasLeidas() {
        marcarLeidas(calcular().stream().map(NotificacionResponse::clave).toList());
    }

    // ============================ CÁLCULO ============================

    private List<NotificacionResponse> calcular() {
        LocalDateTime ahora = LocalDateTime.now(LIMA);
        LocalDate hoy = ahora.toLocalDate();
        List<NotificacionResponse> lista = new ArrayList<>();

        cajaSinCerrar(hoy, lista);
        stock(ahora, lista);
        vencimientos(ahora, hoy, lista);
        fiadosAtrasados(ahora, lista);
        pedidosDemorados(ahora, lista);
        return lista;
    }

    private void cajaSinCerrar(LocalDate hoy, List<NotificacionResponse> lista) {
        cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA)
                .filter(c -> c.getAbiertaEn().toLocalDate().isBefore(hoy))
                .ifPresent(c -> lista.add(nueva("CAJA:" + c.getId(), TipoNotificacion.CAJA_SIN_CERRAR,
                        NivelNotificacion.ADVERTENCIA, "Caja sin cerrar",
                        "La caja sigue abierta desde el " + c.getAbiertaEn().format(FECHA)
                                + ". Haz el cierre para cuadrar el efectivo.",
                        "/pos", c.getAbiertaEn())));
    }

    private void stock(LocalDateTime ahora, List<NotificacionResponse> lista) {
        for (Producto p : productoRepository.findConAlertaDeStock()) {
            String stock = cantidad(p.getStockActual()) + " " + p.getUnidadMedida().name().toLowerCase();
            String clave = p.getId() + ":" + cantidad(p.getStockActual());
            if (p.getStockActual().signum() <= 0) {
                lista.add(nueva("AGOTADO:" + clave, TipoNotificacion.STOCK_AGOTADO, NivelNotificacion.CRITICA,
                        "Agotado: " + p.getNombre(),
                        "No queda stock (" + stock + "). Haz un pedido al proveedor.",
                        "/inventario", ahora));
            } else {
                lista.add(nueva("STOCK_BAJO:" + clave, TipoNotificacion.STOCK_BAJO, NivelNotificacion.ADVERTENCIA,
                        "Stock bajo: " + p.getNombre(),
                        "Quedan " + stock + " (mínimo " + cantidad(p.getStockMinimo()) + ").",
                        "/inventario", ahora));
            }
        }
    }

    private void vencimientos(LocalDateTime ahora, LocalDate hoy, List<NotificacionResponse> lista) {
        LocalDate limite = hoy.plusDays(DIAS_AVISO_VENCIMIENTO);
        for (Producto p : productoRepository.findByActivoTrueAndVencimientoLessThanEqualOrderByVencimientoAsc(limite)) {
            // Si ya no hay stock, no hay nada que se pueda malograr
            if (p.getStockActual().signum() <= 0) continue;
            long dias = ChronoUnit.DAYS.between(hoy, p.getVencimiento());
            String clave = p.getId() + ":" + p.getVencimiento();
            if (dias < 0) {
                lista.add(nueva("VENCIDO:" + clave, TipoNotificacion.PRODUCTO_VENCIDO, NivelNotificacion.CRITICA,
                        "Vencido: " + p.getNombre(),
                        "Venció el " + p.getVencimiento().format(FECHA) + " y aún hay "
                                + cantidad(p.getStockActual()) + " en stock. Regístralo como merma.",
                        "/inventario", ahora));
            } else {
                String cuando = dias == 0 ? "hoy" : dias == 1 ? "mañana" : "en " + dias + " días";
                lista.add(nueva("POR_VENCER:" + clave, TipoNotificacion.POR_VENCER, NivelNotificacion.ADVERTENCIA,
                        "Por vencer: " + p.getNombre(),
                        "Vence " + cuando + " (" + p.getVencimiento().format(FECHA) + "). Quedan "
                                + cantidad(p.getStockActual()) + ".",
                        "/inventario", ahora));
            }
        }
    }

    private void fiadosAtrasados(LocalDateTime ahora, List<NotificacionResponse> lista) {
        LocalDateTime limite = ahora.minusDays(DIAS_FIADO_ATRASADO);
        for (DeudaClienteResponse d : fiadoService.resumen()) {
            if (d.deudaDesde() == null || d.deudaDesde().isAfter(limite)) continue;
            long dias = ChronoUnit.DAYS.between(d.deudaDesde().toLocalDate(), ahora.toLocalDate());
            boolean sobreLimite = d.limiteCredito() != null && d.deuda().compareTo(d.limiteCredito()) > 0;
            lista.add(nueva("FIADO:" + d.clienteId() + ":" + d.deudaDesde().toLocalDate() + ":" + d.deuda().toPlainString(),
                    TipoNotificacion.FIADO_ATRASADO,
                    sobreLimite ? NivelNotificacion.CRITICA : NivelNotificacion.ADVERTENCIA,
                    "Fiado atrasado: " + d.nombre(),
                    "Debe S/ " + d.deuda().setScale(2, RoundingMode.HALF_UP).toPlainString()
                            + " desde hace " + dias + " días"
                            + (sobreLimite ? " y supera su límite de crédito." : "."),
                    "/fiados", d.deudaDesde()));
        }
    }

    private void pedidosDemorados(LocalDateTime ahora, List<NotificacionResponse> lista) {
        for (Compra c : compraRepository.findByEstadoAndFechaPedidoBeforeOrderByFechaPedidoAsc(
                EstadoCompra.PEDIDO, ahora.minusDays(DIAS_PEDIDO_DEMORADO))) {
            long dias = ChronoUnit.DAYS.between(c.getFechaPedido().toLocalDate(), ahora.toLocalDate());
            lista.add(nueva("PEDIDO:" + c.getId(), TipoNotificacion.PEDIDO_PENDIENTE, NivelNotificacion.INFO,
                    "Pedido sin llegar: " + c.getProveedor().getNombre(),
                    "El pedido #" + c.getId() + " se hizo hace " + dias + " días y aún no se recibe.",
                    "/proveedores", c.getFechaPedido()));
        }
    }

    // ============================ AYUDANTES ============================

    private NotificacionResponse nueva(String clave, TipoNotificacion tipo, NivelNotificacion nivel, String titulo,
                                       String mensaje, String enlace, LocalDateTime fecha) {
        return new NotificacionResponse(clave, tipo, nivel, titulo, mensaje, enlace, fecha, false);
    }

    private NotificacionResponse marcada(NotificacionResponse n) {
        return new NotificacionResponse(n.clave(), n.tipo(), n.nivel(), n.titulo(), n.mensaje(), n.enlace(),
                n.fecha(), true);
    }

    private String cantidad(BigDecimal valor) {
        return valor == null ? "-" : valor.stripTrailingZeros().toPlainString();
    }
}
