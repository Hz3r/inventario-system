package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.AbrirCajaRequest;
import com.hzer.inventario_system.dto.CajaResponse;
import com.hzer.inventario_system.dto.CerrarCajaRequest;
import com.hzer.inventario_system.entities.Caja;
import com.hzer.inventario_system.entities.EstadoCaja;
import com.hzer.inventario_system.entities.MetodoPagoCompra;
import com.hzer.inventario_system.entities.EstadoCompra;
import com.hzer.inventario_system.entities.EstadoVenta;
import com.hzer.inventario_system.entities.MetodoPago;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.AbonoRepository;
import com.hzer.inventario_system.repository.CajaRepository;
import com.hzer.inventario_system.repository.CompraRepository;
import com.hzer.inventario_system.repository.GastoRepository;
import com.hzer.inventario_system.repository.TotalPorMetodo;
import com.hzer.inventario_system.repository.VentaPagoRepository;
import com.hzer.inventario_system.repository.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CajaService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("dd/MM HH:mm");

    private final CajaRepository cajaRepository;
    private final VentaRepository ventaRepository;
    private final VentaPagoRepository ventaPagoRepository;
    private final AbonoRepository abonoRepository;
    private final GastoRepository gastoRepository;
    private final CompraRepository compraRepository;
    private final UsuarioActualService usuarioActual;

    /** La caja abierta ahora mismo, si hay una */
    public Optional<CajaResponse> actual() {
        return cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA).map(this::resumen);
    }

    /** Lo usa VentaService: no se puede vender sin caja abierta */
    public Caja cajaAbiertaObligatoria() {
        return cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA)
                .orElseThrow(() -> new ReglaNegocioException("No hay una caja abierta. Abre la caja antes de vender."));
    }

    /**
     * Valida que del cajón pueda salir ese monto (gastos o compras pagados "del cajón").
     * No puedes sacar S/ 144 si en el cajón solo debería haber S/ 57.
     */
    public void validarSalidaDeEfectivo(Caja caja, BigDecimal monto, String concepto) {
        BigDecimal disponible = resumen(caja).efectivoEsperado();
        if (monto.compareTo(disponible) > 0) {
            throw new ReglaNegocioException("En el cajón solo debería haber S/ " + disponible + " y " + concepto
                    + " es de S/ " + monto + ". Si lo pagaste con otra plata, desmarca \"Salió del cajón\".");
        }
    }

    public CajaResponse obtener(Long id) {
        return resumen(cajaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Caja", id)));
    }

    public List<CajaResponse> historial() {
        return cajaRepository.findTop30ByOrderByAbiertaEnDesc().stream().map(this::resumen).toList();
    }

    @Transactional
    public CajaResponse abrir(AbrirCajaRequest req) {
        cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA).ifPresent(c -> {
            throw new ReglaNegocioException("Ya hay una caja abierta desde el " + c.getAbiertaEn().format(HORA)
                    + ". Ciérrala antes de abrir otra.");
        });

        Caja caja = new Caja();
        caja.setUsuario(usuarioActual.obtener());
        caja.setMontoInicial(req.getMontoInicial());
        caja.setNota(limpiar(req.getNota()));
        return resumen(cajaRepository.save(caja));
    }

    @Transactional
    public CajaResponse cerrar(CerrarCajaRequest req) {
        Caja caja = cajaAbiertaObligatoria();

        // Se calcula el esperado ANTES de cerrar, con todas las ventas del turno
        BigDecimal esperado = resumen(caja).efectivoEsperado();

        caja.setMontoEsperado(esperado);
        caja.setMontoContado(req.getMontoContado());
        caja.setDiferencia(req.getMontoContado().subtract(esperado));
        caja.setCerradaEn(LocalDateTime.now(ZoneId.of("America/Lima")));
        caja.setEstado(EstadoCaja.CERRADA);
        if (limpiar(req.getNota()) != null) caja.setNota(limpiar(req.getNota()));
        return resumen(caja);
    }

    /** Arma el resumen: cuánto se vendió por cada método y cuánto efectivo debería haber */
    private CajaResponse resumen(Caja c) {
        Map<MetodoPago, BigDecimal> porMetodo = new EnumMap<>(MetodoPago.class);
        for (TotalPorMetodo t : ventaPagoRepository.totalesPorMetodo(c.getId(), EstadoVenta.COMPLETADA)) {
            porMetodo.put(t.getMetodo(), t.getTotal());
        }

        BigDecimal totalVendido = porMetodo.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal efectivo = porMetodo.getOrDefault(MetodoPago.EFECTIVO, BigDecimal.ZERO);

        // Abonos de fiados cobrados en efectivo: también están en el cajón
        BigDecimal abonosEfectivo = abonoRepository.sumaPorCajaYMetodo(c.getId(), MetodoPago.EFECTIVO);

        // Gastos pagados con plata del cajón (luz, delivery...): salieron de la caja
        BigDecimal gastosEfectivo = gastoRepository.sumaPorCajaYMetodo(c.getId(), MetodoPago.EFECTIVO);

        // Compras a proveedores pagadas con plata del cajón
        BigDecimal comprasEfectivo = compraRepository.sumaPorCaja(c.getId(), MetodoPagoCompra.EFECTIVO, EstadoCompra.RECIBIDO);

        BigDecimal esperado = (c.getEstado() == EstadoCaja.CERRADA && c.getMontoEsperado() != null)
                ? c.getMontoEsperado()                                     // cerrada: queda congelado
                : c.getMontoInicial().add(efectivo).add(abonosEfectivo)    // abierta: se calcula en vivo
                    .subtract(gastosEfectivo).subtract(comprasEfectivo);

        long cantidad = ventaRepository.countByCajaIdAndEstado(c.getId(), EstadoVenta.COMPLETADA);

        return new CajaResponse(c.getId(), c.getEstado(), c.getAbiertaEn(), c.getCerradaEn(),
                c.getMontoInicial(), cantidad, totalVendido, porMetodo, abonosEfectivo, gastosEfectivo, comprasEfectivo, esperado,
                c.getMontoContado(), c.getDiferencia(), c.getNota());
    }

    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}